/**
 * Frontend Sentry bootstrap.
 *
 * Loaded lazily from `src/main.tsx` so that when VITE_SENTRY_DSN is unset
 * (local dev / preview) Sentry never runs and adds no bundle weight on the
 * happy path. When the DSN is set, we initialize with tracing + replays
 * tuned for a news-site traffic profile.
 */
import type { BrowserOptions } from '@sentry/react';

type SentryModule = typeof import('@sentry/react');

let sentryPromise: Promise<SentryModule | null> | null = null;

export function sentryEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SENTRY_DSN);
}

async function loadSentry(): Promise<SentryModule | null> {
  if (!sentryEnabled()) return null;
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react').then((mod) => {
      const dsn = import.meta.env.VITE_SENTRY_DSN as string;
      const env = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) ||
        (import.meta.env.MODE as string) ||
        'production';
      const release = (import.meta.env.VITE_APP_VERSION as string) || undefined;

      const options: BrowserOptions = {
        dsn,
        environment: env,
        release,
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE ?? 0.0),
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: false,
        integrations: [
          mod.browserTracingIntegration(),
          mod.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        beforeSend(event) {
          // Strip PII from error events just in case.
          if (event.request?.cookies) event.request.cookies = undefined;
          if (event.user?.ip_address) event.user.ip_address = '{{redacted}}';
          return event;
        },
      };
      mod.init(options);
      return mod;
    }).catch((err) => {
      // Never let Sentry bootstrap failures break the app.
      console.warn('[sentry] failed to load', err);
      return null;
    });
  }
  return sentryPromise;
}

export function initSentry(): void {
  // Fire-and-forget. App continues if Sentry can't load.
  void loadSentry();
}

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  const s = await loadSentry();
  if (!s) {
    console.error('[captureException]', err, context);
    return;
  }
  s.captureException(err, context ? { extra: context } : undefined);
}

export async function setUserContext(user: { id?: string; email?: string; role?: string } | null): Promise<void> {
  const s = await loadSentry();
  if (!s) return;
  if (!user) {
    s.setUser(null);
    return;
  }
  s.setUser({
    id: user.id,
    // Email is PII — only include if explicitly enabled via env.
    email: import.meta.env.VITE_SENTRY_SEND_USER_EMAIL === 'true' ? user.email : undefined,
    segment: user.role,
  });
}
