import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { Clock, User, Facebook, Twitter, Linkedin, Mail, ChevronRight, Globe2, MapPin } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatRelative } from '../../lib/admin/cms-state';
import {
  approvedCommentsForPost,
  escapeHtml,
  extractTocFromMarkdown,
  popularListItems,
  resolveArticle,
} from '../../lib/public-content';
import { openExternal, shareTargets } from '../../lib/share-links';
import { toast } from '../../lib/notify';
import AdSlot from '../../components/public/AdSlot';

type CommentForm = {
  body: string;
  name: string;
  email: string;
};

function slugFromHeading(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*/);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx}>{escapeHtml(part)}</strong>
    ) : (
      <React.Fragment key={idx}>{escapeHtml(part)}</React.Fragment>
    ),
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function ArticleMarkdown({ content }: { content: string }) {
  const blocks = content
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="prose max-w-none">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          const label = block.slice(3).trim();
          const hid = slugFromHeading(label) || `section-${i}`;
          return (
            <h2 key={i} id={hid} className="text-2xl font-bold mt-8 mb-4 scroll-mt-24">
              {escapeHtml(label)}
            </h2>
          );
        }
        if (block.startsWith('>')) {
          const lines = block
            .split('\n')
            .map((l) => l.replace(/^>\s?/, '').trim())
            .join(' ');
          return (
            <div key={i} className="bg-[#F3F4F6] border-l-4 border-[#194890] p-6 my-8">
              <p className="text-lg italic">{renderInline(lines)}</p>
            </div>
          );
        }
        const lines = block.split('\n').filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^[-*]\s+/.test(l))) {
          const items = lines.map((l) => l.replace(/^[-*]\s+/, '').trim());
          return (
            <ul key={i} className="list-disc pl-6 mb-6 space-y-2 text-lg leading-relaxed">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-lg leading-relaxed mb-6">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams();
  const { state, dispatch } = useCms();
  const resolved = useMemo(() => resolveArticle(state, id), [state, id]);

  const article = resolved?.detail;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const share = useMemo(
    () => (article ? shareTargets(pageUrl, article.title) : shareTargets(pageUrl, state.settings.siteTitle || 'Publication')),
    [pageUrl, article, state.settings.siteTitle],
  );

  const toc = useMemo(() => (resolved?.body ? extractTocFromMarkdown(resolved.body) : []), [resolved?.body]);
  const approved = useMemo(
    () => (resolved?.detail?.id ? approvedCommentsForPost(state, resolved.detail.id) : []),
    [state, resolved?.detail?.id],
  );
  const popular = useMemo(() => popularListItems(state, 4), [state]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentForm>({ defaultValues: { body: '', name: '', email: '' } });

  const onComment = handleSubmit((values) => {
    if (!resolved?.detail?.id) return;
    dispatch({
      type: 'COMMENT_SUBMIT_PUBLIC',
      postId: resolved.detail.id,
      author: values.name,
      email: values.email,
      content: values.body,
    });
    toast.success('Comment submitted for moderation. It will appear after review.');
    reset();
  });

  if (!resolved || !article) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Article not found</h1>
          <p className="text-[#6B7280] mb-6">This URL does not match a published story from the Prisma API.</p>
          <Link to="/" className="inline-flex items-center justify-center rounded-lg bg-[#194890] px-6 py-2 font-semibold text-white hover:bg-[#2656A8]">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (resolved.source === 'cms' && resolved.post && !resolved.published) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <p className="text-sm font-semibold text-[#194890] mb-2">Editorial workspace</p>
          <h1 className="text-2xl font-bold mb-3 line-clamp-3">{resolved.post.title}</h1>
          <p className="text-[#6B7280] mb-6">
            This story is not published yet. Sign in to the admin console to continue editing or change its status to Published.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/" className="inline-flex rounded-lg border border-[#E5E7EB] px-5 py-2 font-semibold hover:bg-[#F3F4F6]">
              Home
            </Link>
            <Link
              to={`/admin/posts/edit/${resolved.post.id}`}
              className="inline-flex rounded-lg bg-[#194890] px-5 py-2 font-semibold text-white hover:bg-[#2656A8]"
            >
              Open in console
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const heroUrl = resolved.heroUrl;
  const authorProfile =
    resolved.post?.authorProfile ??
    state.users.find((user) => user.name === article.author) ??
    null;
  const authorName = authorProfile?.name || article.author;
  const authorTitle = authorProfile?.title || 'Staff reporter';
  const authorBio =
    authorProfile?.bio ||
    `Staff reporter for ${state.settings.siteTitle}. Coverage focuses on verification, primary sources, and clear context for readers.`;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B7280] mb-6">
          <Link to="/" className="hover:text-[#194890]">
            Home
          </Link>
          <ChevronRight size={16} aria-hidden />
          <Link to={`/category/${article.categorySlug}`} className="hover:text-[#194890]">
            {article.categoryLabel}
          </Link>
          <ChevronRight size={16} aria-hidden />
          <span className="line-clamp-1 text-neutral-700">{article.title}</span>
        </div>
      </div>

      <div className="bg-[#F3F4F6] py-6 md:py-8">
        <div className="max-w-[1440px] mx-auto px-4">
          <span className="inline-block bg-[#194890] text-white px-3 py-1 text-sm rounded mb-4">{article.categoryLabel}</span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-4xl">{article.title}</h1>
          <p className="text-base md:text-xl text-[#6B7280] mb-6 max-w-3xl">{article.dek}</p>
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} aria-hidden />
              <span>{authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} aria-hidden />
              <span>{article.dateLabel}</span>
            </div>
            <span className="text-[#6B7280]">{article.readTime}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-8 md:py-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12">
          <div className="lg:col-span-3">
            <div className="w-full h-[320px] md:h-[480px] bg-[#E5E7EB] rounded-lg mb-8 overflow-hidden" role="img" aria-label="Article hero">
              {heroUrl ? (
                <img src={heroUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            {toc.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-lg p-6 mb-8">
                <h2 className="font-bold mb-3">Table of Contents</h2>
                <ul className="space-y-2 text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-[#194890] hover:underline">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ArticleMarkdown content={resolved.body} />

            <div className="bg-[#F3F4F6] rounded-lg p-6 mt-12">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-[#E8EEF8] text-[#194890] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-bold" aria-hidden>
                  {authorProfile?.avatarUrl ? (
                    <img src={authorProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(authorName)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold mb-1">{authorName}</h3>
                  <p className="text-sm font-semibold text-[#194890] mb-2">{authorTitle}</p>
                  {authorProfile?.location ? (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <MapPin size={14} aria-hidden />
                      {authorProfile.location}
                    </p>
                  ) : null}
                  <p className="text-sm text-[#6B7280] mb-3">{authorBio}</p>
                  <div className="flex gap-3">
                    {authorProfile?.websiteUrl ? (
                      <a
                        href={authorProfile.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6B7280] hover:text-[#194890]"
                        aria-label={`${authorName} website`}
                      >
                        <Globe2 size={18} />
                      </a>
                    ) : null}
                    {authorProfile?.linkedinUrl ? (
                      <a
                        href={authorProfile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6B7280] hover:text-[#194890]"
                        aria-label={`${authorName} on LinkedIn`}
                      >
                        <Linkedin size={18} />
                      </a>
                    ) : null}
                    {authorProfile?.twitterUrl ? (
                      <a
                        href={authorProfile.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6B7280] hover:text-[#194890]"
                        aria-label={`${authorName} on X`}
                      >
                        <Twitter size={18} />
                      </a>
                    ) : null}
                    {authorProfile?.facebookUrl ? (
                      <a
                        href={authorProfile.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6B7280] hover:text-[#194890]"
                        aria-label={`${authorName} on Facebook`}
                      >
                        <Facebook size={18} />
                      </a>
                    ) : null}
                    <a href={`mailto:${authorProfile?.email || state.settings.contactEmail}`} className="text-[#6B7280] hover:text-[#194890]" aria-label={`Email ${authorName}`}>
                      <Mail size={18} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {article.related.length > 0 && (
              <div className="mt-8 md:mt-12">
                <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Related Articles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {article.related.map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/article/${rel.id}`}
                      className="border border-[#E5E7EB] rounded-lg overflow-hidden hover:shadow-md transition block"
                    >
                      <div className="h-40 bg-[#E5E7EB] overflow-hidden" aria-hidden>
                        {rel.imageUrl ? <img src={rel.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="p-4">
                        <span className="text-xs text-[#194890] font-semibold">{rel.category}</span>
                        <h4 className="font-semibold mt-2 mb-2 line-clamp-2">{rel.title}</h4>
                        <p className="text-xs text-[#6B7280]">{rel.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 md:mt-12 bg-[#F3F4F6] rounded-lg p-4 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-4">Comments</h3>
              <form className="mb-6" onSubmit={onComment} noValidate>
                <label htmlFor="comment-body" className="sr-only">
                  Comment
                </label>
                <textarea
                  id="comment-body"
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg mb-3 min-h-32 bg-white"
                  aria-invalid={errors.body ? 'true' : 'false'}
                  {...register('body', { required: 'Please enter a comment.', minLength: { value: 10, message: 'Comment should be at least 10 characters.' } })}
                />
                {errors.body && <p className="text-sm text-red-600 mb-2">{errors.body.message}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label htmlFor="comment-name" className="sr-only">
                      Name
                    </label>
                    <input
                      id="comment-name"
                      type="text"
                      placeholder="Name"
                      className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                      {...register('name', { required: 'Name is required.' })}
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="comment-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="comment-email"
                      type="email"
                      placeholder="Email"
                      className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
                      {...register('email', {
                        required: 'Email is required.',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' },
                      })}
                    />
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-[#194890] text-white px-6 py-2 rounded-lg hover:bg-[#2656A8] transition font-semibold"
                >
                  Post Comment
                </button>
              </form>

              <div className="space-y-6 mt-8">
                {approved.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No approved comments yet. Be the first to join the conversation.</p>
                ) : (
                  approved.map((c) => (
                    <div key={c.id} className="bg-white rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-[#E5E7EB] rounded-full flex-shrink-0" aria-hidden />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <h4 className="font-semibold">{c.author}</h4>
                            <span className="text-xs text-[#6B7280] shrink-0">{formatRelative(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-[#F3F4F6] rounded-lg p-4">
                <h4 className="font-bold mb-4">Share Article</h4>
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 bg-white px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition text-left"
                    onClick={() => openExternal(share.facebook)}
                  >
                    <Facebook size={18} aria-hidden />
                    <span className="text-sm">Facebook</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 bg-white px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition text-left"
                    onClick={() => openExternal(share.twitter)}
                  >
                    <Twitter size={18} aria-hidden />
                    <span className="text-sm">Twitter / X</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 bg-white px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition text-left"
                    onClick={() => openExternal(share.linkedin)}
                  >
                    <Linkedin size={18} aria-hidden />
                    <span className="text-sm">LinkedIn</span>
                  </button>
                  <a href={share.email} className="w-full flex items-center gap-3 bg-white px-4 py-2 rounded-lg hover:bg-[#E5E7EB] transition">
                    <Mail size={18} aria-hidden />
                    <span className="text-sm">Email</span>
                  </a>
                </div>
              </div>

              <div className="bg-[#F3F4F6] rounded-lg p-4">
                <h4 className="font-bold mb-4">Popular Posts</h4>
                <div className="space-y-4">
                  {popular.map((row, i) => (
                    <Link key={row.id} to={`/article/${row.id}`} className="flex gap-3 group">
                      <span className="text-2xl font-bold text-[#E5E7EB]">{i + 1}</span>
                      <div>
                        <h5 className="text-sm font-semibold line-clamp-2 group-hover:text-[#194890] transition">{row.title}</h5>
                        <p className="text-xs text-[#6B7280] mt-1">{row.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <AdSlot placement="article-sidebar" fallbackSize="300x600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
