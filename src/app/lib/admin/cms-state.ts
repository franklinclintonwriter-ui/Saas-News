
export const CMS_VERSION = 2;
const CMS_STORAGE_KEY = 'phulpur24-cms-state';

export type PostStatus = 'Published' | 'Draft' | 'Scheduled';
export type CommentStatus = 'approved' | 'pending' | 'spam';
export type UserRole = 'Admin' | 'Editor' | 'Author' | 'Contributor';
export type UserStatus = 'active' | 'inactive' | 'pending';

export type AuthorProfile = {
  id: string;
  name: string;
  email: string;
  title: string;
  bio: string;
  avatarUrl: string;
  location: string;
  websiteUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
};

export type AdminPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorProfile?: AuthorProfile | null;
  categorySlug: string;
  status: PostStatus;
  tags: string[];
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
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
};

export type AdminTag = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type AdminMedia = {
  id: string;
  name: string;
  alt: string;
  url: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  storageProvider?: string;
  storageKey?: string;
  uploadedAt: string;
};

export type AdminComment = {
  id: string;
  postId: string;
  author: string;
  email: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  title: string;
  bio: string;
  avatarUrl: string;
  location: string;
  websiteUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  joinedAt: string;
};

export type SiteSettings = {
  siteTitle: string;
  tagline: string;
  logoUrl: string;
  logoAlt: string;
  logoHeight: number;
  showHeaderLogo: boolean;
  showSiteTitle: boolean;
  showFooterLogo: boolean;
  showFooterSiteTitle: boolean;
  faviconUrl: string;
  ogImageUrl: string;
  siteUrl: string;
  organizationName: string;
  defaultSeoTitle: string;
  defaultMetaDescription: string;
  defaultKeywords: string;
  twitterHandle: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  structuredDataEnabled: boolean;
  schemaType: string;
  primaryColor: string;
  accentColor: string;
  headerBackground: string;
  footerBackground: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  copyright: string;
  footerAbout: string;
  gaId: string;
  fbPixel: string;
  customTracking: string;
  contactEmail: string;
  supportEmail: string;
  pressEmail: string;
  advertisingEmail: string;
  tipsEmail: string;
  phone: string;
  address: string;
  businessHours: string;
  officeLocations: string;
  newsletterFromName: string;
  newsletterFromEmail: string;
  newsletterEnabled: boolean;
  dailyDigest: boolean;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  detail?: string;
};

export type StaticPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  seoTitle: string;
  metaDescription: string;
  updatedAt: string;
  createdAt: string;
};

export type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  status: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'SPAM';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED';
  createdAt: string;
  updatedAt: string;
};

export type AdPlacement = {
  id: string;
  key: string;
  name: string;
  placement: string;
  label: string;
  imageUrl: string;
  targetUrl: string;
  html: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  location: 'HEADER' | 'FOOTER' | 'UTILITY';
  position: number;
  external: boolean;
  enabled: boolean;
};

export type AnalyticsSnapshot = {
  id: string;
  date: string;
  views: number;
  visitors: number;
  sessions: number;
  activeUsers: number;
  avgLoadMs: number;
  direct: number;
  search: number;
  social: number;
  referral: number;
  desktopUsers: number;
  mobileUsers: number;
  tabletUsers: number;
};

export type CmsState = {
  version: number;
  posts: AdminPost[];
  categories: AdminCategory[];
  tags: AdminTag[];
  media: AdminMedia[];
  comments: AdminComment[];
  users: AdminUser[];
  settings: SiteSettings;
  auditLog: AuditEntry[];
  pages: StaticPage[];
  contactMessages: ContactMessage[];
  newsletterSubscribers: NewsletterSubscriber[];
  ads: AdPlacement[];
  navigation: NavigationItem[];
  analyticsSnapshots: AnalyticsSnapshot[];
};

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

export function computeSeoScore(p: Pick<AdminPost, 'title' | 'seoTitle' | 'metaDescription' | 'focusKeyword' | 'content'>): number {
  let s = 40;
  const t = p.seoTitle.trim() || p.title.trim();
  if (t.length >= 30 && t.length <= 60) s += 18;
  else if (t.length > 12) s += 8;
  const m = p.metaDescription.trim();
  if (m.length >= 120 && m.length <= 160) s += 18;
  else if (m.length > 50) s += 8;
  const k = p.focusKeyword.trim().toLowerCase();
  if (k) {
    s += 10;
    const body = (p.title + ' ' + p.content).toLowerCase();
    if (body.includes(k)) s += 14;
  }
  return Math.min(100, Math.round(s));
}

