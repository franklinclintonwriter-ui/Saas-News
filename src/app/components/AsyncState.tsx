import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type AsyncStateProps = {
  state: LoadState;
  /** What to render when state === 'ready'. */
  children: ReactNode;
  /** Skeleton / loader shown during 'loading' and 'idle'. */
  loading?: ReactNode;
  /** Empty-state config shown when state === 'empty'. */
  empty?: {
    title: string;
    description?: string;
    action?: { label: string; onClick?: () => void; href?: string };
  };
  /** Error details shown when state === 'error'. */
  error?: {
    message?: string;
    retry?: () => void;
  };
};

/**
 * One consistent component that turns a (state, data) pair into the right
 * UI for every data-driven page. Eliminates the "list that silently fails"
 * and "spinner that never resolves" bug classes.
 */
export function AsyncState({ state, children, loading, empty, error }: AsyncStateProps) {
  if (state === 'loading' || state === 'idle') {
    return <>{loading ?? <DefaultLoading />}</>;
  }
  if (state === 'error') {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center"
      >
        <p className="text-sm font-medium text-red-900">
          {error?.message || 'Something went wrong while loading this page.'}
        </p>
        {error?.retry && (
          <button
            type="button"
            onClick={error.retry}
            className="mt-3 inline-flex rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Try again
          </button>
        )}
      </div>
    );
  }
  if (state === 'empty') {
    return (
      <EmptyState
        title={empty?.title || 'Nothing here yet'}
        description={empty?.description}
        action={empty?.action}
      />
    );
  }
  return <>{children}</>;
}

function DefaultLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <span className="sr-only">Loading</span>
      <span
        aria-hidden="true"
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      />
    </div>
  );
}
