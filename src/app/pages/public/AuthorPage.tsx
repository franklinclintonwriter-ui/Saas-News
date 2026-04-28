import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Globe2, Twitter, Linkedin, Facebook, Mail, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { adminPostToListItem, imageUrlForPost, publishedPosts } from '../../lib/public-content';
import NewsCard from '../../components/public/NewsCard';

const PAGE_SIZE = 9;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export default function AuthorPage() {
  const { id } = useParams();
  const { state } = useCms();
  const [page, setPage] = useState(1);

  // Resolve author by id or by name-slug.
  const author = useMemo(() => {
    if (!id) return null;
    return (
      state.users.find((u) => u.id === id) ??
      state.users.find((u) => u.name.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase()) ??
      null
    );
  }, [state.users, id]);

  const published = useMemo(() => publishedPosts(state.posts), [state.posts]);

  const authorPosts = useMemo(() => {
    if (!author) return [];
    return published
      .filter(
        (p) =>
          p.authorProfile?.id === author.id ||
          p.authorProfile?.email?.toLowerCase() === author.email.toLowerCase() ||
          p.author.trim().toLowerCase() === author.name.trim().toLowerCase(),
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((p) => adminPostToListItem(state, p));
  }, [author, published, state]);

  const imageByPostId = useMemo(() => {
    return new Map(published.map((p) => [p.id, imageUrlForPost(state, p)]));
  }, [published, state]);

  const totalPages = Math.max(1, Math.ceil(authorPosts.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = authorPosts.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  if (!author) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F3F4F6] px-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Author not found</h1>
          <p className="mb-6 text-[#6B7280]">This author profile does not exist.</p>
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
      {/* Author header */}
      <div className="bg-[#194890] text-white py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white overflow-hidden"
              aria-hidden
            >
              {author.avatarUrl ? (
                <img
                  src={author.avatarUrl}
                  alt={`${author.name} avatar`}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(author.name)
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold md:text-4xl">{author.name}</h1>
              {author.title && <p className="mt-1 text-lg opacity-90">{author.title}</p>}
              {author.location && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm opacity-80 md:justify-start">
                  <MapPin size={14} aria-hidden />
                  {author.location}
                </p>
              )}
              {author.bio && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-90">{author.bio}</p>
              )}
              <div className="mt-4 flex items-center justify-center gap-4 md:justify-start">
                {author.websiteUrl && (
                  <a
                    href={author.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${author.name} website`}
                    className="opacity-80 hover:opacity-100 transition"
                  >
                    <Globe2 size={20} />
                  </a>
                )}
                {author.twitterUrl && (
                  <a
                    href={author.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${author.name} on X`}
                    className="opacity-80 hover:opacity-100 transition"
                  >
                    <Twitter size={20} />
                  </a>
                )}
                {author.linkedinUrl && (
                  <a
                    href={author.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${author.name} on LinkedIn`}
                    className="opacity-80 hover:opacity-100 transition"
                  >
                    <Linkedin size={20} />
                  </a>
                )}
                {author.facebookUrl && (
                  <a
                    href={author.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${author.name} on Facebook`}
                    className="opacity-80 hover:opacity-100 transition"
                  >
                    <Facebook size={20} />
                  </a>
                )}
                {author.email && (
                  <a
                    href={`mailto:${author.email}`}
                    aria-label={`Email ${author.name}`}
                    className="opacity-80 hover:opacity-100 transition"
                  >
                    <Mail size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Articles grid */}
      <div className="max-w-[1440px] mx-auto px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl">
            Articles by {author.name}{' '}
            <span className="text-base font-normal text-[#6B7280]">({authorPosts.length})</span>
          </h2>
        </div>

        {slice.length === 0 ? (
          <p className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-[#6B7280]">
            No published articles by this author yet.
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
