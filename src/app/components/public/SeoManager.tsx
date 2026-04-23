import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useCms } from '../../context/cms-context';
import type { SiteSettings } from '../../lib/admin/cms-state';
import { categoryLabelForSlug, resolveArticle } from '../../lib/public-content';

const FALLBACK_FAVICON = '/favicon.svg';
const FALLBACK_KEYWORDS = '';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function siteBase(settings: SiteSettings): string {
  if (settings.siteUrl) return trimSlash(settings.siteUrl);
  if (typeof window !== 'undefined') return trimSlash(window.location.origin);
  return '';
}

function setMeta(selector: string, createAttrs: Record<string, string>, content: string): void {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement('meta');
    for (const [key, value] of Object.entries(createAttrs)) node.setAttribute(key, value);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function removeMeta(selector: string): void {
  const node = document.head.querySelector<HTMLMetaElement>(selector);
  node?.remove();
}

function setLink(selector: string, rel: string, href: string): void {
  let node = document.head.querySelector<HTMLLinkElement>(selector);
  if (!href) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

function normalizeMetaText(value: string | undefined, fallback = ''): string {
  return value?.trim() || fallback;
}

function normalizeTwitterHandle(value: string): string {
  const handle = value.trim();
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}

function resolveFaviconUrl(settings: SiteSettings): string {
  return normalizeMetaText(settings.faviconUrl) || FALLBACK_FAVICON;
}

function setIconLinks(rawHref: string): void {
  const href = normalizeMetaText(rawHref, FALLBACK_FAVICON);
  const dataMime = href.match(/^data:(image\/[a-z0-9.+-]+)/i)?.[1];
  const lowerHref = href.toLowerCase();
  const type = dataMime
    ? dataMime
    : lowerHref.endsWith('.png')
      ? 'image/png'
      : lowerHref.endsWith('.jpg') || lowerHref.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/svg+xml';

  let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.setAttribute('rel', 'icon');
    document.head.appendChild(icon);
  }
  icon.setAttribute('href', href);
  icon.setAttribute('type', type);

  let shortcut = document.head.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  if (!shortcut) {
    shortcut = document.createElement('link');
    shortcut.setAttribute('rel', 'shortcut icon');
    document.head.appendChild(shortcut);
  }
  shortcut.setAttribute('href', href);

  let apple = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement('link');
    apple.setAttribute('rel', 'apple-touch-icon');
    apple.setAttribute('sizes', '180x180');
    document.head.appendChild(apple);
  }
  apple.setAttribute('href', href);
}

