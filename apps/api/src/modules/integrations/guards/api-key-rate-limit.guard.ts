import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisCacheService } from '../../cache/redis-cache.service';
import { AuthenticatedApiKey } from '../decorators/current-api-key.decorator';

interface MemoryRateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  private memoryBuckets = new Map<string, MemoryRateLimitBucket>();

  constructor(private readonly cache: RedisCacheService) {}

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

    const redis = this.cache.getClient();
    if (redis) {
      try {
        const redisKey = `ratelimit:apikey:${keyId}:${Math.floor(now / windowMs)}`;
        const pipeline = redis.pipeline();
        pipeline.incr(redisKey);
        pipeline.expire(redisKey, 65);
        pipeline.ttl(redisKey);
        const results = await pipeline.exec();
        if (results && results[0] && !results[0][0]) {
          currentCount = Number(results[0][1]);
          const ttl = Number(results[2]?.[1]);
          resetInSeconds = ttl > 0 ? ttl : 60;
        }
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
    // Prune expired buckets if memory map exceeds threshold
    if (this.memoryBuckets.size > 500) {
      for (const [k, b] of this.memoryBuckets.entries()) {
        if (b.resetAt <= now) {
          this.memoryBuckets.delete(k);
        }
      }
    }

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