const EMPTY_SETTINGS: SiteSettings = {
  siteTitle: '',
  tagline: '',
  logoUrl: '',
  logoAlt: '',
  logoHeight: 40,
  showHeaderLogo: true,
  showSiteTitle: true,
  showFooterLogo: true,
  showFooterSiteTitle: true,
  faviconUrl: '',
  ogImageUrl: '',
  siteUrl: '',
  organizationName: '',
  defaultSeoTitle: '',
  defaultMetaDescription: '',
  defaultKeywords: '',
  twitterHandle: '',
  googleSiteVerification: '',
  bingSiteVerification: '',
  robotsIndex: true,
  robotsFollow: true,
  structuredDataEnabled: true,
  schemaType: 'NewsMediaOrganization',
  primaryColor: '#194890',
  accentColor: '#DC2626',
  headerBackground: '#FFFFFF',
  footerBackground: '#0B1220',
  facebook: '',
  twitter: '',
  instagram: '',
  linkedin: '',
  copyright: '',
  footerAbout: '',
  gaId: '',
  fbPixel: '',
  customTracking: '',
  contactEmail: '',
  supportEmail: '',
  pressEmail: '',
  advertisingEmail: '',
  tipsEmail: '',
  phone: '',
  address: '',
  businessHours: '',
  officeLocations: '',
  newsletterFromName: '',
  newsletterFromEmail: '',
  newsletterEnabled: true,
  dailyDigest: false,
};




