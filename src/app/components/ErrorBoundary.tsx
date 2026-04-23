import { Component, type ReactNode } from 'react';
import { captureException } from '../lib/observability/sentry';

type Props = {
  children: ReactNode;
  /** Optional label reported to Sentry as `extra.boundary`. */
  boundary?: string;
  /** Optional custom fallback. Receives the error and a retry callback. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Route-level error boundary.
 *
 * Wrap route subtrees so a single component explosion doesn't take the
 * whole app down. Integrates with Sentry when enabled.
 *
 * Usage:
 *   <ErrorBoundary boundary="public-layout">
 *     <PublicLayout />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    void captureException(error, {
      boundary: this.props.boundary ?? 'default',
      componentStack: info.componentStack,
    });
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;

    if (fallback) return fallback(error, this.retry);

    return <DefaultFallback error={error} retry={this.retry} />;
  }
}

function DefaultFallback({ error, retry }: { error: Error; retry: () => void }) {
  const supportUrl =
    typeof window !== 'undefined'
      ? `mailto:support@${window.location.hostname.replace(/^www\./, '')}?subject=App%20error&body=${encodeURIComponent(error.message)}`
      : '#';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-600">
        We've logged the problem and will take a look. You can try again, or
        reload the page if it keeps happening.
      </p>
      {import.meta.env.DEV && (
        <pre className="mt-2 max-w-2xl overflow-auto rounded bg-slate-100 p-3 text-left text-xs text-slate-800">
          {error.stack || error.message}
        </pre>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Reload
        </button>
        <a
          href={supportUrl}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Report issue
        </a>
      </div>
    </div>
  );
}
