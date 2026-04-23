/**
 * Backend observability: Sentry (optional) + structured logging.
 *
 * - Sentry loads lazily only when SENTRY_DSN is set; dep is optional.
 * - Structured logger (JSON lines) always runs.
 */
import { config } from './config.js';

// Using 'unknown' so this file typechecks even when @sentry/node isn't installed yet.
type SentryMod = any;

let sentryModule: SentryMod | null = null;
let initialized = false;

export function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

export async function initSentry(): Promise<SentryMod | null> {
  if (initialized) return sentryModule;
  initialized = true;
  if (!sentryEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sentryModule = await import('@sentry/node' as string).catch(() => null);
    if (!sentryModule?.init) return (sentryModule = null);
    sentryModule.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || config.nodeEnv,
      release: process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      sendDefaultPii: false,
      beforeSend(event: any) {
        if (event.request?.cookies) event.request.cookies = undefined;
        if (event.user?.ip_address) event.user.ip_address = '{{redacted}}';
        return event;
      },
    });
    return sentryModule;
  } catch (err) {
    log.warn('sentry.load_failed', { error: String(err) });
    sentryModule = null;
    return null;
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (sentryModule?.captureException) {
    sentryModule.captureException(err, context ? { extra: context } : undefined);
  }
  log.error('exception', { error: describeError(err), context });
}

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields?: LogFields): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    env: config.nodeEnv,
    ...fields,
  };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  try {
    out(JSON.stringify(line));
  } catch {
    out(`[${level}] ${event}`);
  }
}

export const log = {
  debug: (event: string, fields?: LogFields) => emit('debug', event, fields),
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
};

function describeError(err: unknown): LogFields {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}
