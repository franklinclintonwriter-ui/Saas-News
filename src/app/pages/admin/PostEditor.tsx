import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft, Save, Eye, Upload, X, Image as ImageIcon, Quote, Heading2 } from 'lucide-react';
import { toast } from '../../lib/notify';
import { useCms } from '../../context/cms-context';
import { AiDraftAssistant } from '../../components/admin/AiDraftAssistant';
import { makeId, slugify, type AdminPost, type AdminUser, type AuthorProfile, type PostStatus } from '../../lib/admin/cms-state';
import { generatedPostImageDataUrl } from '../../lib/generated-post-image';

const PREVIEW_KEY_PREFIX = 'phulpur24_post_preview_';

function profileFromUser(user: AdminUser | undefined): AuthorProfile | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    location: user.location,
    websiteUrl: user.websiteUrl,
    twitterUrl: user.twitterUrl,
    linkedinUrl: user.linkedinUrl,
    facebookUrl: user.facebookUrl,
  };
}

function emptyPost(authorDefault: string, authorProfile: AuthorProfile | null): AdminPost {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: authorDefault,
    authorProfile,
    categorySlug: 'world',
    status: 'Draft',
    tags: [],
    featured: false,
    breaking: false,
    seoTitle: '',
    metaDescription: '',
    focusKeyword: '',
    canonicalUrl: '',
    featuredImageId: null,
    scheduledAt: null,
    readTime: '',
    views: 0,
    updatedAt: now,
    publishedAt: null,
  };
}

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useCms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blockInputRef = useRef<HTMLInputElement>(null);

  const authorDefaultUser = state.users[0];
  const authorDefault = authorDefaultUser?.name ?? 'Editor';
  const authorDefaultProfile = profileFromUser(authorDefaultUser);

  const existing = id ? state.posts.find((p) => p.id === id) : undefined;

  const [post, setPost] = useState<AdminPost>(() => existing ?? emptyPost(authorDefault, authorDefaultProfile));
  const [tagInput, setTagInput] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    if (!id) setPost(emptyPost(authorDefault, authorDefaultProfile));
  }, [id, authorDefault]);

  useEffect(() => {
    if (!id) return;
    const found = state.posts.find((p) => p.id === id);
    if (found) setPost(found);
    else {
      toast.error('Post not found.');
      navigate('/admin/posts', { replace: true });
    }
  }, [id, state.posts, navigate]);

  const handleTitle = (title: string) => {
    setPost((p) => ({
      ...p,
      title,
      slug: !p.slug || p.slug === slugify(p.title) ? slugify(title) : p.slug,
      seoTitle: p.seoTitle === p.title.slice(0, 58) || !p.seoTitle ? title.slice(0, 58) : p.seoTitle,
    }));
  };

  const saveDraft = useCallback(() => {
    if (!post.title.trim()) {
      toast.error('Add a title before saving.');
      return;
    }
    const next: AdminPost = {
      ...post,
      excerpt: post.excerpt || post.content.slice(0, 180),
      slug: post.slug.trim() ? post.slug.trim() : slugify(post.title),
      updatedAt: new Date().toISOString(),
      status: post.status === 'Published' ? post.status : 'Draft',
    };
    dispatch({ type: 'POST_UPSERT', post: next });
    setPost(next);
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    toast.success('Draft saved.');
    if (!id) navigate(`/admin/posts/edit/${next.id}`, { replace: true });
  }, [dispatch, id, navigate, post]);

  const openPreview = useCallback(() => {
    if (!post.title.trim()) {
      toast.error('Add a title before preview.');
      return;
    }
    const previewPost: AdminPost = {
      ...post,
      slug: post.slug.trim() ? post.slug.trim() : slugify(post.title),
      excerpt: post.excerpt || post.metaDescription || post.content.replace(/\s+/g, ' ').trim().slice(0, 200),
      updatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(`${PREVIEW_KEY_PREFIX}${previewPost.id}`, JSON.stringify(previewPost));
    window.open(`/admin/preview/post/${previewPost.id}`, '_blank', 'noopener,noreferrer');
  }, [post]);

  const publish = useCallback(() => {
    if (!post.title.trim() || !post.content.trim()) {
      toast.error('Add a title and body before publishing.');
      return;
    }
    const now = new Date().toISOString();
    const next: AdminPost = {
      ...post,
      slug: post.slug.trim() ? post.slug.trim() : slugify(post.title),
      excerpt: post.excerpt || post.content.slice(0, 200),
      status: 'Published',
      publishedAt: post.publishedAt ?? now,
      scheduledAt: null,
      views: post.views > 0 ? post.views : Math.max(post.views, 400),
      updatedAt: now,
    };
    dispatch({ type: 'POST_UPSERT', post: next });
    setPost(next);
    toast.success('Post published to workspace.');
    if (!id) navigate(`/admin/posts/edit/${next.id}`, { replace: true });
  }, [dispatch, id, navigate, post]);

  const seoTitleLen = post.seoTitle.length;
  const metaLen = post.metaDescription.length;

  const featuredImage = useMemo(
    () => state.media.find((m) => m.id === post.featuredImageId),
    [post.featuredImageId, state.media],
  );
  const selectedCategoryName = state.categories.find((category) => category.slug === post.categorySlug)?.name ?? 'News';
  const generatedPreviewImage = useMemo(
    () => generatedPostImageDataUrl(post.title || 'Untitled story', selectedCategoryName, post.id),
    [post.id, post.title, selectedCategoryName],
  );

  const onFeaturedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      const item = {
        id: makeId(),
        name: file.name,
        alt: post.title || file.name,
        url,
        mime: file.type,
        sizeBytes: file.size,
        width: 1200,
        height: 800,
        uploadedAt: new Date().toISOString(),
      };
      dispatch({ type: 'MEDIA_ADD', item });
      setPost((p) => ({ ...p, featuredImageId: item.id }));
      toast.success('Image added to library and set as featured.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertBlock = (kind: 'image' | 'quote' | 'heading') => {
    const input = blockInputRef.current;
    const addition =
      kind === 'image'
        ? '\n\n![Caption](image-url)\n\n'
        : kind === 'quote'
          ? '\n\n> Pull quote goes here — attribution\n\n'
          : '\n\n## Section heading\n\n';
    setPost((p) => ({ ...p, content: p.content + addition }));
    toast.message(`${kind === 'image' ? 'Image' : kind === 'quote' ? 'Quote' : 'Heading'} block inserted.`);
    input?.focus();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/posts" className="p-2 hover:bg-white rounded-lg transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>
            <p className="text-sm text-[#6B7280]">
              Draft{lastSaved ? ` • Last saved ${lastSaved}` : ' • Not saved yet'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={openPreview}
            className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-lg hover:bg-[#F3F4F6] transition text-sm"
          >
            <Eye size={18} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-lg hover:bg-[#F3F4F6] transition text-sm"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            type="button"
            onClick={publish}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition font-semibold text-sm"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <AiDraftAssistant post={post} setPost={setPost} />
          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <input
              type="text"
              value={post.title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="Enter post title..."
              className="w-full text-3xl font-bold mb-4 outline-none"
            />
            <input
              type="text"
              value={post.slug}
              onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value }))}
              placeholder="url-slug"
              className="w-full text-sm text-[#6B7280] mb-6 outline-none border-b border-[#E5E7EB] pb-2 font-mono"
            />
            <textarea
              value={post.content}
              onChange={(e) => setPost((p) => ({ ...p, content: e.target.value }))}
              placeholder="Start writing your article..."
              className="w-full min-h-[500px] outline-none resize-none text-lg leading-relaxed"
            />
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Content Blocks</h3>
            <input ref={blockInputRef} className="sr-only" tabIndex={-1} aria-hidden readOnly />
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => insertBlock('image')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-left"
              >
                <ImageIcon size={18} />
                <span>Add Image</span>
              </button>
              <button
                type="button"
                onClick={() => insertBlock('quote')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-left"
              >
                <Quote size={18} />
                <span>Add Quote</span>
              </button>
              <button
                type="button"
                onClick={() => insertBlock('heading')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-left"
              >
                <Heading2 size={18} />
                <span>Add Heading</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Publish</h3>
            <div className="space-y-3">
              <button type="button" onClick={saveDraft} className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm">
                Save Draft
              </button>
              <button type="button" onClick={openPreview} className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm">
                Preview
              </button>
              <button type="button" onClick={publish} className="w-full px-4 py-2 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition text-sm font-semibold">
                Publish Now
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={post.featured}
                  onChange={(e) => setPost((p) => ({ ...p, featured: e.target.checked }))}
                />
                <span>Featured Article</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={post.breaking}
                  onChange={(e) => setPost((p) => ({ ...p, breaking: e.target.checked }))}
                />
                <span>Breaking News</span>
              </label>
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1">Workflow status</label>
                <select
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                  value={post.status}
                  onChange={(e) => setPost((p) => ({ ...p, status: e.target.value as PostStatus }))}
                >
                  <option value="Draft">Draft</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Category</h3>
            <select
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
              value={post.categorySlug}
              onChange={(e) => setPost((p) => ({ ...p, categorySlug: e.target.value }))}
            >
              {state.categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag, idx) => (
                <span key={`${tag}-${idx}`} className="flex items-center gap-1 px-3 py-1 bg-[#F3F4F6] rounded-full text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setPost((p) => ({ ...p, tags: p.tags.filter((_, i) => i !== idx) }))}
                    className="hover:text-[#DC2626]"
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag…"
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  const t = slugify(tagInput);
                  if (!post.tags.includes(t)) setPost((p) => ({ ...p, tags: [...p.tags, t] }));
                  setTagInput('');
                }
              }}
            />
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Featured Image</h3>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFeaturedFile} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center hover:border-[#194890]/40 transition"
            >
              <Upload className="mx-auto mb-2 text-[#6B7280]" size={32} />
              <p className="text-sm text-[#6B7280] mb-2">Upload or replace featured image</p>
              <p className="text-xs text-[#9CA3AF]">PNG, JPG up to ~10MB (synced to the API media library)</p>
            </button>
            {featuredImage && (
              <div className="mt-4 rounded-lg border border-[#E5E7EB] overflow-hidden">
                <img src={featuredImage.url} alt={featuredImage.alt} className="w-full h-40 object-cover" />
                <p className="text-xs p-2 text-[#6B7280] truncate">{featuredImage.name}</p>
              </div>
            )}
            {!featuredImage && (
              <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E7EB]">
                <img src={generatedPreviewImage} alt="" className="h-40 w-full object-cover" />
                <p className="p-2 text-xs text-[#6B7280]">Auto image preview. The API saves this as the featured image when you publish.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">SEO Title</label>
                <input
                  type="text"
                  value={post.seoTitle}
                  onChange={(e) => setPost((p) => ({ ...p, seoTitle: e.target.value }))}
                  placeholder="Enter SEO title..."
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                />
                <p className="text-xs text-[#6B7280] mt-1">
                  {seoTitleLen}/60 characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Meta Description</label>
                <textarea
                  value={post.metaDescription}
                  onChange={(e) => setPost((p) => ({ ...p, metaDescription: e.target.value }))}
                  placeholder="Enter meta description..."
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm min-h-24"
                />
                <p className="text-xs text-[#6B7280] mt-1">{metaLen}/160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Focus Keyword</label>
                <input
                  type="text"
                  value={post.focusKeyword}
                  onChange={(e) => setPost((p) => ({ ...p, focusKeyword: e.target.value }))}
                  placeholder="e.g., artificial intelligence"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Canonical URL</label>
                <input
                  type="text"
                  value={post.canonicalUrl}
                  onChange={(e) => setPost((p) => ({ ...p, canonicalUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
            <h3 className="font-bold mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Author</label>
                <select
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                  value={post.author}
                  onChange={(e) => {
                    const selected = state.users.find((user) => user.name === e.target.value);
                    setPost((p) => ({ ...p, author: e.target.value, authorProfile: profileFromUser(selected) }));
                  }}
                >
                  {state.users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Schedule / publish time</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                  value={post.scheduledAt ? post.scheduledAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    setPost((p) => ({
                      ...p,
                      scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Reading Time</label>
                <input
                  type="text"
                  value={post.readTime}
                  onChange={(e) => setPost((p) => ({ ...p, readTime: e.target.value }))}
                  placeholder="e.g., 8 min"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
