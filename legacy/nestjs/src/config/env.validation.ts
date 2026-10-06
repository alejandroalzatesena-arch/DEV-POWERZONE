import { plainToInstance } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string;

  @IsString()
  @IsOptional()
  PORT: string;

  @IsString()
  @IsOptional()
  API_PREFIX: string;

  @IsString()
  @IsOptional()
  DB_HOST: string;

  @IsString()
  @IsOptional()
  DB_PORT: string;

  @IsString()
  @IsOptional()
  DB_USER: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD: string;

  @IsString()
  @IsOptional()
  DB_NAME: string;

  @IsString()
  @IsOptional()
  @IsIn(['true', 'false'])
  DB_SYNCHRONIZE: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsString()
  @IsOptional()
  REDIS_PORT: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, { message: 'JWT_ACCESS_EXPIRES_IN debe ser como 15m, 1h, 7d' })
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, { message: 'JWT_REFRESH_EXPIRES_IN debe ser como 15m, 1h, 7d' })
  JWT_REFRESH_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  @IsOptional()
  AI_SERVICE_URL: string;

  @IsString()
  @IsOptional()
  AI_SERVICE_API_KEY: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints || {}).join('; ')).join('\n');
    throw new Error(`Error de validación de variables de entorno:\n${details}`);
  }

  if (validated.NODE_ENV === 'production') {
    if (
      validated.JWT_ACCESS_SECRET === 'cambia-este-secreto-access' ||
      validated.JWT_REFRESH_SECRET === 'cambia-este-secreto-refresh'
    ) {
      throw new Error(
        'Error de validación de variables de entorno:\nCambia JWT_ACCESS_SECRET y JWT_REFRESH_SECRET antes de ejecutar en producción.',
      );
    }
    if (validated.DB_SYNCHRONIZE !== 'false') {
      throw new Error(
        'Error de validación de variables de entorno:\nDB_SYNCHRONIZE debe estar en false en producción; usa migraciones para el esquema.',
      );
    }
    if (!validated.CORS_ORIGINS) {
      throw new Error(
        'Error de validación de variables de entorno:\nCORS_ORIGINS es obligatorio en producción.',
      );
    }
    if (!validated.AI_SERVICE_API_KEY) {
      throw new Error(
        'Error de validación de variables de entorno:\nAI_SERVICE_API_KEY es obligatoria en producción.',
      );
    }
  }

  return validated;
}

export const envHelper = {
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  isDevelopment(): boolean {
    return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  },
};
