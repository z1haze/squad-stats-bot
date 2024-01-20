import * as Sentry from '@sentry/node';
import env from './env';

export const initSentry = () => {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });

  process.on('unhandledRejection', e => {
    Sentry.captureException(e);
  });

  process.on('uncaughtException', function (e) {
    Sentry.captureException(e);
  });
};
