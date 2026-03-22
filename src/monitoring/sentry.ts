// Required env: VITE_SENTRY_DSN — set in Vercel / .env for error monitoring
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_DEV = import.meta.env.MODE === "development";

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("Sentry DSN not configured — error monitoring disabled.");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || "local",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: IS_DEV ? 1.0 : 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        deployment_version: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || "local",
      };
      return event;
    },
  });
}

/** Set user context for all future Sentry events */
export function setSentryUser(userId: string | null, email?: string) {
  if (userId) {
    Sentry.setUser({ id: userId, email });
  } else {
    Sentry.setUser(null);
  }
}

/** Capture an error with chanting context */
export function captureAudioError(
  error: unknown,
  context: {
    dashakam?: number;
    verse?: number;
    audio_file?: string;
    audio_url?: string;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("module", "audio_player");
    scope.setContext("chanting", context);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/** Capture a generic app error with context */
export function captureAppError(error: unknown, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setContext("app", context);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/** Track a performance span for async operations */
export async function trackSpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number>
): Promise<T> {
  if (!SENTRY_DSN) return fn();
  return Sentry.startSpan({ name, op, attributes }, () => fn());
}
