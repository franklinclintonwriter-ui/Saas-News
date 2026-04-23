import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Clock, Edit, User } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { useAuth } from '../../context/auth-context';
import { ArticleMarkdown } from '../../components/articles/ArticleMarkdown';
import { categoryLabelForSlug } from '../../lib/public-content';
import { formatRelative, type AdminPost } from '../../lib/admin/cms-state';
import { fetchAdminPostDetail, isExpiredAuthError } from '../../lib/api-cms';
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

export default function PostPreview() {
  const { id } = useParams();
  const { state, dispatch } = useCms();
  const { accessToken, refreshSession, signOut } = useAuth();
  const [remotePost, setRemotePost] = useState<AdminPost | null>(null);
  const [detailFailed, setDetailFailed] = useState(false);
  const sessionDraft = useMemo(() => readPreviewDraft(id), [id]);
  const storedPost = state.posts.find((post) => post.id === id);
  const post = sessionDraft ?? remotePost ?? storedPost;

  const loadPostDetail = useCallback(
    async (postId: string): Promise<AdminPost> => {
      let token = accessToken;
      if (!token) throw new Error('Sign in to load this preview.');
      try {
        return await fetchAdminPostDetail(postId, token);
      } catch (error) {
        if (!isExpiredAuthError(error)) throw error;
        token = await refreshSession();
        if (!token) {
          signOut();
          throw new Error('Session expired. Please sign in again.');
        }
        return fetchAdminPostDetail(postId, token);
      }
    },
    [accessToken, refreshSession, signOut],
  );

  useEffect(() => {
    if (!id || !accessToken || sessionDraft) return;
    if (storedPost?.content.trim()) return;

    let cancelled = false;
    setDetailFailed(false);
    void loadPostDetail(id)
      .then((fullPost) => {
        if (cancelled) return;
        setRemotePost(fullPost);
        dispatch({ type: 'POST_DETAIL_HYDRATE', post: fullPost });
      })
      .catch(() => {
        if (!cancelled) {
          setRemotePost(null);
          setDetailFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch, id, loadPostDetail, sessionDraft, storedPost]);

  if (!post && id && accessToken && !detailFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Loading preview...</h1>
          <p className="mb-6 text-[#6B7280]">Fetching the full article body.</p>
        </div>
      </div>
    );
  }

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
          <ArticleMarkdown content={post.content || 'Start writing your article body to preview it here.'} variant="admin" />
        </div>
      </main>
    </div>
  );
}

export { PREVIEW_KEY_PREFIX };
