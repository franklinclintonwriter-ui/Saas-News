export function absoluteUrl(raw: string): string {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window === 'undefined') return raw;
  return new URL(raw, window.location.origin).toString();
}

export function shareArticleMetaUrl(apiBaseUrl: string, idOrSlug: string): string {
  const root = apiBaseUrl.replace(/\/api\/?$/, '');
  const normalizedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  const path = `/api/public/share/article/${encodeURIComponent(idOrSlug)}`;
  return absoluteUrl(`${normalizedRoot}${path}`);
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
