
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

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

  createRoot(document.getElementById("root")!).render(<App />);

  // Remove the inline boot splash once React has committed its first paint.
  requestAnimationFrame(() => {
    const splash = document.getElementById('initial-splash');
    if (!splash) return;
    splash.style.transition = 'opacity 180ms ease-out';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 220);
  });
