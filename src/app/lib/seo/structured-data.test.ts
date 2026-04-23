import { describe, it, expect } from 'vitest';
import {
  organizationSchema,
  websiteSchema,
  breadcrumbsSchema,
  newsArticleSchema,
  stringifyJsonLd,
} from './structured-data';

describe('structured-data', () => {
  it('emits valid NewsMediaOrganization JSON-LD', () => {
    const schema = organizationSchema({
      name: 'Acme News',
      url: 'https://acme.example',
      logoUrl: 'https://acme.example/logo.png',
      sameAs: ['https://twitter.com/acme'],
    });
    expect(schema['@type']).toBe('NewsMediaOrganization');
    expect(schema.url).toBe('https://acme.example');
    expect(schema.logo).toEqual({ '@type': 'ImageObject', url: 'https://acme.example/logo.png' });
    expect(schema.sameAs).toEqual(['https://twitter.com/acme']);
  });

  it('omits logo + sameAs when not provided', () => {
    const schema = organizationSchema({ name: 'Small Pub', url: 'https://x.com' });
    expect('logo' in schema).toBe(false);
    expect('sameAs' in schema).toBe(false);
  });

  it('website schema advertises /search SearchAction', () => {
    const schema = websiteSchema({ name: 'Acme', url: 'https://acme.example/' });
    expect(schema.potentialAction.target.urlTemplate).toBe(
      'https://acme.example/search?q={search_term_string}'
    );
  });

  it('breadcrumbs assign positions in order', () => {
    const schema = breadcrumbsSchema([
      { name: 'Home', url: 'https://x/' },
      { name: 'World', url: 'https://x/world' },
      { name: 'Story', url: 'https://x/world/story' },
    ]);
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(schema.itemListElement[2].item).toBe('https://x/world/story');
  });

  it('article schema caps headline at 110 chars (Google limit)', () => {
    const long = 'x'.repeat(200);
    const schema = newsArticleSchema({
      headline: long,
      description: 'd',
      canonicalUrl: 'https://x/story',
      author: { name: 'A' },
      publisher: { name: 'P', url: 'https://x' },
      datePublished: '2026-04-01T00:00:00Z',
    });
    expect(schema.headline.length).toBe(110);
  });

  it('article defaults dateModified to datePublished', () => {
    const schema = newsArticleSchema({
      headline: 'H',
      description: 'd',
      canonicalUrl: 'https://x/story',
      author: { name: 'A' },
      publisher: { name: 'P', url: 'https://x' },
      datePublished: '2026-04-01T00:00:00Z',
    });
    expect(schema.dateModified).toBe('2026-04-01T00:00:00Z');
  });

  it('stringifyJsonLd escapes closing script tags and unicode line separators', () => {
    const out = stringifyJsonLd({
      a: '</script>',
      b: 'x\u2028y',
      c: 'x\u2029y',
    });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    // remains valid JSON
    expect(() => JSON.parse(out.replace(/\\u/g, '\\u'))).not.toThrow();
  });
});
