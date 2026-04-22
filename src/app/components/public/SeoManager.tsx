import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useCms } from '../../context/cms-context';
import type { SiteSettings } from '../../lib/admin/cms-state';
import { categoryLabelForSlug, resolveArticle } from '../../lib/public-content';

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

function normalizeTwitterHandle(value: string): string {
  const handle = value.trim();
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
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
    let description = settings.defaultMetaDescription || settings.tagline;
    let image = settings.ogImageUrl || settings.logoUrl || '';
    let type = 'website';
    let jsonLd: Record<string, unknown> | null = null;

    const articleMatch = location.pathname.match(/^\/article\/([^/?#]+)/);
    if (articleMatch?.[1]) {
      const resolved = resolveArticle(state, decodeURIComponent(articleMatch[1]));
      if (resolved?.detail) {
        title = `${resolved.detail.title} | ${siteTitle}`;
        description = resolved.detail.dek || description;
        image = resolved.heroUrl || image;
        type = 'article';
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: resolved.detail.title,
          description,
          image: image ? [image] : undefined,
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
        description = `Search articles, topics, and analysis from ${siteTitle}.`;
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
    setMeta('meta[name="keywords"]', { name: 'keywords' }, settings.defaultKeywords);
    setMeta('meta[name="robots"]', { name: 'robots' }, `${settings.robotsIndex ? 'index' : 'noindex'}, ${settings.robotsFollow ? 'follow' : 'nofollow'}`);
    setMeta('meta[name="theme-color"]', { name: 'theme-color' }, settings.primaryColor);
    setMeta('meta[name="application-name"]', { name: 'application-name' }, settings.siteTitle);

    if (settings.googleSiteVerification) {
      setMeta('meta[name="google-site-verification"]', { name: 'google-site-verification' }, settings.googleSiteVerification);
    } else {
      document.head.querySelector('meta[name="google-site-verification"]')?.remove();
    }
    if (settings.bingSiteVerification) {
      setMeta('meta[name="msvalidate.01"]', { name: 'msvalidate.01' }, settings.bingSiteVerification);
    } else {
      document.head.querySelector('meta[name="msvalidate.01"]')?.remove();
    }

    setLink('link[rel="canonical"]', 'canonical', page.canonical);
    setLink('link[rel="icon"]', 'icon', settings.faviconUrl || settings.logoUrl);
    setLink('link[rel="apple-touch-icon"]', 'apple-touch-icon', settings.faviconUrl || settings.logoUrl);

    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, settings.siteTitle);
    setMeta('meta[property="og:type"]', { property: 'og:type' }, page.type);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, page.title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, page.description);
    setMeta('meta[property="og:url"]', { property: 'og:url' }, page.canonical);
    if (page.image) setMeta('meta[property="og:image"]', { property: 'og:image' }, page.image);

    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, page.image ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, page.title);
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, page.description);
    if (page.image) setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, page.image);
    const twitterHandle = normalizeTwitterHandle(settings.twitterHandle);
    if (twitterHandle) setMeta('meta[name="twitter:site"]', { name: 'twitter:site' }, twitterHandle);

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
