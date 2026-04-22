import type {
  AdminCategory,
  AdminComment,
  AdminMedia,
  AdminPost,
  AdminTag,
  AdminUser,
  AdPlacement,
  AnalyticsSnapshot,
  AuditEntry,
  CmsAction,
  CmsState,
  ContactMessage,
  NavigationItem,
  NewsletterSubscriber,
  PostStatus,
  SiteSettings,
  StaticPage,
  UserRole,
  UserStatus,
} from './admin/cms-state';
import { createEmptyCmsState } from './admin/cms-state';
import { apiRequest, apiRequestWithMeta } from './api-client';

type ApiCategory = AdminCategory & { _count?: { posts: number }; createdAt?: string; updatedAt?: string };
type ApiTag = AdminTag & { _count?: { posts: number }; createdAt?: string; updatedAt?: string };
type ApiMedia = AdminMedia & { uploaderId?: string | null };
type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};
type ApiComment = {
  id: string;
  postId: string;
  author: string;
  email: string;
  content: string;
  status: string;
  createdAt: string;
};
type ApiAudit = {
  id: string;
  at: string;
  actorEmail: string;
  action: string;
  resource: string;
  detail?: string | null;
};
type ApiStaticPage = StaticPage;
type ApiContactMessage = ContactMessage;
type ApiNewsletterSubscriber = NewsletterSubscriber;
type ApiAdPlacement = AdPlacement;
type ApiNavigationItem = NavigationItem;
type ApiAnalyticsSnapshot = AnalyticsSnapshot;
type ApiPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  featured: boolean;
  breaking: boolean;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  featuredImageId: string | null;
  scheduledAt: string | null;
  readTime: string;
  views: number;
  updatedAt: string;
  publishedAt: string | null;
  author?: {
    id: string;
    name: string;
    email: string;
    role: string;
    title?: string;
    bio?: string;
    avatarUrl?: string;
    location?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
  };
  category?: ApiCategory;
  featuredImage?: ApiMedia | null;
  tags?: ApiTag[];
  comments?: ApiComment[];
};

const roleToUi: Record<string, UserRole> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
  CONTRIBUTOR: 'Contributor',
};

const roleToApi: Record<UserRole, string> = {
  Admin: 'ADMIN',
  Editor: 'EDITOR',
  Author: 'AUTHOR',
  Contributor: 'CONTRIBUTOR',
};

const statusToUi: Record<string, PostStatus> = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
};

const statusToApi: Record<PostStatus, string> = {
  Published: 'PUBLISHED',
  Draft: 'DRAFT',
  Scheduled: 'SCHEDULED',
};

const userStatusToUi: Record<string, UserStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
};

const userStatusToApi: Record<UserStatus, string> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  pending: 'PENDING',
};

const commentStatusToUi: Record<string, AdminComment['status']> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  SPAM: 'spam',
};

const commentStatusToApi: Record<AdminComment['status'], string> = {
  approved: 'APPROVED',
  pending: 'PENDING',
  spam: 'SPAM',
};

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function mapApiPost(post: ApiPost): AdminPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    author: post.author?.name ?? 'Editor',
    authorProfile: post.author
      ? {
          id: post.author.id,
          name: post.author.name,
          email: post.author.email,
          title: post.author.title ?? '',
          bio: post.author.bio ?? '',
          avatarUrl: post.author.avatarUrl ?? '',
          location: post.author.location ?? '',
          websiteUrl: post.author.websiteUrl ?? '',
          twitterUrl: post.author.twitterUrl ?? '',
          linkedinUrl: post.author.linkedinUrl ?? '',
          facebookUrl: post.author.facebookUrl ?? '',
        }
      : null,
    categorySlug: post.category?.slug ?? 'world',
    status: statusToUi[post.status] ?? 'Draft',
    tags: post.tags?.map((tag) => tag.slug) ?? [],
    featured: post.featured,
    breaking: post.breaking,
    seoTitle: post.seoTitle,
    metaDescription: post.metaDescription,
    focusKeyword: post.focusKeyword,
    canonicalUrl: post.canonicalUrl,
    featuredImageId: post.featuredImageId ?? post.featuredImage?.id ?? null,
    scheduledAt: iso(post.scheduledAt),
    readTime: post.readTime,
    views: post.views,
    updatedAt: iso(post.updatedAt) ?? new Date().toISOString(),
    publishedAt: iso(post.publishedAt),
  };
}

function mapApiMedia(media: ApiMedia): AdminMedia {
  return {
    id: media.id,
    name: media.name,
    alt: media.alt,
    url: media.url,
    mime: media.mime,
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    uploadedAt: iso(media.uploadedAt) ?? new Date().toISOString(),
  };
}