export default function SeoManager() {
  const { state } = useCms();
  const location = useLocation();
  const { settings } = state;

  const page = useMemo(() => {
    const base = siteBase(settings);
    const canonical = `${base}${location.pathname === '/' ? '/' : location.pathname}`;
    const siteTitle = settings.siteTitle || settings.organizationName || 'Publication';
    let title = settings.defaultSeoTitle || `${siteTitle} - ${settings.tagline}`;
    let description = normalizeMetaText(settings.defaultMetaDescription, settings.tagline);
    let image = settings.ogImageUrl || settings.logoUrl || '';
    let type = 'website';
    let jsonLd: Record<string, unknown> | null = null;
    let articlePublished = '';
    let articleModified = '';
    let articleSection = '';
    let articleImage = '';

    const articleMatch = location.pathname.match(/^\/article\/([^/?#]+)/);
    if (articleMatch?.[1]) {
      const resolved = resolveArticle(state, decodeURIComponent(articleMatch[1]));
      if (resolved?.detail) {
        title = `${resolved.detail.title} | ${siteTitle}`;
        description = normalizeMetaText(resolved.detail.dek, description);
        image = resolved.heroUrl || image;
        type = 'article';
        articleImage = image;
        articlePublished = resolved.post?.publishedAt || '';
        articleModified = resolved.post?.updatedAt || '';
        articleSection = categoryLabelForSlug(state, resolved.post?.categorySlug || '');
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: resolved.detail.title,
          description,
          image: articleImage ? [articleImage] : undefined,
          datePublished: resolved.post?.publishedAt,
          dateModified: resolved.post?.updatedAt,
          author: { '@type': 'Person', name: resolved.detail.author },
          publisher: {
            '@type': settings.schemaType || 'NewsMediaOrganization',
            name: settings.organizationName || siteTitle,
            logo: settings.logoUrl ? { '@type': 'ImageObject', url: settings.logoUrl } : undefined,
          },
          mainEntityOfPage: canonical,
        };
      }
    } else {
      const categoryMatch = location.pathname.match(/^\/category\/([^/?#]+)/);
      if (categoryMatch?.[1]) {
        const label = categoryLabelForSlug(state, decodeURIComponent(categoryMatch[1]));
        title = `${label} News | ${siteTitle}`;
        description = `Latest ${label.toLowerCase()} news, analysis, and updates from ${siteTitle}.`;
      } else if (location.pathname === '/search') {
        title = `Search ${siteTitle}`;
        description = `Search articles, topics, analysis, and updates from ${siteTitle}.`;
      } else if (location.pathname === '/about') {
        const page = state.pages.find((item) => item.slug === 'about');
        title = page?.seoTitle || `About ${siteTitle}`;
        description = page?.metaDescription || page?.excerpt || settings.footerAbout || settings.tagline || description;
      } else if (location.pathname === '/contact') {
        title = `Contact ${siteTitle}`;
        description = `Contact ${siteTitle} for editorial, support, advertising, and partnership inquiries.`;
      } else if (location.pathname === '/privacy') {
        const page = state.pages.find((item) => item.slug === 'privacy');
        title = page?.seoTitle || `Privacy Policy | ${siteTitle}`;
        description = page?.metaDescription || page?.excerpt || description;
      } else if (location.pathname === '/terms') {
        const page = state.pages.find((item) => item.slug === 'terms');
        title = page?.seoTitle || `Terms of Service | ${siteTitle}`;
        description = page?.metaDescription || page?.excerpt || description;
      } else {
        const pageMatch = location.pathname.match(/^\/page\/([^/?#]+)/);
        if (pageMatch?.[1]) {
          const staticPage = state.pages.find((item) => item.slug === decodeURIComponent(pageMatch[1]) && item.status === 'PUBLISHED');
          if (staticPage) {
            title = staticPage.seoTitle || `${staticPage.title} | ${siteTitle}`;
            description = staticPage.metaDescription || staticPage.excerpt || description;
          }
        }
      }
    }

    const organizationJsonLd = {
      '@context': 'https://schema.org',
      '@type': settings.schemaType || 'NewsMediaOrganization',
      name: settings.organizationName || siteTitle,
      url: base || canonical,
      logo: settings.logoUrl || undefined,
      description,
      sameAs: [settings.facebook, settings.twitter, settings.instagram, settings.linkedin].filter(Boolean),
      contactPoint: settings.contactEmail
        ? {
            '@type': 'ContactPoint',
            email: settings.contactEmail,
            contactType: 'editorial',
          }
        : undefined,
    };

    return {
      title,
      description,
      image,
      canonical,
      type,
      articlePublished,
      articleModified,
      articleSection,
      articleImage,
      keywordText: normalizeMetaText(settings.defaultKeywords, FALLBACK_KEYWORDS),
      jsonLd: jsonLd ?? organizationJsonLd,
    };
  }, [location.pathname, settings, state]);

  useEffect(() => {
    document.title = page.title;
    document.documentElement.style.setProperty('--phulpur24-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--phulpur24-accent', settings.accentColor);
    document.documentElement.style.setProperty('--phulpur24-header-bg', settings.headerBackground);
    document.documentElement.style.setProperty('--phulpur24-footer-bg', settings.footerBackground);

    setMeta('meta[name="description"]', { name: 'description' }, page.description);
    setMeta('meta[name="keywords"]', { name: 'keywords' }, page.keywordText);
    setMeta('meta[name="robots"]', { name: 'robots' }, `${settings.robotsIndex ? 'index' : 'noindex'}, ${settings.robotsFollow ? 'follow' : 'nofollow'}`);
    setMeta('meta[name="theme-color"]', { name: 'theme-color' }, settings.primaryColor);
    setMeta('meta[name="application-name"]', { name: 'application-name' }, settings.siteTitle);
    setMeta('meta[name="msapplication-TileColor"]', { name: 'msapplication-TileColor' }, settings.primaryColor);
    setMeta('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title' }, settings.siteTitle);

    const googleVerification = settings.googleSiteVerification.trim();
    setMeta('meta[name="google-site-verification"]', { name: 'google-site-verification' }, googleVerification);
    if (settings.bingSiteVerification) {
      setMeta('meta[name="msvalidate.01"]', { name: 'msvalidate.01' }, settings.bingSiteVerification);
    } else {
      document.head.querySelector('meta[name="msvalidate.01"]')?.remove();
    }

    setLink('link[rel="canonical"]', 'canonical', page.canonical);
    setIconLinks(ensureFaviconUrl(settings));

    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, settings.siteTitle);
    setMeta('meta[property="og:type"]', { property: 'og:type' }, page.type);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, page.title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, page.description);
    setMeta('meta[property="og:url"]', { property: 'og:url' }, page.canonical);
    setMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'en_US');
    if (page.image) setMeta('meta[property="og:image"]', { property: 'og:image' }, page.image);
    if (page.image) setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, page.title);

    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, page.image ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, page.title);
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, page.description);
    if (page.image) setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, page.image);

    const twitterHandle = normalizeTwitterHandle(settings.twitterHandle);
    if (twitterHandle) {
      setMeta('meta[name="twitter:site"]', { name: 'twitter:site' }, twitterHandle);
      setMeta('meta[name="twitter:creator"]', { name: 'twitter:creator' }, twitterHandle);
    } else {
      removeMeta('meta[name="twitter:site"]');
      removeMeta('meta[name="twitter:creator"]');
    }

    if (page.type === 'article' && page.articlePublished) {
      setMeta('meta[property="article:published_time"]', { property: 'article:published_time' }, page.articlePublished);
      setMeta('meta[property="article:modified_time"]', { property: 'article:modified_time' }, page.articleModified || page.articlePublished);
      if (page.articleSection) setMeta('meta[property="article:section"]', { property: 'article:section' }, page.articleSection);
    } else {
      removeMeta('meta[property="article:published_time"]');
      removeMeta('meta[property="article:modified_time"]');
      removeMeta('meta[property="article:section"]');
      removeMeta('meta[property="article:publisher"]');
    }

    const scriptId = 'phulpur24-jsonld';
    document.getElementById(scriptId)?.remove();
    if (settings.structuredDataEnabled) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(page.jsonLd);
      document.head.appendChild(script);
    }
  }, [page, settings]);

  return null;
}

function ensureFaviconUrl(settings: SiteSettings): string {
  return resolveFaviconUrl(settings);
}
