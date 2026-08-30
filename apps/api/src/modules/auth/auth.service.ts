import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { ALL_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@dispenco/types';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtPayload, AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto, res: Response) {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findFirst({ where: { email } });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Ensure all system permissions exist in database
    await this.ensurePermissionsExist();

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    const tenantName = dto.storeName || `${dto.name}'s Workspace`;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName },
      });

      let store = null;
      if (dto.storeName) {
        store = await tx.store.create({
          data: {
            tenantId: tenant.id,
            name: dto.storeName,
          },
        });
      }

      // 1. Create Owner Role (All Permissions)
      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner',
          isDefault: true,
        },
      });

      const allPermissionRecords = await tx.permission.findMany({
        where: { name: { in: ALL_PERMISSIONS } },
      });

      await tx.rolePermission.createMany({
        data: allPermissionRecords.map((perm) => ({
          roleId: ownerRole.id,
          permissionId: perm.id,
        })),
      });

      // 2. Create Staff Role (Limited Default Operational Permissions)
      const staffRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Staff',
          isDefault: false,
        },
      });

      const staffPermissionRecords = await tx.permission.findMany({
        where: { name: { in: DEFAULT_STAFF_PERMISSIONS } },
      });

      await tx.rolePermission.createMany({
        data: staffPermissionRecords.map((perm) => ({
          roleId: staffRole.id,
          permissionId: perm.id,
        })),
      });

      // 3. Create Owner User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          name: dto.name,
          tokenVersion: 1,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      return { tenant, store, user, ownerRole };
    });

    const userPermissions = ALL_PERMISSIONS;

    const payload: JwtPayload = {
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      tokenVersion: result.user.tokenVersion,
      role: 'Owner',
      permissions: userPermissions,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);
    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      success: true,
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        tenantId: result.tenant.id,
        storeName: result.store?.name || null,
        role: 'Owner',
        permissions: userPermissions,
      },
    };
  }

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        tenant: {
          include: { stores: { take: 1 } },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const primaryRole = user.userRoles[0]?.role;
    const roleName = primaryRole?.name || 'User';
    const storeName = user.tenant.stores[0]?.name || null;

    const userPermissions = primaryRole?.rolePermissions.map(
      (rp) => rp.permission.name
    ) || [];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
      role: roleName,
      permissions: userPermissions,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);
    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        storeName,
        role: roleName,
        permissions: userPermissions,
      },
    };
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'dispenco_secret_key_change_in_prod';
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, { secret });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account invalid or inactive');
      }

      if (user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const primaryRole = user.userRoles[0]?.role;
      const roleName = primaryRole?.name || payload.role;
      const userPermissions = primaryRole?.rolePermissions.map(
        (rp) => rp.permission.name
      ) || payload.permissions || [];

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        tokenVersion: user.tokenVersion,
        role: roleName,
        permissions: userPermissions,
      };

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(newPayload);
      this.setAuthCookies(res, accessToken, newRefreshToken);

      return {
        success: true,
        accessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(user: AuthenticatedUser, res: Response) {
    if (user?.userId) {
      await this.prisma.user.update({
        where: { id: user.userId },
        data: {
          tokenVersion: { increment: 1 },
          refreshTokenHash: null,
        },
      });
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('dispenco_access_token', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  private async ensurePermissionsExist() {
    for (const permName of ALL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: { name: permName },
      });
    }
  }

  /**
   * Generate short-lived Access Token (1 day) and long-lived Refresh Token (30 days / 1 month)
   */
  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }

  /**
   * Set HTTP cookies: Access token expires in 1 day; Refresh token expires in 30 days
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    // 1-Day Access Token Cookie
    res.cookie('dispenco_access_token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 3600 * 1000, // 1 day
    });

    // 30-Day (1 Month) Refresh Token HTTP-Only Cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000, // 30 days (1 month)
    });
  }
}
