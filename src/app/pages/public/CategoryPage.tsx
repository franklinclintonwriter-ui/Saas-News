import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import NewsCard from '../../components/public/NewsCard';
import AdSlot from '../../components/public/AdSlot';
import { Search, TrendingUp } from 'lucide-react';
import { formatCategoryTitle } from '../../lib/content/article-catalog';
import { useCms } from '../../context/cms-context';
import { filterPublicByCategory, imageUrlForPost } from '../../lib/public-content';

type SortKey = 'recent' | 'popular' | 'title';

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state } = useCms();
  const categoryTitle = useMemo(() => formatCategoryTitle(slug), [slug]);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const articles = useMemo(() => {
    const base = filterPublicByCategory(state, slug);
    const published = state.posts.filter((p) => p.status === 'Published');
    const byId = new Map(published.map((p) => [p.id, p]));
    const enriched = [...base];
    if (sort === 'recent') {
      enriched.sort((a, b) => (new Date(byId.get(b.id)?.updatedAt ?? 0).getTime()) - (new Date(byId.get(a.id)?.updatedAt ?? 0).getTime()));
    } else if (sort === 'popular') {
      enriched.sort((a, b) => (byId.get(b.id)?.views ?? 0) - (byId.get(a.id)?.views ?? 0));
    } else {
      enriched.sort((a, b) => a.title.localeCompare(b.title));
    }
    return enriched;
  }, [state, slug, sort]);

  const featured = articles[0];
  const trending = articles.slice(0, 5);
  const imageByPostId = useMemo(() => {
    const published = state.posts.filter((p) => p.status === 'Published');
    return new Map(published.map((post) => [post.id, imageUrlForPost(state, post)]));
  }, [state]);

  const runSidebarSearch = () => {
    const q = sidebarQuery.trim();
    const cat = slug ? `&cat=${encodeURIComponent(slug)}` : '';
    if (q) navigate(`/search?q=${encodeURIComponent(q)}${cat}`);
    else navigate(slug ? `/search?cat=${encodeURIComponent(slug)}` : '/search');
  };

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      <div className="bg-[#194890] text-white py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4">
          <h1 className="text-3xl font-bold mb-3 sm:text-4xl md:text-5xl">{categoryTitle}</h1>
          <p className="text-base opacity-90 sm:text-lg md:text-xl">
            Latest news, analysis, and insights from {categoryTitle.toLowerCase()}.
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-8 md:py-12 pb-16">
        <div className="mb-6 md:mb-8">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="h-64 bg-[#E5E7EB] sm:h-72 lg:h-80 overflow-hidden" aria-hidden>
                {featured ? (
                  (() => {
                    const url = imageByPostId.get(featured.id);
                    return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null;
                  })()
                ) : null}
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                <span className="text-sm text-[#194890] font-semibold mb-2">Featured Story</span>
                {featured ? (
                  <>
                    <h2 className="text-2xl font-bold mb-3 sm:text-3xl">
                      <Link to={`/article/${featured.id}`} className="hover:text-[#194890] transition">
                        {featured.title}
                      </Link>
                    </h2>
                    <p className="text-[#6B7280] mb-4 line-clamp-3">{featured.excerpt}</p>
                    <div className="text-sm text-[#6B7280]">{featured.date}</div>
                    <Link
                      to={`/article/${featured.id}`}
                      className="mt-4 inline-flex w-fit items-center text-sm font-semibold text-[#194890] hover:underline"
                    >
                      Read full story
                    </Link>
                  </>
                ) : (
                  <p className="text-[#6B7280]">No featured story available for this category yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold">All {categoryTitle} articles</h2>
              <div className="flex gap-3">
                <select
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm"
                  aria-label="Sort articles"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>
            </div>

            {articles.length === 0 ? (
              <p className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-[#6B7280]">No published articles in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
                {articles.map((news) => (
                  <NewsCard
                    key={news.id}
                    id={news.id}
                    title={news.title}
                    category={news.category}
                    date={news.date}
                    excerpt={news.excerpt}
                    imageUrl={imageByPostId.get(news.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Search size={18} aria-hidden />
                  Search {categoryTitle}
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="search"
                    value={sidebarQuery}
                    onChange={(e) => setSidebarQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runSidebarSearch())}
                    placeholder="Search articles..."
                    className="w-full flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                    aria-label={`Search within ${categoryTitle}`}
                  />
                  <button
                    type="button"
                    onClick={runSidebarSearch}
                    className="shrink-0 rounded-lg bg-[#194890] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2656A8]"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={18} aria-hidden />
                  Trending in {categoryTitle}
                </h3>
                <div className="space-y-4">
                  {trending.map((news, idx) => (
                    <Link
                      key={news.id}
                      to={`/article/${news.id}`}
                      className="flex gap-3 pb-4 border-b border-[#E5E7EB] last:border-0 group"
                    >
                      <span className="text-xl font-bold text-[#E5E7EB]">{idx + 1}</span>
                      <div>
                        <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-[#194890] transition">{news.title}</h4>
                        <p className="text-xs text-[#6B7280] mt-1">{news.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <AdSlot placement="category-sidebar" fallbackSize="300x250" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
