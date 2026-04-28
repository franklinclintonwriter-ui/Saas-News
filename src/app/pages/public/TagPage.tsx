import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Tag as TagIcon } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { adminPostToListItem, imageUrlForPost, publishedPosts } from '../../lib/public-content';
import NewsCard from '../../components/public/NewsCard';

const PAGE_SIZE = 9;

export default function TagPage() {
  const { slug } = useParams();
  const { state } = useCms();
  const [page, setPage] = useState(1);

  const tag = useMemo(
    () => state.tags.find((t) => t.slug === slug) ?? null,
    [state.tags, slug],
  );

  const published = useMemo(() => publishedPosts(state.posts), [state.posts]);

  const tagPosts = useMemo(() => {
    if (!slug) return [];
    return published
      .filter((p) => p.tags.includes(slug))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((p) => adminPostToListItem(state, p));
  }, [slug, published, state]);

  const imageByPostId = useMemo(() => {
    return new Map(published.map((p) => [p.id, imageUrlForPost(state, p)]));
  }, [published, state]);

  const totalPages = Math.max(1, Math.ceil(tagPosts.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = tagPosts.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const tagLabel = tag?.name ?? slug?.replace(/-/g, ' ') ?? 'Tag';

  if (!tag && tagPosts.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F3F4F6] px-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Tag not found</h1>
          <p className="mb-6 text-[#6B7280]">No articles have been tagged with "{slug}".</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#194890] px-6 py-2 font-semibold text-white hover:bg-[#2656A8]"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      {/* Tag header */}
      <div className="bg-[#194890] text-white py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <TagIcon size={20} aria-hidden />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wide opacity-80">Topic</span>
          </div>
          <h1 className="text-3xl font-bold capitalize md:text-4xl lg:text-5xl">{tagLabel}</h1>
          <p className="mt-2 text-base opacity-90 md:text-lg">
            {tagPosts.length} article{tagPosts.length !== 1 ? 's' : ''} tagged with "{tagLabel}"
          </p>
        </div>
      </div>

      {/* Articles grid */}
      <div className="max-w-[1440px] mx-auto px-4 py-10 md:py-14">
        {slice.length === 0 ? (
          <p className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-[#6B7280]">
            No published articles with this tag yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {slice.map((item) => (
              <NewsCard
                key={item.id}
                id={item.id}
                title={item.title}
                category={item.category}
                date={item.date}
                excerpt={item.excerpt}
                imageUrl={imageByPostId.get(item.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F3F4F6] transition disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden />
              Previous
            </button>
            <span className="text-sm text-[#6B7280]">
              Page {pageSafe} of {totalPages}
            </span>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F3F4F6] transition disabled:opacity-40"
            >
              Next
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
