import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const clientUrlRaw = configService.get<string>(
    'CLIENT_URL',
    configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
  );
  const allowedOrigins = clientUrlRaw
    ? clientUrlRaw.split(',').map((u) => u.trim())
    : ['http://localhost:3000'];

  app.use(cookieParser());
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`🚀 Dispenco API is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
// Customer & Khata ledger ready - Search Module enabled
