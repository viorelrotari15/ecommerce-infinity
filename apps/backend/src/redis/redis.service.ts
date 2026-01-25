import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Don't block application startup - connect in background
    this.connectRedis().catch((error) => {
      this.logger.warn(
        'Failed to initialize Redis connection. Caching will be disabled. Application will continue without Redis.',
        error instanceof Error ? error.message : error,
      );
    });
  }

  private async connectRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              this.logger.warn(
                `Redis connection failed after ${this.maxReconnectAttempts} attempts. Caching will be disabled.`,
              );
              this.client = null;
              this.isConnected = false;
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err.message);
        this.isConnected = false;
        this.reconnectAttempts++;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis Client Connecting...');
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis Client Ready');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.logger.log(
            `Redis Client Reconnecting... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
          );
        }
      });

      // Set a timeout to stop trying after max attempts
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isConnected && this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.logger.warn(
            'Redis connection timeout. Caching will be disabled. Application will continue without Redis.',
          );
          if (this.client) {
            this.client.quit().catch(() => {
              // Ignore errors when quitting
            });
          }
          this.client = null;
        }
      }, 10000); // 10 seconds timeout

      // Try to connect with timeout, but don't block
      try {
        await Promise.race([
          this.client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000)),
        ]);

        this.logger.log('Redis Client Connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
      } catch (connectError) {
        // Connection failed, but don't throw - just log and continue
        this.logger.warn('Redis initial connection failed. Will retry in background.');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        // Let the reconnect strategy handle retries
      }
    } catch (error) {
      this.logger.warn(
        'Failed to setup Redis client. Caching will be disabled. Application will continue without Redis.',
        error instanceof Error ? error.message : error,
      );
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.log('Redis Client Disconnected');
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client!.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client!.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.client!.del(keys);
      return keys.length;
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern} from Redis:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key} in Redis:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.expire(key, seconds);
      return true;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key} in Redis:`, error);
      return false;
    }
  }
}
