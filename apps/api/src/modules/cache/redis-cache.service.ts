import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClient | null = null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: (times: number) => Math.min(times * 1000, 10000),
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(' Connected to Redis cache service');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis cache connection warning: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: unknown) {
      this.logger.warn(`Failed to initialize Redis client: ${(err as Error)?.message}`);
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis cache client disconnected gracefully');
      } catch {
        // Ignored during shutdown
      }
    }
  }

  /**
   * Raw Redis client accessor for custom commands (e.g. atomic rate-limiting Lua scripts)
   */
  getClient(): RedisClient | null {
    return this.isConnected ? this.client : null;
  }

  /**
   * Read item from cache. Returns null if key doesn't exist or on Redis error.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: unknown) {
      this.logger.debug(`Cache read error for key "${key}": ${(err as Error)?.message}`);
      return null;
    }
  }

  /**
   * Set item in cache with optional TTL in seconds.
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: unknown) {
      this.logger.debug(`Cache write error for key "${key}": ${(err as Error)?.message}`);
    }
  }

  /**
   * Delete a single cache key.
   */
  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (err: unknown) {
      this.logger.debug(`Cache delete error for key "${key}": ${(err as Error)?.message}`);
    }
  }

  /**
   * Delete all keys matching a glob pattern using SCAN without blocking the Redis event loop.
   */
  async delByPattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;
    let deletedCount = 0;
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const keysToDelete: string[] = [];
      for await (const resultKeys of stream) {
        if (Array.isArray(resultKeys) && resultKeys.length > 0) {
          keysToDelete.push(...resultKeys);
        }
      }

      if (keysToDelete.length > 0) {
        // UNLINK is non-blocking asynchronous memory reclaim in Redis >= 4.0
        deletedCount = await this.client.unlink(...keysToDelete);
      }
    } catch (err: unknown) {
      this.logger.debug(`Cache pattern delete error for pattern "${pattern}": ${(err as Error)?.message}`);
    }
    return deletedCount;
  }

  /**
   * Cache-aside wrapper: returns cached item or runs factory function and caches result.
   */
  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await factory();
    if (fresh !== null && fresh !== undefined) {
      // Background cache population to keep path responsive
      this.set(key, fresh, ttlSeconds).catch(() => {});
    }
    return fresh;
  }

  /**
   * Helper: Invalidate inventory queries for a tenant and specific store (or all stores).
   */
  async invalidateStoreInventory(tenantId: string, storeId?: string): Promise<void> {
    const patterns = [`inv:${tenantId}:store:all:*`];
    if (storeId) {
      patterns.push(`inv:${tenantId}:store:${storeId}:*`);
    } else {
      patterns.push(`inv:${tenantId}:store:*`);
    }

    await Promise.all(patterns.map((p) => this.delByPattern(p)));
  }

  /**
   * Helper: Invalidate configuration caches (stores, roles, tax rates, subscription).
   */
  async invalidateTenantConfig(
    tenantId: string,
    domain: 'stores' | 'roles' | 'tax-rates' | 'subscription',
  ): Promise<void> {
    await this.delByPattern(`cfg:${tenantId}:${domain}:*`);
  }
}

