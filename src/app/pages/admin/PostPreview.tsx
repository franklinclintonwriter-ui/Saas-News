import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Clock, Edit, User } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { categoryLabelForSlug, escapeHtml } from '../../lib/public-content';
import { formatRelative, type AdminPost } from '../../lib/admin/cms-state';
import { generatedPostImageDataUrl } from '../../lib/generated-post-image';

const PREVIEW_KEY_PREFIX = 'phulpur24_post_preview_';

function readPreviewDraft(id: string | undefined): AdminPost | null {
  if (!id || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${PREVIEW_KEY_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminPost;
    return parsed?.id === id ? parsed : null;
  } catch {
    return null;
  }
}

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

function ArticleMarkdown({ content }: { content: string }) {
  const blocks = content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="prose max-w-none">
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) {
          const label = block.slice(3).trim();
          return (
            <h2 key={index} id={slugFromHeading(label)} className="mt-8 mb-4 scroll-mt-24 text-2xl font-bold">
              {escapeHtml(label)}
            </h2>
          );
        }
        if (block.startsWith('>')) {
          const lines = block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, '').trim())
            .join(' ');
          return (
            <div key={index} className="my-8 border-l-4 border-[#194890] bg-[#F3F4F6] p-6">
              <p className="text-lg italic">{renderInline(lines)}</p>
            </div>
          );
        }
        const lines = block.split('\n').filter((line) => line.trim());
        if (lines.length && lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="mb-6 list-disc space-y-2 pl-6 text-lg leading-relaxed">
              {lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInline(line.replace(/^[-*]\s+/, '').trim())}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="mb-6 text-lg leading-relaxed">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

export default function PostPreview() {
  const { id } = useParams();
  const { state } = useCms();
  const sessionDraft = useMemo(() => readPreviewDraft(id), [id]);
  const storedPost = state.posts.find((post) => post.id === id);
  const post = sessionDraft ?? storedPost;

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Preview not available</h1>
          <p className="mb-6 text-[#6B7280]">Save the post or open preview again from the editor.</p>
          <Link to="/admin/posts" className="inline-flex rounded-lg bg-[#194890] px-5 py-2 font-semibold text-white">
            Back to posts
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabel = categoryLabelForSlug(state, post.categorySlug);
  const featuredImage = post.featuredImageId ? state.media.find((media) => media.id === post.featuredImageId) : null;
  const heroUrl = featuredImage?.url || generatedPostImageDataUrl(post.title || 'Untitled story', categoryLabel, post.id);
  const author = post.authorProfile?.name || post.author || 'Editor';

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={storedPost ? `/admin/posts/edit/${post.id}` : '/admin/posts/new'} className="rounded-lg border border-[#E5E7EB] p-2 hover:bg-[#F3F4F6]" aria-label="Back to editor">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#194890]">Admin preview</p>
              <p className="text-sm text-[#6B7280]">Status: {post.status}</p>
            </div>
          </div>
          <Link to={storedPost ? `/admin/posts/edit/${post.id}` : '/admin/posts/new'} className="inline-flex items-center gap-2 rounded-lg bg-[#194890] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2656A8]">
            <Edit size={16} />
            Edit post
          </Link>
        </div>
      </div>

      <div className="bg-[#F3F4F6] py-8">
        <div className="mx-auto max-w-[1440px] px-4">
          <span className="mb-4 inline-block rounded bg-[#194890] px-3 py-1 text-sm text-white">{categoryLabel}</span>
          <h1 className="mb-4 max-w-4xl text-3xl font-bold md:text-5xl">{post.title || 'Untitled story'}</h1>
          <p className="mb-6 max-w-3xl text-base text-[#6B7280] md:text-xl">{post.excerpt || post.metaDescription || 'Preview excerpt will appear here.'}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm md:gap-6">
            <span className="flex items-center gap-2">
              <User size={16} />
              {author}
            </span>
            <span className="flex items-center gap-2">
              <Clock size={16} />
              {post.publishedAt ? formatRelative(post.publishedAt) : 'Not published yet'}
            </span>
            <span className="text-[#6B7280]">{post.readTime || '5 min read'}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 h-[320px] w-full overflow-hidden rounded-lg bg-[#E5E7EB] md:h-[480px]">
            <img src={heroUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <ArticleMarkdown content={post.content || 'Start writing your article body to preview it here.'} />
        </div>
      </main>
    </div>
  );
}

export { PREVIEW_KEY_PREFIX };