function mapApiUser(user: ApiUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleToUi[user.role] ?? 'Author',
    status: userStatusToUi[user.status] ?? 'active',
    title: user.title ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    location: user.location ?? '',
    websiteUrl: user.websiteUrl ?? '',
    twitterUrl: user.twitterUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    facebookUrl: user.facebookUrl ?? '',
    joinedAt: iso(user.createdAt) ?? new Date().toISOString(),
  };
}

function mapApiComment(comment: ApiComment): AdminComment {
  return {
    id: comment.id,
    postId: comment.postId,
    author: comment.author,
    email: comment.email,
    content: comment.content,
    status: commentStatusToUi[comment.status] ?? 'pending',
    createdAt: iso(comment.createdAt) ?? new Date().toISOString(),
  };
}

function mapApiAudit(row: ApiAudit): AuditEntry {
  return {
    id: row.id,
    at: iso(row.at) ?? new Date().toISOString(),
    actor: row.actorEmail,
    action: row.action,
    resource: row.resource,
    detail: row.detail ?? undefined,
  };
}

function postPayload(post: AdminPost) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: statusToApi[post.status],
    featured: post.featured,
    breaking: post.breaking,
    seoTitle: post.seoTitle,
    metaDescription: post.metaDescription,
    focusKeyword: post.focusKeyword,
    canonicalUrl: post.canonicalUrl,
    readTime: post.readTime,
    views: post.views,
    scheduledAt: post.scheduledAt,
    publishedAt: post.publishedAt,
    authorId: post.authorProfile?.id,
    categorySlug: post.categorySlug,
    featuredImageId: post.featuredImageId,
    tagSlugs: post.tags,
  };
}

function settingsPayload(settings: SiteSettings): SiteSettings {
  return settings;
}

