import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RedisCacheService } from '../../cache/redis-cache.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private memoryBuckets = new Map<string, { count: number; resetAt: number }>();
  private readonly maxRequestsPerMinute = 15;
  private readonly windowMs = 60 * 1000;

  constructor(@Optional() private readonly cache?: RedisCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Use Express-resolved req.ip (governed by Express 'trust proxy' setting) rather than trusting client-supplied headers
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';

    const path = req.path || req.url || '';
    const action = path.includes('signup') ? 'signup' : 'login';
    const key = `ratelimit:auth:${action}:${ip}`;
    const now = Date.now();

    let count = 1;
    let resetSeconds = 60;

    const redis = this.cache?.getClient();
    if (redis) {
      try {
        const windowKey = `${key}:${Math.floor(now / this.windowMs)}`;
        const pipeline = redis.pipeline();
        pipeline.incr(windowKey);
        pipeline.expire(windowKey, 65);
        pipeline.ttl(windowKey);
        const results = await pipeline.exec();
        if (results && results[0] && !results[0][0]) {
          count = Number(results[0][1]);
          const ttl = Number(results[2]?.[1]);
          resetSeconds = ttl > 0 ? ttl : 60;
        }
      } catch {
        count = this.checkMemoryFallback(key, now);
      }
    } else {
      count = this.checkMemoryFallback(key, now);
    }

    const remaining = Math.max(0, this.maxRequestsPerMinute - count);
    res.setHeader('X-RateLimit-Limit', this.maxRequestsPerMinute.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (count > this.maxRequestsPerMinute) {
      res.setHeader('Retry-After', resetSeconds.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many authentication attempts. Please try again in one minute.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private checkMemoryFallback(key: string, now: number): number {
    const existing = this.memoryBuckets.get(key);
    if (!existing || now > existing.resetAt) {
      this.memoryBuckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }
}

