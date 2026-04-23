/**
 * Plausible analytics — PUBLIC SURFACE ONLY.
 *
 * Strict rules:
 *   - Only loads when VITE_PLAUSIBLE_DOMAIN is set.
 *   - Only loads on the public surface (window.__SURFACE__ === 'public').
 *     Admin is NOT tracked. This is enforced in two places: here (guard
 *     before injecting the script) and in the admin layout (never calls
 *     loadPlausible()).
 *   - Respects Do Not Track + Global Privacy Control.
 */

type PlausibleFn = ((event: string, options?: { props?: Record<string, string | number | boolean> }) => void) & {
  q?: unknown[];
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
    __SURFACE__?: 'public' | 'admin';
  }
}

let loaded = false;

function respectsDoNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false;
  // @ts-expect-error: non-standard globalPrivacyControl
  return navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
}

export function loadPlausible(): void {
  if (loaded || typeof window === 'undefined' || typeof document === 'undefined') return;
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain) return;
  if (window.__SURFACE__ === 'admin') return;
  if (respectsDoNotTrack()) return;

  const src = (import.meta.env.VITE_PLAUSIBLE_SCRIPT as string) || 'https://plausible.io/js/script.js';

  // Tiny shim so calls before the script loads are queued.
  window.plausible = window.plausible || function plausible(...args: unknown[]) {
    (window.plausible!.q = window.plausible!.q || []).push(args);
  } as PlausibleFn;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.src = src;
  document.head.appendChild(script);
  loaded = true;
}

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  if (window.__SURFACE__ === 'admin') return;
  window.plausible?.(name, props ? { props } : undefined);
}