function profileForUser(user: AdminUser): AuthorProfile {
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

export function createInitialCmsState(): CmsState {
  return createEmptyCmsState();
}

export function createEmptyCmsState(): CmsState {
  return {
    version: CMS_VERSION,
    posts: [],
    categories: [],
    tags: [],
    media: [],
    comments: [],
    users: [],
    settings: { ...EMPTY_SETTINGS },
    auditLog: [],
    pages: [],
    contactMessages: [],
    newsletterSubscribers: [],
    ads: [],
    navigation: [],
    analyticsSnapshots: [],
  };
}

function withAudit(state: CmsState, actor: string, action: string, resource: string, detail?: string): CmsState {
  const entry: AuditEntry = {
    id: makeId(),
    at: new Date().toISOString(),
    actor: actor || 'System',
    action,
    resource,
    detail,
  };
  return { ...state, auditLog: [entry, ...state.auditLog].slice(0, 120) };
}

export type CmsAction =
  | { type: 'HYDRATE'; payload: CmsState }
  | { type: 'POST_DETAIL_HYDRATE'; post: AdminPost }
  | { type: 'RESET_WORKSPACE'; actor?: string }
  | { type: 'POST_UPSERT'; post: AdminPost; actor?: string }
  | { type: 'POST_DELETE'; id: string; actor?: string }
  | { type: 'POSTS_BULK_DELETE'; ids: string[]; actor?: string }
  | { type: 'POSTS_BULK_SET_STATUS'; ids: string[]; status: PostStatus; actor?: string }
  | { type: 'CATEGORY_ADD'; category: AdminCategory; actor?: string }
  | { type: 'CATEGORY_UPDATE'; category: AdminCategory; actor?: string }
  | { type: 'CATEGORY_DELETE'; id: string; actor?: string }
  | { type: 'TAG_ADD'; tag: AdminTag; actor?: string }
  | { type: 'TAG_UPDATE'; tag: AdminTag; actor?: string }
  | { type: 'TAG_DELETE'; id: string; actor?: string }
  | { type: 'TAGS_MERGE'; sourceIds: string[]; targetId: string; actor?: string }
  | { type: 'MEDIA_ADD'; item: AdminMedia; actor?: string }
  | { type: 'MEDIA_UPDATE'; item: AdminMedia; actor?: string }
  | { type: 'MEDIA_DELETE'; id: string; actor?: string }
  | { type: 'COMMENT_SET_STATUS'; id: string; status: CommentStatus; actor?: string }
  | { type: 'COMMENT_DELETE'; id: string; actor?: string }
  /** Visitor-submitted comment from the public article page (queued for moderation). */
  | { type: 'COMMENT_SUBMIT_PUBLIC'; postId: string; author: string; email: string; content: string }
  | { type: 'USER_ADD'; user: AdminUser; password?: string; actor?: string }
  | { type: 'USER_UPDATE'; user: AdminUser; password?: string; actor?: string }
  | { type: 'USER_DELETE'; id: string; actor?: string }
  | { type: 'PAGE_UPSERT'; page: StaticPage; actor?: string }
  | { type: 'PAGE_DELETE'; id: string; actor?: string }
  | { type: 'CONTACT_MESSAGE_SET_STATUS'; id: string; status: ContactMessage['status']; actor?: string }
  | { type: 'CONTACT_MESSAGE_DELETE'; id: string; actor?: string }
  | { type: 'NEWSLETTER_SUBSCRIBER_SET_STATUS'; id: string; status: NewsletterSubscriber['status']; actor?: string }
  | { type: 'NEWSLETTER_SUBSCRIBER_DELETE'; id: string; actor?: string }
  | { type: 'AD_UPSERT'; ad: AdPlacement; actor?: string }
  | { type: 'AD_DELETE'; id: string; actor?: string }
  | { type: 'NAVIGATION_UPSERT'; item: NavigationItem; actor?: string }
  | { type: 'NAVIGATION_DELETE'; id: string; actor?: string }
  | { type: 'ANALYTICS_SNAPSHOT_UPSERT'; snapshot: AnalyticsSnapshot; actor?: string }
  | { type: 'ANALYTICS_SNAPSHOT_DELETE'; id: string; actor?: string }
  | { type: 'SETTINGS_SET'; settings: SiteSettings; actor?: string };

export function cmsReducer(state: CmsState, action: CmsAction): CmsState {
  const actor = 'actor' in action ? action.actor ?? 'System' : 'System';

  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'POST_DETAIL_HYDRATE':
      return {
        ...state,
        posts: state.posts.some((post) => post.id === action.post.id)
          ? state.posts.map((post) => (post.id === action.post.id ? action.post : post))
          : [action.post, ...state.posts],
      };
    case 'RESET_WORKSPACE': {
      const next = createEmptyCmsState();
      return withAudit(next, action.actor ?? actor, 'Workspace reset', 'System', 'Local state cleared');
    }
    case 'POST_UPSERT': {
      const exists = state.posts.some((p) => p.id === action.post.id);
      const posts = exists
        ? state.posts.map((p) => (p.id === action.post.id ? action.post : p))
        : [action.post, ...state.posts];
      let next: CmsState = { ...state, posts };
      next = withAudit(next, actor, exists ? 'Post updated' : 'Post created', 'Post', action.post.title);
      return next;
    }
    case 'POST_DELETE': {
      const post = state.posts.find((p) => p.id === action.id);
      const posts = state.posts.filter((p) => p.id !== action.id);
      const comments = state.comments.filter((c) => c.postId !== action.id);
      let next: CmsState = { ...state, posts, comments };
      next = withAudit(next, actor, 'Post deleted', 'Post', post?.title);
      return next;
    }
    case 'POSTS_BULK_DELETE': {
      const set = new Set(action.ids);
      const posts = state.posts.filter((p) => !set.has(p.id));
      const comments = state.comments.filter((c) => !set.has(c.postId));
      let next: CmsState = { ...state, posts, comments };
      next = withAudit(next, actor, 'Bulk delete posts', 'Post', `${action.ids.length} items`);
      return next;
    }
    case 'POSTS_BULK_SET_STATUS': {
      const set = new Set(action.ids);
      const now = new Date().toISOString();
      const posts = state.posts.map((p) => {
        if (!set.has(p.id)) return p;
        let publishedAt = p.publishedAt;
        let scheduledAt = p.scheduledAt;
        let views = p.views;
        if (action.status === 'Published') {
          publishedAt = publishedAt ?? now;
          scheduledAt = null;
          views = 0;
        } else if (action.status === 'Draft') {
          publishedAt = null;
          scheduledAt = null;
          views = 0;
        } else {
          publishedAt = null;
          scheduledAt = p.scheduledAt ?? new Date(Date.now() + 86400000).toISOString();
          views = 0;
        }
        return { ...p, status: action.status, updatedAt: now, publishedAt, scheduledAt, views };
      });
      let next: CmsState = { ...state, posts };
      next = withAudit(next, actor, `Bulk set status: ${action.status}`, 'Post', `${action.ids.length} items`);
      return next;
    }
    case 'CATEGORY_ADD': {
      let next: CmsState = { ...state, categories: [...state.categories, action.category] };
      next = withAudit(next, actor, 'Category created', 'Category', action.category.name);
      return next;
    }
    case 'CATEGORY_UPDATE': {
      const prev = state.categories.find((c) => c.id === action.category.id);
      if (!prev) return state;
      const categories = state.categories.map((c) => (c.id === action.category.id ? action.category : c));
      const posts = state.posts.map((p) =>
        p.categorySlug === prev.slug ? { ...p, categorySlug: action.category.slug, updatedAt: new Date().toISOString() } : p,
      );
      let next: CmsState = { ...state, categories, posts };
      next = withAudit(next, actor, 'Category updated', 'Category', action.category.name);
      return next;
    }
    case 'CATEGORY_DELETE': {
      const cat = state.categories.find((c) => c.id === action.id);
      const count = state.posts.filter((p) => p.categorySlug === cat?.slug).length;
      if (!cat || count > 0) return state;
      const categories = state.categories.filter((c) => c.id !== action.id);
      let next: CmsState = { ...state, categories };
      next = withAudit(next, actor, 'Category deleted', 'Category', cat.name);
      return next;
    }
    case 'TAG_ADD': {
      let next: CmsState = { ...state, tags: [...state.tags, action.tag] };
      next = withAudit(next, actor, 'Tag created', 'Tag', action.tag.name);
      return next;
    }
    case 'TAG_UPDATE': {
      const prev = state.tags.find((t) => t.id === action.tag.id);
      if (!prev) return state;
      const tags = state.tags.map((t) => (t.id === action.tag.id ? action.tag : t));
      const posts = state.posts.map((p) => ({
        ...p,
        tags: p.tags.map((slug) => (slug === prev.slug ? action.tag.slug : slug)),
        updatedAt: new Date().toISOString(),
      }));
      let next: CmsState = { ...state, tags, posts };
      next = withAudit(next, actor, 'Tag updated', 'Tag', action.tag.name);
      return next;
    }
    case 'TAG_DELETE': {
      const tag = state.tags.find((t) => t.id === action.id);
      if (!tag) return state;
      const tags = state.tags.filter((t) => t.id !== action.id);
      const posts = state.posts.map((p) => ({
        ...p,
        tags: p.tags.filter((slug) => slug !== tag.slug),
        updatedAt: new Date().toISOString(),
      }));
      let next: CmsState = { ...state, tags, posts };
      next = withAudit(next, actor, 'Tag deleted', 'Tag', tag.name);
      return next;
    }
    case 'TAGS_MERGE': {
      const target = state.tags.find((t) => t.id === action.targetId);
      if (!target) return state;
      const sources = state.tags.filter((t) => action.sourceIds.includes(t.id) && t.id !== action.targetId);
      const sourceSlugSet = new Set(sources.map((s) => s.slug));
      const removeIds = new Set(sources.map((s) => s.id));
      const tags = state.tags.filter((t) => !removeIds.has(t.id));
      const posts = state.posts.map((p) => ({
        ...p,
        tags: [...new Set(p.tags.map((slug) => (sourceSlugSet.has(slug) ? target.slug : slug)))],
        updatedAt: new Date().toISOString(),
      }));
      let next: CmsState = { ...state, tags, posts };
      next = withAudit(next, actor, 'Tags merged', 'Tag', `→ ${target.slug}`);
      return next;
    }
    case 'MEDIA_ADD': {
      let next: CmsState = { ...state, media: [action.item, ...state.media] };
      next = withAudit(next, actor, 'Media uploaded', 'Media', action.item.name);
      return next;
    }
    case 'MEDIA_UPDATE': {
      const media = state.media.map((m) => (m.id === action.item.id ? action.item : m));
      let next: CmsState = { ...state, media };
      next = withAudit(next, actor, 'Media updated', 'Media', action.item.name);
      return next;
    }
    case 'MEDIA_DELETE': {
      const m = state.media.find((x) => x.id === action.id);
      const media = state.media.filter((x) => x.id !== action.id);
      const posts = state.posts.map((p) =>
        p.featuredImageId === action.id ? { ...p, featuredImageId: null, updatedAt: new Date().toISOString() } : p,
      );
      let next: CmsState = { ...state, media, posts };
      next = withAudit(next, actor, 'Media deleted', 'Media', m?.name);
      return next;
    }
    case 'COMMENT_SET_STATUS': {
      const comments = state.comments.map((c) => (c.id === action.id ? { ...c, status: action.status } : c));
      let next: CmsState = { ...state, comments };
      next = withAudit(next, actor, `Comment ${action.status}`, 'Comment', action.id);
      return next;
    }
    case 'COMMENT_DELETE': {
      const comments = state.comments.filter((c) => c.id !== action.id);
      let next: CmsState = { ...state, comments };
      next = withAudit(next, actor, 'Comment deleted', 'Comment', action.id);
      return next;
    }
    case 'COMMENT_SUBMIT_PUBLIC': {
      const post = state.posts.find((p) => p.id === action.postId);
      if (!post) return state;
      const comment: AdminComment = {
        id: makeId(),
        postId: action.postId,
        author: action.author.trim() || 'Reader',
        email: action.email.trim().toLowerCase(),
        content: action.content.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const comments = [comment, ...state.comments];
      const auditActor = action.email.trim() || 'Public reader';
      let next: CmsState = { ...state, comments };
      next = withAudit(next, auditActor, 'Public comment submitted', 'Comment', post.title);
      return next;
    }
    case 'USER_ADD': {
      let next: CmsState = { ...state, users: [...state.users, action.user] };
      next = withAudit(next, actor, 'User invited', 'User', action.user.email);
      return next;
    }
    case 'USER_UPDATE': {
      const users = state.users.map((u) => (u.id === action.user.id ? action.user : u));
      const profile = profileForUser(action.user);
      const posts = state.posts.map((p) => {
        const prev = state.users.find((u) => u.id === action.user.id);
        const authoredByUser = p.authorProfile?.id === action.user.id || (!!prev && p.author === prev.name);
        if (!authoredByUser) return p;
        return { ...p, author: action.user.name, authorProfile: profile, updatedAt: new Date().toISOString() };
      });
      let next: CmsState = { ...state, users, posts };
      next = withAudit(next, actor, 'User updated', 'User', action.user.email);
      return next;
    }
    case 'USER_DELETE': {
      const users = state.users.filter((u) => u.id !== action.id);
      let next: CmsState = { ...state, users };
      next = withAudit(next, actor, 'User removed', 'User', action.id);
      return next;
    }
    case 'PAGE_UPSERT': {
      const exists = state.pages.some((p) => p.id === action.page.id);
      const page = { ...action.page, updatedAt: new Date().toISOString() };
      const pages = exists ? state.pages.map((p) => (p.id === page.id ? page : p)) : [page, ...state.pages];
      let next: CmsState = { ...state, pages };
      next = withAudit(next, actor, exists ? 'Page updated' : 'Page created', 'Page', page.title);
      return next;
    }
    case 'PAGE_DELETE': {
      const page = state.pages.find((p) => p.id === action.id);
      const pages = state.pages.filter((p) => p.id !== action.id);
      let next: CmsState = { ...state, pages };
      next = withAudit(next, actor, 'Page deleted', 'Page', page?.title);
      return next;
    }
    case 'CONTACT_MESSAGE_SET_STATUS': {
      const resolvedAt = action.status === 'RESOLVED' ? new Date().toISOString() : null;
      const contactMessages = state.contactMessages.map((m) =>
        m.id === action.id ? { ...m, status: action.status, resolvedAt, updatedAt: new Date().toISOString() } : m,
      );
      let next: CmsState = { ...state, contactMessages };
      next = withAudit(next, actor, `Contact ${action.status.toLowerCase()}`, 'ContactMessage', action.id);
      return next;
    }
    case 'CONTACT_MESSAGE_DELETE': {
      const contactMessages = state.contactMessages.filter((m) => m.id !== action.id);
      let next: CmsState = { ...state, contactMessages };
      next = withAudit(next, actor, 'Contact message deleted', 'ContactMessage', action.id);
      return next;
    }
    case 'NEWSLETTER_SUBSCRIBER_SET_STATUS': {
      const newsletterSubscribers = state.newsletterSubscribers.map((s) =>
        s.id === action.id ? { ...s, status: action.status, updatedAt: new Date().toISOString() } : s,
      );
      let next: CmsState = { ...state, newsletterSubscribers };
      next = withAudit(next, actor, `Subscriber ${action.status.toLowerCase()}`, 'NewsletterSubscriber', action.id);
      return next;
    }
    case 'NEWSLETTER_SUBSCRIBER_DELETE': {
      const newsletterSubscribers = state.newsletterSubscribers.filter((s) => s.id !== action.id);
      let next: CmsState = { ...state, newsletterSubscribers };
      next = withAudit(next, actor, 'Subscriber deleted', 'NewsletterSubscriber', action.id);
      return next;
    }
    case 'AD_UPSERT': {
      const exists = state.ads.some((a) => a.id === action.ad.id);
      const ads = exists ? state.ads.map((a) => (a.id === action.ad.id ? action.ad : a)) : [action.ad, ...state.ads];
      let next: CmsState = { ...state, ads };
      next = withAudit(next, actor, exists ? 'Ad updated' : 'Ad created', 'Ad', action.ad.name);
      return next;
    }
    case 'AD_DELETE': {
      const ad = state.ads.find((a) => a.id === action.id);
      const ads = state.ads.filter((a) => a.id !== action.id);
      let next: CmsState = { ...state, ads };
      next = withAudit(next, actor, 'Ad deleted', 'Ad', ad?.name);
      return next;
    }
    case 'NAVIGATION_UPSERT': {
      const exists = state.navigation.some((n) => n.id === action.item.id);
      const navigation = exists
        ? state.navigation.map((n) => (n.id === action.item.id ? action.item : n))
        : [...state.navigation, action.item];
      let next: CmsState = { ...state, navigation };
      next = withAudit(next, actor, exists ? 'Navigation updated' : 'Navigation created', 'Navigation', action.item.label);
      return next;
    }
    case 'NAVIGATION_DELETE': {
      const item = state.navigation.find((n) => n.id === action.id);
      const navigation = state.navigation.filter((n) => n.id !== action.id);
      let next: CmsState = { ...state, navigation };
      next = withAudit(next, actor, 'Navigation deleted', 'Navigation', item?.label);
      return next;
    }
    case 'ANALYTICS_SNAPSHOT_UPSERT': {
      const exists = state.analyticsSnapshots.some((s) => s.id === action.snapshot.id);
      const analyticsSnapshots = exists
        ? state.analyticsSnapshots.map((s) => (s.id === action.snapshot.id ? action.snapshot : s))
        : [...state.analyticsSnapshots, action.snapshot].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let next: CmsState = { ...state, analyticsSnapshots };
      next = withAudit(next, actor, exists ? 'Analytics snapshot updated' : 'Analytics snapshot created', 'Analytics', action.snapshot.date);
      return next;
    }
    case 'ANALYTICS_SNAPSHOT_DELETE': {
      const analyticsSnapshots = state.analyticsSnapshots.filter((s) => s.id !== action.id);
      let next: CmsState = { ...state, analyticsSnapshots };
      next = withAudit(next, actor, 'Analytics snapshot deleted', 'Analytics', action.id);
      return next;
    }
    case 'SETTINGS_SET': {
      let next: CmsState = { ...state, settings: action.settings };
      next = withAudit(next, actor, 'Settings saved', 'Settings', 'Site configuration');
      return next;
    }
    default:
      return state;
  }
}

export function loadCmsState(): CmsState {
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) return createEmptyCmsState();
    const parsed = JSON.parse(raw) as CmsState;
    if (!parsed || parsed.version !== CMS_VERSION || !Array.isArray(parsed.posts)) return createEmptyCmsState();
    return parsed;
  } catch {
    return createEmptyCmsState();
  }
}

export function saveCmsState(state: CmsState): void {
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function categoryPostCount(posts: AdminPost[], slug: string): number {
  return posts.filter((p) => p.categorySlug === slug).length;
}

export function tagUsageCount(posts: AdminPost[], tagSlug: string): number {
  return posts.filter((p) => p.tags.includes(tagSlug)).length;
}

export function userPostCount(posts: AdminPost[], name: string): number {
  return posts.filter((p) => p.author === name).length;
}

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hours ago`;
  return formatShortDate(iso);
}
