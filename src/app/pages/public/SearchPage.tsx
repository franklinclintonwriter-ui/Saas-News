import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal } from 'lucide-react';
import NewsCard from '../../components/public/NewsCard';
import AdSlot from '../../components/public/AdSlot';
import { useCms } from '../../context/cms-context';
import type { ArticleListItem } from '../../lib/content/article-catalog';
import { searchPublicArticles } from '../../lib/public-content';
import { apiRequestWithMeta } from '../../lib/api-client';
import { formatRelative } from '../../lib/admin/cms-state';

const PAGE_SIZE = 6;

type SortMode = 'relevance' | 'recent' | 'popular';
type DateRange = 'all' | '24h' | '7d' | '30d';

type ApiSearchPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  updatedAt: string;
  publishedAt: string | null;
  category?: { name: string; slug: string } | null;
  tags?: { name: string; slug: string }[];
};

type SearchMeta = { total?: number; totalPages?: number };

const DATE_RANGE_MS: Record<Exclude<DateRange, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function parseSort(v: string | null): SortMode {
  if (v === 'recent' || v === 'popular' || v === 'relevance') return v;
  return 'relevance';
}

function parseDateRange(v: string | null): DateRange {
  if (v === '24h' || v === '7d' || v === '30d' || v === 'all') return v;
  return 'all';
}

function apiPostToListItem(post: ApiSearchPost): ArticleListItem {
  const category = post.category?.name || 'News';
  return {
    id: post.id,
    title: post.title,
    category,
    categorySlug: post.category?.slug || category.toLowerCase(),
    date: formatRelative(post.publishedAt || post.updatedAt),
    excerpt: post.excerpt || post.content.replace(/\s+/g, ' ').trim().slice(0, 180),
    keywords: post.tags?.map((tag) => `${tag.name} ${tag.slug}`).join(' ') ?? '',
  };
}

