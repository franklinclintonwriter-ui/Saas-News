/**
 * Social share + media URL helpers.
 *
 * All URLs returned by these helpers are PUBLIC absolute URLs suitable for
 * pasting into Facebook / LinkedIn / Twitter post debuggers or <meta og:url>
 * tags. They MUST point at the frontend surface (www.phulpur.org), not at
 * an API endpoint.
 */

function trimTrail(value: string): string {
  return value.replace(/\/+$/, '');
}

export function absoluteUrl(raw: string): string {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window === 'undefined') return raw;
  return new URL(raw, window.location.origin).toString();
}

/**
 * Resolve the public site origin.
 * Priority:  VITE_PUBLIC_SITE_URL  >  window.location.origin (when on the
 * public surface)  >  empty string.
 */
export function publicSiteOrigin(): string {
  const envUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (envUrl) return trimTrail(envUrl);
  if (typeof window !== 'undefined') {
    // If we're on the admin subdomain, swap to the main site.
    const host = window.location.hostname;
    if (host.startsWith('admin.')) {
      return trimTrail(`${window.location.protocol}//${host.replace(/^admin\./, 'www.')}`);
    }
    return trimTrail(window.location.origin);
  }
  return '';
}

/**
 * Canonical public article URL.
 *   production:  https://www.phulpur.org/article/<slug>
 *   dev:         http://127.0.0.1:5174/article/<slug>
 */
export function shareArticleMetaUrl(_apiBaseUrl: string, idOrSlug: string): string {
  const origin = publicSiteOrigin();
  const path = `/article/${encodeURIComponent(idOrSlug)}`;
  return origin ? `${origin}${path}` : absoluteUrl(path);
}

/**
 * Resolve a media asset URL from either:
 *   - a full Supabase Storage public URL (already absolute), OR
 *   - a MediaAsset row's id (fallback for legacy /api/public/media/:id/file).
 *
 * Callers that already hold media.url should just use that directly; this
 * helper exists only for paths that still carry an id.
 */
export function mediaFileUrl(apiBaseUrl: string, mediaIdOrUrl: string): string {
  if (!mediaIdOrUrl) return '';
  if (/^https?:\/\//i.test(mediaIdOrUrl) || mediaIdOrUrl.startsWith('data:')) return mediaIdOrUrl;
  const root = trimTrail(apiBaseUrl.replace(/\/api\/?$/, ''));
  return `${root}/media/${encodeURIComponent(mediaIdOrUrl)}/file`;
}

export function shareTargets(pageUrl: string, title: string, shareUrl?: string) {
  const targetUrl = shareUrl || pageUrl;
  const u = encodeURIComponent(targetUrl);
  const t = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    email: `mailto:?subject=${t}&body=${u}%0D%0A%0D%0ARead more:%20${u}`,
  };
}

export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
