import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://28e64fb9051364ec1020a50451d78704@o4512485011619840.ingest.de.sentry.io/4512485042159696',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
});
