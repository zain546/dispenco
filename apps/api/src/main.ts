import './instrument';
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

  // Trust upstream reverse proxy hops safely so req.ip reflects the actual client address
  const expressApp = app.getHttpAdapter().getInstance();
  const trustProxy = configService.get<string | number>('TRUST_PROXY', 1);
  expressApp.set('trust proxy', trustProxy);
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
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Dispenco API application listening on port ${port}`);
}

bootstrap();
