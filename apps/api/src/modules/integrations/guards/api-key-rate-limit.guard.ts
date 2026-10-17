import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthenticatedApiKey } from '../decorators/current-api-key.decorator';

interface MemoryRateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  private redis: Redis | null = null;
  private memoryBuckets = new Map<string, MemoryRateLimitBucket>();

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // don't spam if local redis is off
        });
        this.redis.connect().catch(() => {
          this.redis = null;
        });
      } catch {
        this.redis = null;
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey: AuthenticatedApiKey | undefined = request.apiKey;

    // If endpoint is public without an API key (e.g. docs), allow
    if (!apiKey) {
      return true;
    }

    const keyId = apiKey.id;
    const limit = apiKey.rateLimit || 60; // Max requests per minute
    const windowMs = 60 * 1000;
    const now = Date.now();

    let currentCount = 1;
    let resetInSeconds = 60;

    if (this.redis && this.redis.status === 'ready') {
      try {
        const redisKey = `ratelimit:apikey:${keyId}:${Math.floor(now / windowMs)}`;
        currentCount = await this.redis.incr(redisKey);
        if (currentCount === 1) {
          await this.redis.expire(redisKey, 65);
        }
        const ttl = await this.redis.ttl(redisKey);
        resetInSeconds = ttl > 0 ? ttl : 60;
      } catch {
        currentCount = this.checkMemoryRateLimit(keyId, limit, windowMs, now);
        resetInSeconds = Math.ceil(
          ((this.memoryBuckets.get(keyId)?.resetAt || now + windowMs) - now) / 1000
        );
      }
    } else {
      currentCount = this.checkMemoryRateLimit(keyId, limit, windowMs, now);
      resetInSeconds = Math.ceil(
        ((this.memoryBuckets.get(keyId)?.resetAt || now + windowMs) - now) / 1000
      );
    }

    const remaining = Math.max(0, limit - currentCount);

    // Set standard rate-limiting headers
    response.setHeader('X-RateLimit-Limit', limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', resetInSeconds.toString());

    if (currentCount > limit) {
      response.setHeader('Retry-After', resetInSeconds.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too Many Requests: Rate limit of ${limit} requests/minute exceeded. Please retry in ${resetInSeconds}s.`,
          retryAfter: resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private checkMemoryRateLimit(
    keyId: string,
    limit: number,
    windowMs: number,
    now: number
  ): number {
    const bucket = this.memoryBuckets.get(keyId);
    if (!bucket || bucket.resetAt <= now) {
      this.memoryBuckets.set(keyId, {
        count: 1,
        resetAt: now + windowMs,
      });
      return 1;
    }

    bucket.count += 1;
    return bucket.count;
  }
}
