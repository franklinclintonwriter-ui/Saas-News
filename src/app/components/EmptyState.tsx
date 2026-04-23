import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Icon element rendered in the header; optional. */
  icon?: ReactNode;
  /** Short headline, required. Keep to 5 words or fewer. */
  title: string;
  /** One-sentence explanation of why the list is empty. */
  description?: string;
  /** Optional primary action (e.g. "Create first post"). */
  action?: { label: string; onClick?: () => void; href?: string };
  /** Optional secondary action. */
  secondaryAction?: { label: string; onClick?: () => void; href?: string };
  className?: string;
};

/**
 * Consistent empty-state surface used by every admin list and every public
 * content grid. Accessible (role="status", aria-live polite) so screen
 * readers announce "no items" when filters update.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center',
        className || '',
      ].join(' ')}
    >
      {icon && (
        <div aria-hidden="true" className="mb-1 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-slate-600">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {action && <ActionButton {...action} primary />}
          {secondaryAction && <ActionButton {...secondaryAction} />}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  href,
  primary,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
}) {
  const classes = [
    'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    primary
      ? 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400',
  ].join(' ');
  if (href) {
    return (
      <a href={href} className={classes}>
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {label}
    </button>
  );
}
