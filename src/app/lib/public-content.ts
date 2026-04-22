import type { ArticleDetail, ArticleListItem } from './content/article-catalog';
import type { AdminComment, AdminPost, CmsState } from './admin/cms-state';
import { formatRelative } from './admin/cms-state';
import { generatedPostImageDataUrl } from './generated-post-image';

export function publishedPosts(posts: AdminPost[]): AdminPost[] {
  return posts.filter((p) => p.status === 'Published');
}

export function categoryLabelForSlug(state: CmsState, slug: string): string {
  return state.categories.find((c) => c.slug === slug)?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function imageUrlForPost(state: CmsState, post: AdminPost): string {
  const categoryName = categoryLabelForSlug(state, post.categorySlug);
  return post.featuredImageId
    ? state.media.find((m) => m.id === post.featuredImageId)?.url ?? generatedPostImageDataUrl(post.title, categoryName, post.id)
    : generatedPostImageDataUrl(post.title, categoryName, post.id);
}

export function adminPostToListItem(state: CmsState, post: AdminPost): ArticleListItem {
  return {
    id: post.id,
    title: post.title,
    category: categoryLabelForSlug(state, post.categorySlug),
    categorySlug: post.categorySlug,
    date: formatRelative(post.updatedAt),
    excerpt: post.excerpt || post.content.replace(/\s+/g, ' ').trim().slice(0, 180),
    keywords: post.tags.join(' '),
  };
}

export function allPublicListItems(state: CmsState): ArticleListItem[] {
  return publishedPosts(state.posts).map((p) => adminPostToListItem(state, p));
}

export function searchPublicArticles(
  state: CmsState,
  query: string,
  category: 'all' | string,
  sort: 'relevance' | 'recent' | 'popular',
): ArticleListItem[] {
  let list = allPublicListItems(state);
  if (category && category !== 'all') {
    list = list.filter((a) => a.categorySlug === category || a.category.toLowerCase() === category.toLowerCase());
  }
  const q = query.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  if (words.length) {
    list = list.filter((a) => {
      const hay = `${a.title} ${a.excerpt} ${a.keywords} ${a.category}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  if (sort === 'recent') {
    const order = new Map(publishedPosts(state.posts).map((p) => [p.id, new Date(p.updatedAt).getTime()]));
    list = [...list].sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0));
  }
  if (sort === 'popular') {
    const views = new Map(state.posts.map((p) => [p.id, p.views]));
    list = [...list].sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0));
  }
  return list;
}

export function filterPublicByCategory(state: CmsState, slug: string | undefined): ArticleListItem[] {
  if (!slug) return allPublicListItems(state);
  const s = slug.toLowerCase();
  return allPublicListItems(state).filter((a) => a.categorySlug === s);
}

export function popularListItems(state: CmsState, limit: number): ArticleListItem[] {
  return [...publishedPosts(state.posts)]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((p) => adminPostToListItem(state, p));
}

export type ResolvedArticle = {
  source: 'cms';
  post?: AdminPost;
  detail: ArticleDetail;
  body: string;
  heroUrl: string | null;
  published: boolean;
};

export function resolveArticle(state: CmsState, id: string | undefined): ResolvedArticle | null {
  const pid = id || '';
  const post = state.posts.find((p) => p.id === pid || p.slug === pid);
  if (post) {
    const published = post.status === 'Published';
    const catName = categoryLabelForSlug(state, post.categorySlug);
    const hero = imageUrlForPost(state, post);
    const related = publishedPosts(state.posts)
      .filter((p) => p.id !== post.id && p.categorySlug === post.categorySlug)
      .sort((a, b) => b.views - a.views)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: categoryLabelForSlug(state, p.categorySlug),
        date: formatRelative(p.updatedAt),
        imageUrl: imageUrlForPost(state, p),
      }));
    const detail: ArticleDetail = {
      id: post.id,
      categorySlug: post.categorySlug,
      categoryLabel: catName,
      title: post.title,
      dek: post.excerpt || post.content.split('\n').find((l) => l.trim())?.trim() || '',
      author: post.author,
      dateLabel: formatRelative(post.updatedAt),
      readTime: post.readTime || '5 min read',
      related,
    };
    return {
      source: 'cms',
      post,
      detail,
      body: post.content,
      heroUrl: hero,
      published,
    };
  }
  return null;
}

export function approvedCommentsForPost(state: CmsState, postId: string): AdminComment[] {
  return state.comments.filter((c) => c.postId === postId && c.status === 'approved');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type TocItem = { id: string; label: string };

export function extractTocFromMarkdown(content: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /^##\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const label = m[1]!.trim();
    const id = label
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    if (id) items.push({ id, label });
  }
  return items;
}
