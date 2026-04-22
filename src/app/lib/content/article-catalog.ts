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

export const ARTICLE_CATALOG: ArticleListItem[] = [
  {
    id: '1',
    title: 'Global Climate Summit Reaches Historic Agreement on Carbon Emissions',
    category: 'World',
    categorySlug: 'world',
    date: '2 hours ago',
    excerpt: 'World leaders unite in unprecedented climate action plan.',
    keywords: 'climate summit carbon emissions world leaders agreement environment cop',
  },
  {
    id: '2',
    title: 'Tech Giant Unveils Revolutionary AI Assistant',
    category: 'Technology',
    categorySlug: 'technology',
    date: '4 hours ago',
    excerpt: 'Consumer AI reaches new milestone in reasoning and safety.',
    keywords: 'technology AI assistant artificial intelligence machine learning silicon valley',
  },
  {
    id: '3',
    title: 'Stock Markets Hit Record Highs Amid Economic Recovery',
    category: 'Business',
    categorySlug: 'business',
    date: '5 hours ago',
    excerpt: 'Indices rally as investors weigh inflation data and earnings.',
    keywords: 'business stocks market finance economy earnings inflation investors',
  },
  {
    id: '4',
    title: 'Championship Finals: Underdog Team Claims Victory',
    category: 'Sports',
    categorySlug: 'sports',
    date: '6 hours ago',
    excerpt: 'Historic upset caps a dramatic postseason.',
    keywords: 'sports championship finals underdog victory playoffs league',
  },
  {
    id: '5',
    title: 'New Medical Breakthrough Could Transform Cancer Treatment',
    category: 'Health',
    categorySlug: 'world',
    date: '7 hours ago',
    excerpt: 'Early trial data shows durable responses across cohorts.',
    keywords: 'health medical cancer treatment oncology clinical trial research hospital',
  },
  {
    id: '6',
    title: 'Political Debate Highlights Key Differences on Economic Policy',
    category: 'Politics',
    categorySlug: 'politics',
    date: '8 hours ago',
    excerpt: 'Candidates outline competing visions on growth and deficits.',
    keywords: 'politics debate economy policy election congress white house budget',
  },
  {
    id: '7',
    title: 'Cybersecurity Agencies Warn of Rising Ransomware Campaigns',
    category: 'Technology',
    categorySlug: 'technology',
    date: '9 hours ago',
    excerpt: 'Joint advisory lists indicators of compromise and mitigations.',
    keywords: 'cybersecurity ransomware technology threat intelligence malware agencies',
  },
  {
    id: '8',
    title: 'Central Banks Signal Cautious Approach to Rate Cuts',
    category: 'Business',
    categorySlug: 'business',
    date: '10 hours ago',
    excerpt: 'Minutes emphasize data dependence through the next quarter.',
    keywords: 'central bank rates inflation monetary policy business economy bonds',
  },
  {
    id: '9',
    title: 'Film Festival Opens With Standing Ovation for Opening Night Drama',
    category: 'Entertainment',
    categorySlug: 'entertainment',
    date: '11 hours ago',
    excerpt: 'Critics praise performances and cinematography in premiere.',
    keywords: 'entertainment film festival cinema hollywood drama premiere critics',
  },
  {
    id: '10',
    title: 'Renewable Grid Expansion Accelerates Across Coastal States',
    category: 'World',
    categorySlug: 'world',
    date: '12 hours ago',
    excerpt: 'Offshore wind and storage projects clear regulatory milestones.',
    keywords: 'renewable energy offshore wind grid storage world infrastructure climate',
  },
  {
    id: '11',
    title: 'Space Agency Announces Crewed Mission Timeline to Lunar Gateway',
    category: 'World',
    categorySlug: 'world',
    date: '13 hours ago',
    excerpt: 'Partners outline training milestones and launch windows.',
    keywords: 'space moon lunar gateway astronaut mission nasa esa science world',
  },
  {
    id: '12',
    title: 'Retailers Report Strong Holiday Demand Despite Macro Headwinds',
    category: 'Business',
    categorySlug: 'business',
    date: '14 hours ago',
    excerpt: 'E-commerce share gains offset softer foot traffic in malls.',
    keywords: 'retail holiday sales ecommerce business consumer spending macro',
  },
];

const DETAIL_FALLBACK: Omit<ArticleDetail, 'id' | 'related'> = {
  categorySlug: 'technology',
  categoryLabel: 'Technology',
  title: 'Artificial Intelligence Breakthrough: New System Achieves Human-Level Understanding',
  dek: 'Researchers unveil groundbreaking AI model that demonstrates unprecedented reasoning capabilities',
  author: 'Sarah Johnson',
  dateLabel: 'April 21, 2026',
  readTime: '8 min read',
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
      id: id || '1',
      ...DETAIL_FALLBACK,
      related: relatedFor(id || '1'),
    };
  }
  return {
    id: row.id,
    categorySlug: row.categorySlug,
    categoryLabel: row.category,
    title: row.title,
    dek: row.excerpt,
    author: 'Sarah Johnson',
    dateLabel: 'April 21, 2026',
    readTime: '6 min read',
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
