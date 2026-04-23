export type ArticleListItem = {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  date: string;
  excerpt: string;
  keywords: string;
};

export type ArticleDetail = {
  id: string;
  categorySlug: string;
  categoryLabel: string;
  title: string;
  dek: string;
  author: string;
  dateLabel: string;
  readTime: string;
  related: { id: string; title: string; category: string; date: string; imageUrl?: string | null }[];
};

export const ARTICLE_CATALOG: ArticleListItem[] = [];

const DETAIL_FALLBACK: Omit<ArticleDetail, 'id' | 'related'> = {
  categorySlug: '',
  categoryLabel: '',
  title: '',
  dek: '',
  author: '',
  dateLabel: '',
  readTime: '',
};

function relatedFor(id: string): ArticleDetail['related'] {
  return ARTICLE_CATALOG.filter((a) => a.id !== id)
    .slice(0, 3)
    .map((a) => ({ id: a.id, title: a.title, category: a.category, date: a.date }));
}

export function getArticleDetail(id: string | undefined): ArticleDetail {
  const row = ARTICLE_CATALOG.find((a) => a.id === (id || ''));
  if (!row) {
    return {
      id: id || '',
      ...DETAIL_FALLBACK,
      related: relatedFor(id || ''),
    };
  }
  return {
    id: row.id,
    categorySlug: row.categorySlug,
    categoryLabel: row.category,
    title: row.title,
    dek: row.excerpt,
    author: '',
    dateLabel: '',
    readTime: '',
    related: relatedFor(row.id),
  };
}

export function formatCategoryTitle(slug: string | undefined): string {
  if (!slug) return 'News';
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function filterArticlesForCategory(slug: string | undefined): ArticleListItem[] {
  if (!slug) return ARTICLE_CATALOG;
  const s = slug.toLowerCase();
  const direct = ARTICLE_CATALOG.filter((a) => a.categorySlug === s);
  if (direct.length) return direct;
  return ARTICLE_CATALOG.filter(
    (a) => a.category.toLowerCase() === s || a.keywords.toLowerCase().includes(s.replace(/-/g, ' ')),
  );
}

export function searchCatalog(
  query: string,
  category: 'all' | string,
  sort: 'relevance' | 'recent' | 'popular',
): ArticleListItem[] {
  const q = query.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];

  let list = [...ARTICLE_CATALOG];
  if (category && category !== 'all') {
    list = list.filter((a) => a.categorySlug === category || a.category.toLowerCase() === category.toLowerCase());
  }

  if (words.length) {
    list = list.filter((a) => {
      const hay = `${a.title} ${a.excerpt} ${a.keywords} ${a.category}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  if (sort === 'recent') {
    list = [...list].sort((a, b) => Number(a.id) - Number(b.id));
  }
  if (sort === 'popular') {
    list = [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }

  return list;
}
