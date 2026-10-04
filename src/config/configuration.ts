import { registerAs, ConfigFactory } from '@nestjs/config';
import { parseCorsOrigins } from '../common/config/cors';

export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  name: string;
  corsOrigins: string[];
  bcryptRounds: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface PaymentConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  currency: string;
}

export interface AiConfig {
  url: string;
  apiKey: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export const appConfig = registerAs('app', (): AppConfig => {
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
    throw new Error('CORS_ORIGINS es obligatorio en producción');
  }
  return {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    name: process.env.APP_NAME || 'Power Zone API',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  };
});

export const databaseConfig = registerAs('database', (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'powerzone',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));

export const redisConfig = registerAs('redis', (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const jwtConfig = registerAs('jwt', (): JwtConfig => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'powerzone-access-secret-dev';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'powerzone-refresh-secret-dev';
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET son obligatorios en producción');
    }
  }
  return {
    accessSecret,
    refreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});

export const paymentsConfig = registerAs('payments', (): PaymentConfig => ({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  currency: process.env.STRIPE_CURRENCY || 'usd',
}));

export const aiConfig = registerAs('ai', (): AiConfig => {
  if (process.env.NODE_ENV === 'production' && !process.env.AI_SERVICE_API_KEY) {
    throw new Error('AI_SERVICE_API_KEY es obligatoria en producción');
  }
  return {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY || 'internal-ai-key',
  };
});

export const throttleConfig = registerAs('throttle', (): ThrottleConfig => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));

export const configuration: ConfigFactory[] = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  paymentsConfig,
  aiConfig,
  throttleConfig,
];

export default configuration;
