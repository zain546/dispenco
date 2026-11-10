import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { sessionProfile, sessionUserInclude } from '../session-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.tokenUse !== 'access' || !payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid access token');
    }

    const cacheKey = `auth:session:${payload.sub}:v${payload.tokenVersion}`;
    const cachedUser = this.cache ? await this.cache.get<AuthenticatedUser>(cacheKey) : null;
    if (cachedUser) {
      if (cachedUser.tenantId !== payload.tenantId) {
        throw new UnauthorizedException('Token has been invalidated');
      }
      return cachedUser;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: sessionUserInclude,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or invalid');
    }

    if (user.tokenVersion !== payload.tokenVersion || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    const authUser: AuthenticatedUser = {
      ...sessionProfile(user),
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    };

    // Cache session for 5 minutes (invalidated immediately if tokenVersion changes)
    if (this.cache) {
      await this.cache.set(cacheKey, authUser, 300);
    }
    return authUser;
  }
}
