/**
 * JSON-LD builders for the public surface.
 *
 * Usage: stringify a result and render inside a <script type="application/ld+json">
 * tag via SeoManager.tsx.
 */

type Org = {
  name: string;
  url: string;
  logoUrl?: string;
  sameAs?: string[];
};

export function organizationSchema(org: Org) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: org.name,
    url: org.url,
    ...(org.logoUrl ? { logo: { '@type': 'ImageObject', url: org.logoUrl } } : {}),
    ...(org.sameAs?.length ? { sameAs: org.sameAs } : {}),
  };
}

export function websiteSchema(site: { name: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.url.replace(/\/+$/, '')}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbsSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type ArticleSchemaInput = {
  headline: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  author: { name: string; url?: string };
  publisher: { name: string; logoUrl?: string; url: string };
  datePublished: string; // ISO
  dateModified?: string; // ISO
  section?: string;
  keywords?: string[];
};

/**
 * NewsArticle schema — Google's preferred type for news content.
 * Meets publisher + dates + images required fields.
 */
export function newsArticleSchema(a: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.headline.slice(0, 110),
    description: a.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.canonicalUrl },
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
    author: {
      '@type': 'Person',
      name: a.author.name,
      ...(a.author.url ? { url: a.author.url } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: a.publisher.name,
      ...(a.publisher.logoUrl
        ? { logo: { '@type': 'ImageObject', url: a.publisher.logoUrl } }
        : {}),
      url: a.publisher.url,
    },
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    ...(a.section ? { articleSection: a.section } : {}),
    ...(a.keywords?.length ? { keywords: a.keywords.join(', ') } : {}),
  };
}

/**
 * Safely serialise a JSON-LD object for embedding in a <script> tag. Closes
 * the XSS hole of `</script>` appearing inside string fields.
 */
export function stringifyJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
