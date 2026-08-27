import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: false,
  });

  const config = app.get(ConfigService);
  const appName = config.get<string>('app.name') || 'Power Zone API';
  const apiPrefix = config.get<string>('app.apiPrefix') || 'api';
  const port = config.get<number>('app.port') || 3000;
  const corsOrigins = config.get<string[]>('app.corsOrigins') || [];
  const env = config.get<string>('app.env') || 'development';

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(
      `API de gestión integral para gimnasios "Power Zone".\n\n` +
        `Rol | Descripción\n--- | ---\n` +
        `**admin** | Gestión completa del gimnasio\n` +
        `**trainer** | Rutinas, clases y progreso\n` +
        `**receptionist** | Membresías, pagos y asistencia\n` +
        `**client** | Perfil, membresías y reservas\n\n` +
        `Autenticación: Bearer token vía \`/auth/login\`. Usa el botón **Authorize** de Swagger.`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
  });

  await app.listen(port);

  logger.log(`API arrancada en http://localhost:${port}/${apiPrefix}`);
  logger.log(`Documentación (Swagger) en http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`Entorno: ${env}`);
}

void bootstrap();