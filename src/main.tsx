
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
  import { initSentry } from "./app/lib/observability/sentry.ts";
  import { loadPlausible } from "./app/lib/observability/plausible.ts";
  import "./styles/index.css";

  // Determine the current surface and expose it globally so Plausible and other
  // surface-gated utilities can read it without importing Vite env vars directly.
  const configuredSurface = ((import.meta.env.VITE_APP_SURFACE as string | undefined) || 'all').toLowerCase();
  if (configuredSurface === 'admin') {
    window.__SURFACE__ = 'admin';
  } else if (configuredSurface === 'public') {
    window.__SURFACE__ = 'public';
  }

  // Boot observability as early as possible so errors during React init are captured.
  initSentry();

  // Load Plausible only on the public surface (guard is also inside loadPlausible).
  if (window.__SURFACE__ !== 'admin') {
    loadPlausible();
  }

  // Auto-recover from stale lazy-chunk loads after a new deploy.
  // When Cloudflare serves a fresh index.html that references new
  // fingerprinted chunks, long-open tabs try to import() old hashes
  // that no longer exist (404) or get the HTML shell (MIME error).
  // In that case force a single reload to pick up the new bundle.
  const CHUNK_RELOAD_KEY = 'phulpur24_chunk_reload_ts';
  const isChunkLoadError = (err: unknown): boolean => {
    const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
    return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(msg);
  };
  const maybeReload = (err: unknown) => {
    if (!isChunkLoadError(err)) return;
    try {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
      if (Date.now() - last < 10_000) return; // avoid loops
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };
  window.addEventListener('error', (e) => maybeReload(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => maybeReload(e.reason));

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary boundary="root">
      <App />
    </ErrorBoundary>
  );

  // Remove the inline boot splash once React has committed its first paint.
  requestAnimationFrame(() => {
    const splash = document.getElementById('initial-splash');
    if (!splash) return;
    splash.style.transition = 'opacity 180ms ease-out';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 220);
  });
