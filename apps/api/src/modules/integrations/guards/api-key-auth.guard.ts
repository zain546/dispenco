import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract API key from x-api-key header or Authorization: Bearer dsp_live_...
    let rawKey: string | undefined = request.headers['x-api-key'];

    if (!rawKey && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'ApiKey')) {
        rawKey = parts[1];
      }
    }

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException(
        'Missing API key. Provide via "x-api-key" header or "Authorization: Bearer <key>"'
      );
    }

    const trimmedKey = rawKey.trim();

    if (!trimmedKey.startsWith('dsp_live_') || trimmedKey.length < 24) {
      throw new UnauthorizedException(
        'Malformed API key. Dispenco API keys must start with "dsp_live_"'
      );
    }

    // 2. Extract prefix to search candidate keys fast
    // Key format: dsp_live_<prefix_chars>...
    const prefix = trimmedKey.slice(0, 16);

    const candidateKeys = await this.prisma.apiKey.findMany({
      where: {
        keyPrefix: {
          startsWith: prefix,
        },
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!candidateKeys || candidateKeys.length === 0) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // 3. Compute SHA-256 hash of provided key and verify constant-time
    const computedHash = crypto
      .createHash('sha256')
      .update(trimmedKey)
      .digest('hex');

    const matchedKey = candidateKeys.find((keyRecord) => {
      try {
        const a = Buffer.from(keyRecord.keyHash, 'utf8');
        const b = Buffer.from(computedHash, 'utf8');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      } catch {
        return false;
      }
    });

    if (!matchedKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // 4. Verify expiration
    if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
      throw new UnauthorizedException(
        `API key has expired on ${matchedKey.expiresAt.toISOString()}`
      );
    }

    // 5. Update lastUsedAt asynchronously
    this.prisma.apiKey
      .update({
        where: { id: matchedKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Fire and forget; never fail request on lastUsedAt update error
      });

    // 6. Attach to request context
    request.apiKey = {
      id: matchedKey.id,
      name: matchedKey.name,
      tenantId: matchedKey.tenantId,
      permissions: matchedKey.permissions,
      rateLimit: matchedKey.rateLimit,
    };
    request.tenantId = matchedKey.tenantId;

    return true;
  }
}
