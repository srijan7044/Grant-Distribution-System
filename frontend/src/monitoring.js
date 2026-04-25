import * as Sentry from "@sentry/react";

let initialized = false;

export function initMonitoring() {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    tracesSampleRate: 0.2,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });

  initialized = true;
}

export function reportError(error, context = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });
}
