import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('redis.host');
    const port = this.configService.get<number>('redis.port');
    const password = this.configService.get<string>('redis.password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis sin conexión: ${err.message}`);
    });

    try {
      await this.client.connect();
      this.logger.log('Conexión a Redis establecida');
    } catch (error) {
      this.logger.warn('No se pudo conectar a Redis al inicio, se reintentará. ' + (error as Error).message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      return;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.del(key);
    } catch {
      return;
    }
  }

  async incr(key: string, ttlSeconds = 60): Promise<number> {
    try {
      if (!this.client) return 0;
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return value;
    } catch {
      return 0;
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.publish(channel, message);
    } catch {
      return;
    }
  }
}