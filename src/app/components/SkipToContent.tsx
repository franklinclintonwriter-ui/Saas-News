/**
 * Skip-to-content link. Visible only when focused. Jumps to <main id="main">.
 *
 * Drop this as the first element inside <body> on every layout. Required for
 * keyboard users (WCAG 2.1 SC 2.4.1 Bypass Blocks).
 */
export function SkipToContent({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
    >
      Skip to content
    </a>
  );
}
