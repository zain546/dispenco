import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isUploadOrOcr =
      req.url?.includes('ocr') ||
      req.url?.includes('import') ||
      req.url?.includes('upload');
    const limit = isUploadOrOcr ? '25mb' : '2mb';
    json({
      limit,
      verify: (r, _res, body) => {
        (r as typeof r & { rawBody: Buffer }).rawBody = Buffer.from(body);
      },
    })(req, res, next);
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isUploadOrOcr =
      req.url?.includes('ocr') ||
      req.url?.includes('import') ||
      req.url?.includes('upload');
    const limit = isUploadOrOcr ? '25mb' : '2mb';
    urlencoded({ extended: true, limit })(req, res, next);
  });

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

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Dispenco API is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
// Customer & Khata ledger ready - Search Module enabled
