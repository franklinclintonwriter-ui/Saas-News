export function shareTargets(pageUrl: string, title: string) {
  const u = encodeURIComponent(pageUrl);
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