export async function fetchCmsState(token?: string | null): Promise<CmsState> {
  const defaults = createEmptyCmsState();
  const [settings, categories, tags, publicPosts, pages, ads, navigation] = await Promise.all([
    apiRequest<SiteSettings>('/public/settings'),
    apiRequest<ApiCategory[]>('/public/categories'),
    apiRequest<ApiTag[]>('/public/tags'),
    apiRequest<ApiPost[]>('/public/posts?limit=100'),
    apiRequest<ApiStaticPage[]>('/public/pages').catch(() => []),
    apiRequest<ApiAdPlacement[]>('/public/ads').catch(() => []),
    apiRequest<ApiNavigationItem[]>('/public/navigation').catch(() => []),
  ]);

  if (!token) {
    const media = uniqueById(publicPosts.flatMap((post) => (post.featuredImage ? [mapApiMedia(post.featuredImage)] : [])));
    return {
      ...defaults,
      settings: { ...defaults.settings, ...settings },
      categories: categories.map(({ _count, createdAt, updatedAt, ...category }) => category),
      tags: tags.map(({ _count, createdAt, updatedAt, ...tag }) => tag),
      posts: publicPosts.map(mapApiPost),
      media,
      comments: publicPosts.flatMap((post) => post.comments?.map(mapApiComment) ?? []),
      users: defaults.users,
      auditLog: [],
      pages: pages.map((page) => ({
        ...page,
        createdAt: iso(page.createdAt) ?? new Date().toISOString(),
        updatedAt: iso(page.updatedAt) ?? new Date().toISOString(),
      })),
      contactMessages: [],
      newsletterSubscribers: [],
      ads,
      navigation,
      analyticsSnapshots: [],
    };
  }

  const [adminPosts, adminCategories, adminTags, media, comments, users, adminSettings, audit, adminPages, contactMessages, newsletterSubscribers, adminAds, adminNavigation, analyticsSnapshots] = await Promise.all([
    apiRequestWithMeta<ApiPost[]>('/admin/posts?limit=100', { token }).then((r) => r.data),
    apiRequest<ApiCategory[]>('/admin/categories', { token }),
    apiRequest<ApiTag[]>('/admin/tags', { token }),
    apiRequest<ApiMedia[]>('/admin/media', { token }),
    apiRequestWithMeta<ApiComment[]>('/admin/comments?limit=100', { token }).then((r) => r.data),
    apiRequest<ApiUser[]>('/admin/users', { token }).catch(() => []),
    apiRequest<SiteSettings>('/admin/settings', { token }).catch(() => settings),
    apiRequestWithMeta<ApiAudit[]>('/admin/audit-log?limit=100', { token }).then((r) => r.data).catch(() => []),
    apiRequest<ApiStaticPage[]>('/admin/pages', { token }).catch(() => pages),
    apiRequestWithMeta<ApiContactMessage[]>('/admin/contact-messages?limit=100', { token }).then((r) => r.data).catch(() => []),
    apiRequestWithMeta<ApiNewsletterSubscriber[]>('/admin/newsletter/subscribers?limit=100', { token }).then((r) => r.data).catch(() => []),
    apiRequest<ApiAdPlacement[]>('/admin/ads', { token }).catch(() => ads),
    apiRequest<ApiNavigationItem[]>('/admin/navigation', { token }).catch(() => navigation),
    apiRequest<ApiAnalyticsSnapshot[]>('/admin/analytics/snapshots', { token }).catch(() => []),
  ]);

  return {
    ...defaults,
    settings: { ...defaults.settings, ...adminSettings },
    categories: adminCategories.map(({ _count, createdAt, updatedAt, ...category }) => category),
    tags: adminTags.map(({ _count, createdAt, updatedAt, ...tag }) => tag),
    posts: adminPosts.map(mapApiPost),
    media: media.map(mapApiMedia),
    comments: comments.map(mapApiComment),
    users: users.map(mapApiUser),
    auditLog: audit.map(mapApiAudit),
    pages: adminPages.map((page) => ({
      ...page,
      createdAt: iso(page.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(page.updatedAt) ?? new Date().toISOString(),
    })),
    contactMessages: contactMessages.map((message) => ({
      ...message,
      createdAt: iso(message.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(message.updatedAt) ?? new Date().toISOString(),
      resolvedAt: iso(message.resolvedAt),
    })),
    newsletterSubscribers: newsletterSubscribers.map((subscriber) => ({
      ...subscriber,
      createdAt: iso(subscriber.createdAt) ?? new Date().toISOString(),
      updatedAt: iso(subscriber.updatedAt) ?? new Date().toISOString(),
    })),
    ads: adminAds.map((ad) => ({
      ...ad,
      startsAt: iso(ad.startsAt),
      endsAt: iso(ad.endsAt),
    })),
    navigation: adminNavigation,
    analyticsSnapshots: analyticsSnapshots.map((snapshot) => ({
      ...snapshot,
      date: iso(snapshot.date) ?? new Date().toISOString(),
    })),
  };
}

export async function syncCmsAction(action: CmsAction, token: string | null | undefined, before: CmsState): Promise<void> {
  if (action.type === 'COMMENT_SUBMIT_PUBLIC') {
    await apiRequest(`/public/posts/${action.postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ author: action.author, email: action.email, content: action.content }),
    });
    return;
  }

  if (!token) return;

  switch (action.type) {
    case 'POST_UPSERT': {
      const exists = before.posts.some((post) => post.id === action.post.id);
      await apiRequest(exists ? `/admin/posts/${action.post.id}` : '/admin/posts', {
        method: exists ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(postPayload(action.post)),
      });
      return;
    }
    case 'POST_DELETE':
      await apiRequest(`/admin/posts/${action.id}`, { method: 'DELETE', token });
      return;
    case 'POSTS_BULK_DELETE':
      await apiRequest('/admin/posts/bulk-delete', { method: 'POST', token, body: JSON.stringify({ ids: action.ids }) });
      return;
    case 'POSTS_BULK_SET_STATUS':
      await apiRequest('/admin/posts/bulk-status', { method: 'POST', token, body: JSON.stringify({ ids: action.ids, status: statusToApi[action.status] }) });
      return;
    case 'CATEGORY_ADD':
      await apiRequest('/admin/categories', { method: 'POST', token, body: JSON.stringify(action.category) });
      return;
    case 'CATEGORY_UPDATE':
      await apiRequest(`/admin/categories/${action.category.id}`, { method: 'PATCH', token, body: JSON.stringify(action.category) });
      return;
    case 'CATEGORY_DELETE':
      await apiRequest(`/admin/categories/${action.id}`, { method: 'DELETE', token });
      return;
    case 'TAG_ADD':
      await apiRequest('/admin/tags', { method: 'POST', token, body: JSON.stringify(action.tag) });
      return;
    case 'TAG_UPDATE':
      await apiRequest(`/admin/tags/${action.tag.id}`, { method: 'PATCH', token, body: JSON.stringify(action.tag) });
      return;
    case 'TAG_DELETE':
      await apiRequest(`/admin/tags/${action.id}`, { method: 'DELETE', token });
      return;
    case 'TAGS_MERGE':
      await apiRequest('/admin/tags/merge', { method: 'POST', token, body: JSON.stringify({ sourceIds: action.sourceIds, targetId: action.targetId }) });
      return;
    case 'MEDIA_ADD':
      await apiRequest('/admin/media', { method: 'POST', token, body: JSON.stringify(action.item) });
      return;
    case 'MEDIA_UPDATE':
      await apiRequest(`/admin/media/${action.item.id}`, { method: 'PATCH', token, body: JSON.stringify(action.item) });
      return;
    case 'MEDIA_DELETE':
      await apiRequest(`/admin/media/${action.id}`, { method: 'DELETE', token });
      return;
    case 'COMMENT_SET_STATUS':
      await apiRequest(`/admin/comments/${action.id}/status`, { method: 'PATCH', token, body: JSON.stringify({ status: commentStatusToApi[action.status] }) });
      return;
    case 'COMMENT_DELETE':
      await apiRequest(`/admin/comments/${action.id}`, { method: 'DELETE', token });
      return;
    case 'USER_ADD':
      await apiRequest('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: action.user.name,
          email: action.user.email,
          password: action.password,
          role: roleToApi[action.user.role],
          status: userStatusToApi[action.user.status],
          title: action.user.title,
          bio: action.user.bio,
          avatarUrl: action.user.avatarUrl,
          location: action.user.location,
          websiteUrl: action.user.websiteUrl,
          twitterUrl: action.user.twitterUrl,
          linkedinUrl: action.user.linkedinUrl,
          facebookUrl: action.user.facebookUrl,
        }),
      });
      return;
    case 'USER_UPDATE':
      await apiRequest(`/admin/users/${action.user.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: action.user.name,
          email: action.user.email,
          role: roleToApi[action.user.role],
          status: userStatusToApi[action.user.status],
          ...(action.password ? { password: action.password } : {}),
          title: action.user.title,
          bio: action.user.bio,
          avatarUrl: action.user.avatarUrl,
          location: action.user.location,
          websiteUrl: action.user.websiteUrl,
          twitterUrl: action.user.twitterUrl,
          linkedinUrl: action.user.linkedinUrl,
          facebookUrl: action.user.facebookUrl,
        }),
      });
      return;
    case 'USER_DELETE':
      await apiRequest(`/admin/users/${action.id}`, { method: 'DELETE', token });
      return;
    case 'PAGE_UPSERT': {
      const exists = before.pages.some((page) => page.id === action.page.id);
      await apiRequest(exists ? `/admin/pages/${action.page.id}` : '/admin/pages', {
        method: exists ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(action.page),
      });
      return;
    }
    case 'PAGE_DELETE':
      await apiRequest(`/admin/pages/${action.id}`, { method: 'DELETE', token });
      return;
    case 'CONTACT_MESSAGE_SET_STATUS':
      await apiRequest(`/admin/contact-messages/${action.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: action.status }),
      });
      return;
    case 'CONTACT_MESSAGE_DELETE':
      await apiRequest(`/admin/contact-messages/${action.id}`, { method: 'DELETE', token });
      return;
    case 'NEWSLETTER_SUBSCRIBER_SET_STATUS':
      await apiRequest(`/admin/newsletter/subscribers/${action.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: action.status }),
      });
      return;
    case 'NEWSLETTER_SUBSCRIBER_DELETE':
      await apiRequest(`/admin/newsletter/subscribers/${action.id}`, { method: 'DELETE', token });
      return;
    case 'AD_UPSERT': {
      const exists = before.ads.some((ad) => ad.id === action.ad.id);
      await apiRequest(exists ? `/admin/ads/${action.ad.id}` : '/admin/ads', {
        method: exists ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(action.ad),
      });
      return;
    }
    case 'AD_DELETE':
      await apiRequest(`/admin/ads/${action.id}`, { method: 'DELETE', token });
      return;
    case 'NAVIGATION_UPSERT': {
      const exists = before.navigation.some((item) => item.id === action.item.id);
      await apiRequest(exists ? `/admin/navigation/${action.item.id}` : '/admin/navigation', {
        method: exists ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(action.item),
      });
      return;
    }
    case 'NAVIGATION_DELETE':
      await apiRequest(`/admin/navigation/${action.id}`, { method: 'DELETE', token });
      return;
    case 'ANALYTICS_SNAPSHOT_UPSERT': {
      const exists = before.analyticsSnapshots.some((snapshot) => snapshot.id === action.snapshot.id);
      await apiRequest(exists ? `/admin/analytics/snapshots/${action.snapshot.id}` : '/admin/analytics/snapshots', {
        method: exists ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(action.snapshot),
      });
      return;
    }
    case 'ANALYTICS_SNAPSHOT_DELETE':
      await apiRequest(`/admin/analytics/snapshots/${action.id}`, { method: 'DELETE', token });
      return;
    case 'SETTINGS_SET':
      await apiRequest('/admin/settings', { method: 'PUT', token, body: JSON.stringify(settingsPayload(action.settings)) });
      return;
    default:
      return;
  }
}