export default function SearchPage() {
  const { state } = useCms();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCat = searchParams.get('cat') || 'all';
  const initialSort = parseSort(searchParams.get('sort'));
  const initialDateRange = parseDateRange(searchParams.get('date'));

  const [draftQuery, setDraftQuery] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<'all' | string>(initialCat === 'all' ? 'all' : initialCat);
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [page, setPage] = useState(1);
  const [apiItems, setApiItems] = useState<ArticleListItem[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const c = searchParams.get('cat') || 'all';
    const s = parseSort(searchParams.get('sort'));
    const d = parseDateRange(searchParams.get('date'));
    setDraftQuery(q);
    setActiveQuery(q);
    setCategory(c === 'all' ? 'all' : c);
    setSort(s);
    setDateRange(d);
    setPage(1);
  }, [searchParams]);

  const fallbackFiltered = useMemo(() => {
    const baseResults = searchPublicArticles(state, activeQuery, category, sort);
    if (dateRange === 'all') return baseResults;

    const postsById = new Map(state.posts.map((post) => [post.id, post]));
    const cutoff = Date.now() - DATE_RANGE_MS[dateRange];

    return baseResults.filter((article) => {
      const post = postsById.get(article.id);
      if (!post) return false;
      const timestamp = new Date(post.publishedAt || post.updatedAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [state, activeQuery, category, sort, dateRange]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setApiLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (activeQuery.trim()) params.set('q', activeQuery.trim());
        if (category !== 'all') params.set('category', category);
        if (sort === 'popular') params.set('sort', 'popular');
        if (dateRange !== 'all') params.set('date', dateRange);
        const response = await apiRequestWithMeta<ApiSearchPost[]>(`/public/posts?${params.toString()}`);
        const meta = (response.meta ?? {}) as SearchMeta;
        if (!cancelled) {
          setApiItems(response.data.map(apiPostToListItem));
          setApiTotal(meta.total ?? response.data.length);
          setApiTotalPages(Math.max(1, meta.totalPages ?? Math.ceil((meta.total ?? response.data.length) / PAGE_SIZE)));
          setApiFailed(false);
        }
      } catch {
        if (!cancelled) setApiFailed(true);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeQuery, category, sort, dateRange, page]);

  const total = apiFailed ? fallbackFiltered.length : apiTotal;
  const totalPages = apiFailed ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : apiTotalPages;
  const pageItems = useMemo(() => {
    if (!apiFailed) return apiItems;
    const start = (page - 1) * PAGE_SIZE;
    return fallbackFiltered.slice(start, start + PAGE_SIZE);
  }, [apiFailed, apiItems, fallbackFiltered, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const syncParams = useCallback(
    (q: string, cat: string, srt: SortMode, range: DateRange, resetPage = true) => {
      const next = new URLSearchParams();
      if (q.trim()) next.set('q', q.trim());
      if (cat && cat !== 'all') next.set('cat', cat);
      if (srt !== 'relevance') next.set('sort', srt);
      if (range !== 'all') next.set('date', range);
      setSearchParams(next);
      if (resetPage) setPage(1);
    },
    [setSearchParams],
  );

  const runSearch = useCallback(() => {
    const q = draftQuery.trim();
    setActiveQuery(q);
    syncParams(q, category, sort, dateRange);
  }, [draftQuery, category, sort, dateRange, syncParams]);

  const applyTopic = useCallback(
    (topic: string) => {
      const next = draftQuery.trim() ? `${draftQuery.trim()} ${topic}` : topic;
      setDraftQuery(next);
      setActiveQuery(next);
      syncParams(next, category, sort, dateRange);
    },
    [draftQuery, category, sort, dateRange, syncParams],
  );

  const clearFilters = useCallback(() => {
    setCategory('all');
    setSort('relevance');
    setDateRange('all');
    syncParams(activeQuery, 'all', 'relevance', 'all');
  }, [activeQuery, syncParams]);

  const displayLabel = activeQuery.trim() ? `"${activeQuery.trim()}"` : 'all articles';

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      <div className="bg-white py-8 md:py-12 border-b border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto px-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">Search {state.settings.siteTitle}</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" size={20} aria-hidden />
              <input
                type="search"
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runSearch())}
                placeholder="Search for articles, topics, authors..."
                className="w-full pl-12 pr-4 py-4 border border-[#E5E7EB] rounded-lg text-lg"
                aria-label="Search query"
              />
            </div>
            <button
              type="button"
              onClick={runSearch}
              className="px-6 py-4 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition font-semibold whitespace-nowrap"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 sm:px-6 py-4 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition flex items-center justify-center gap-2 whitespace-nowrap"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={20} aria-hidden />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 p-6 bg-[#F3F4F6] rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="filter-date" className="block text-sm font-semibold mb-2">
                    Date Range
                  </label>
                  <select
                    id="filter-date"
                    value={dateRange}
                    onChange={(e) => {
                      const v = e.target.value as DateRange;
                      setDateRange(v);
                      syncParams(activeQuery, category, sort, v);
                    }}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="all">Any time</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last week</option>
                    <option value="30d">Last month</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-category" className="block text-sm font-semibold mb-2">
                    Category
                  </label>
                  <select
                    id="filter-category"
                    value={category}
                    onChange={(e) => {
                      const v = e.target.value as 'all' | string;
                      setCategory(v);
                      syncParams(activeQuery, v, sort, dateRange);
                    }}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="all">All categories</option>
                    {state.categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-sort" className="block text-sm font-semibold mb-2">
                    Sort By
                  </label>
                  <select
                    id="filter-sort"
                    value={sort}
                    onChange={(e) => {
                      const v = e.target.value as SortMode;
                      setSort(v);
                      syncParams(activeQuery, category, v, dateRange);
                    }}
                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="recent">Most recent</option>
                    <option value="popular">Most popular</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#E5E7EB] transition"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-8 md:py-12 pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[#6B7280]">
            {apiLoading ? 'Searching' : 'Found'} <span className="font-semibold text-neutral-900">{total}</span> result{total === 1 ? '' : 's'} for{' '}
            <span className="font-semibold text-neutral-900">{displayLabel}</span>
          </p>
          <label className="sr-only" htmlFor="sort-inline">
            Sort results
          </label>
          <select
            id="sort-inline"
            value={sort}
            onChange={(e) => {
              const v = e.target.value as SortMode;
              setSort(v);
              syncParams(activeQuery, category, v, dateRange);
            }}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white w-full sm:w-auto"
          >
            <option value="relevance">Relevance</option>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {pageItems.length === 0 ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center">
                <p className="text-lg font-semibold text-neutral-900">No articles match your search</p>
                <p className="mt-2 text-sm text-[#6B7280]">Try broader keywords, clear filters, or browse categories from the header.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                {pageItems.map((news: ArticleListItem) => (
                  <NewsCard key={news.id} id={news.id} title={news.title} category={news.category} date={news.date} excerpt={news.excerpt} />
                ))}
              </div>
            )}

            {total > PAGE_SIZE && (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F3F4F6] transition disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-4 py-2 rounded-lg transition ${
                      p === page ? 'bg-[#194890] text-white' : 'border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white hover:bg-[#F3F4F6] transition disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold mb-4">Suggested Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Machine Learning', 'Blockchain', 'Cloud Computing', 'Cybersecurity', '5G'].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => applyTopic(topic)}
                      className="px-3 py-1 bg-[#F3F4F6] rounded-full text-sm hover:bg-[#194890] hover:text-white transition"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold mb-4">Popular Searches</h3>
                <div className="space-y-3">
                  {['Climate change', 'Stock market', 'AI technology', 'Space exploration', 'Global economy'].map((search) => (
                    <button
                      key={search}
                      type="button"
                      onClick={() => {
                        setDraftQuery(search);
                        setActiveQuery(search);
                        syncParams(search, category, sort, dateRange);
                      }}
                      className="block w-full text-left text-sm text-[#194890] hover:underline"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>

              <AdSlot placement="search-sidebar" fallbackSize="300x250" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
