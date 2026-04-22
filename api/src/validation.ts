import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR']);
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);
export const postStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']);
export const commentStatusSchema = z.enum(['APPROVED', 'PENDING', 'SPAM']);
export const subscriberStatusSchema = z.enum(['ACTIVE', 'UNSUBSCRIBED']);
export const pageStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
export const contactMessageStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'SPAM']);
export const navigationLocationSchema = z.enum(['HEADER', 'FOOTER', 'UTILITY']);

const hexColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);

const optionalUrlOrImageDataSchema = z.string().trim().max(2_000_000).refine((value) => {
  if (!value) return true;
  if (value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Use an HTTP(S) URL or an image data URL.');

const optionalHttpUrlSchema = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Use an HTTP(S) URL.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(40),
});

export const categorySchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).default(''),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default('#194890'),
});

export const tagSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default('#194890'),
});

export const postSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().min(2).max(240).optional(),
  excerpt: z.string().trim().max(600).default(''),
  content: z.string().trim().min(1),
  status: postStatusSchema.default('DRAFT'),
  featured: z.boolean().default(false),
  breaking: z.boolean().default(false),
  seoTitle: z.string().trim().max(70).default(''),
  metaDescription: z.string().trim().max(180).default(''),
  focusKeyword: z.string().trim().max(80).default(''),
  canonicalUrl: z.string().trim().url().or(z.literal('')).default(''),
  readTime: z.string().trim().max(40).default(''),
  views: z.coerce.number().int().min(0).default(0),
  scheduledAt: z.string().datetime().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  authorId: z.string().min(1).optional(),
  featuredImageId: z.string().min(1).nullable().optional(),
  tagIds: z.array(z.string().min(1)).default([]),
  tagSlugs: z.array(z.string().min(1)).default([]),
});

export const postPatchSchema = postSchema.partial();

export const bulkPostStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: postStatusSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const tagMergeSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1).max(100),
  targetId: z.string().min(1),
});

export const mediaSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(160),
  alt: z.string().trim().max(200).default(''),
  url: optionalUrlOrImageDataSchema.refine((value) => Boolean(value), 'Media URL is required.'),
  mime: z.string().trim().min(3).max(100),
  sizeBytes: z.coerce.number().int().min(0),
  width: z.coerce.number().int().min(0).default(0),
  height: z.coerce.number().int().min(0).default(0),
});

export const commentPublicSchema = z.object({
  author: z.string().trim().min(1).max(80),
  email: z.string().trim().email().toLowerCase(),
  content: z.string().trim().min(2).max(2000),
});

export const commentStatusUpdateSchema = z.object({
  status: commentStatusSchema,
});

export const newsletterSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  source: z.string().trim().max(80).default('website'),
});

export const newsletterSubscriberPatchSchema = z.object({
  status: subscriberStatusSchema,
});

export const contactMessageSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().toLowerCase(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(20).max(5000),
});

export const contactMessagePatchSchema = z.object({
  status: contactMessageStatusSchema,
});

export const staticPageSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  excerpt: z.string().trim().max(600).default(''),
  content: z.string().trim().min(1).max(40000),
  status: pageStatusSchema.default('PUBLISHED'),
  seoTitle: z.string().trim().max(100).default(''),
  metaDescription: z.string().trim().max(220).default(''),
});

export const adPlacementSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  key: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  placement: z.string().trim().min(2).max(80),
  label: z.string().trim().max(80).default('Advertisement'),
  imageUrl: optionalUrlOrImageDataSchema.default(''),
  targetUrl: optionalHttpUrlSchema.default(''),
  html: z.string().trim().max(10000).default(''),
  enabled: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export const navigationItemSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(300),
  location: navigationLocationSchema.default('HEADER'),
  position: z.coerce.number().int().min(0).max(10000).default(0),
  external: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const analyticsSnapshotSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  date: z.string().datetime(),
  views: z.coerce.number().int().min(0).default(0),
  visitors: z.coerce.number().int().min(0).default(0),
  sessions: z.coerce.number().int().min(0).default(0),
  activeUsers: z.coerce.number().int().min(0).default(0),
  avgLoadMs: z.coerce.number().int().min(0).default(0),
  direct: z.coerce.number().int().min(0).default(0),
  search: z.coerce.number().int().min(0).default(0),
  social: z.coerce.number().int().min(0).default(0),
  referral: z.coerce.number().int().min(0).default(0),
  desktopUsers: z.coerce.number().int().min(0).default(0),
  mobileUsers: z.coerce.number().int().min(0).default(0),
  tabletUsers: z.coerce.number().int().min(0).default(0),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(10).max(200),
  role: roleSchema.default('AUTHOR'),
  status: userStatusSchema.default('ACTIVE'),
  title: z.string().trim().max(120).default(''),
  bio: z.string().trim().max(900).default(''),
  avatarUrl: optionalUrlOrImageDataSchema.default(''),
  location: z.string().trim().max(120).default(''),
  websiteUrl: optionalHttpUrlSchema.default(''),
  twitterUrl: optionalHttpUrlSchema.default(''),
  linkedinUrl: optionalHttpUrlSchema.default(''),
  facebookUrl: optionalHttpUrlSchema.default(''),
});

export const userPatchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  password: z.string().min(10).max(200).optional(),
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  title: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(900).optional(),
  avatarUrl: optionalUrlOrImageDataSchema.optional(),
  location: z.string().trim().max(120).optional(),
  websiteUrl: optionalHttpUrlSchema.optional(),
  twitterUrl: optionalHttpUrlSchema.optional(),
  linkedinUrl: optionalHttpUrlSchema.optional(),
  facebookUrl: optionalHttpUrlSchema.optional(),
});

export const aiProviderSchema = z.enum(['openai', 'anthropic', 'google', 'openrouter']);
export const aiToneSchema = z.enum(['neutral', 'analytical', 'breaking', 'investigative', 'opinion_light', 'human_interest']);
export const aiArticleLengthSchema = z.enum(['brief', 'standard', 'in_depth']);
export const aiImagePlacementSchema = z.enum(['featured', 'inline', 'social']);

export const aiGenerateNewsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string().trim().max(160).optional(),
  topic: z.string().trim().min(20).max(6000),
  focusKeywords: z.union([
    z.string().trim().min(1).max(1200),
    z.array(z.string().trim().min(1).max(100)).min(1).max(14),
  ]),
  tone: aiToneSchema.default('neutral'),
  language: z.string().trim().min(2).max(16).default('en'),
  audience: z.string().trim().max(400).optional(),
  articleLength: aiArticleLengthSchema.default('standard'),
});

export const aiGeneratePostImageSchema = z.object({
  provider: aiProviderSchema.default('openai'),
  model: z.string().trim().max(160).optional(),
  title: z.string().trim().min(3).max(220),
  excerpt: z.string().trim().max(600).optional(),
  content: z.string().trim().min(80).max(48_000),
  category: z.string().trim().min(2).max(80).default('News'),
  focusKeyword: z.string().trim().max(80).optional(),
  postId: z.string().trim().min(1).max(120).optional(),
  imagePrompt: z.string().trim().max(2200).optional(),
  placement: aiImagePlacementSchema.default('featured'),
  style: z.string().trim().max(240).default('editorial news feature image, realistic, high detail'),
});

export const integrationProviderParamSchema = z.object({
  provider: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/, 'Use a slug-like provider id.'),
});

export const integrationConfigSchema = z.object({
  provider: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/, 'Use a slug-like provider id.').optional(),
  label: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40).default('GENERAL'),
  enabled: z.boolean().default(true),
  secret: z.string().max(5000).optional(),
  clearSecret: z.boolean().optional(),
  model: z.string().trim().max(160).default(''),
  endpoint: z.string().trim().max(500).default(''),
  notes: z.string().trim().max(800).default(''),
});

export const settingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(160),
  logoUrl: optionalUrlOrImageDataSchema,
  logoAlt: z.string().trim().max(160),
  logoHeight: z.coerce.number().int().min(24).max(96),
  showHeaderLogo: z.boolean(),
  showSiteTitle: z.boolean(),
  showFooterLogo: z.boolean(),
  showFooterSiteTitle: z.boolean(),
  faviconUrl: optionalUrlOrImageDataSchema,
  ogImageUrl: optionalUrlOrImageDataSchema,
  siteUrl: optionalHttpUrlSchema,
  organizationName: z.string().trim().min(1).max(120),
  defaultSeoTitle: z.string().trim().max(100),
  defaultMetaDescription: z.string().trim().max(200),
  defaultKeywords: z.string().trim().max(240),
  twitterHandle: z.string().trim().max(40),
  googleSiteVerification: z.string().trim().max(200),
  bingSiteVerification: z.string().trim().max(200),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  structuredDataEnabled: z.boolean(),
  schemaType: z.enum(['NewsMediaOrganization', 'Organization', 'LocalBusiness']),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  headerBackground: hexColorSchema,
  footerBackground: hexColorSchema,
  facebook: z.string().trim().max(240),
  twitter: z.string().trim().max(240),
  instagram: z.string().trim().max(240),
  linkedin: z.string().trim().max(240),
  copyright: z.string().trim().max(160),
  footerAbout: z.string().trim().max(600),
  gaId: z.string().trim().max(80),
  fbPixel: z.string().trim().max(80),
  customTracking: z.string().trim().max(5000),
  contactEmail: z.string().trim().email(),
  supportEmail: z.string().trim().email(),
  pressEmail: z.string().trim().email(),
  advertisingEmail: z.string().trim().email(),
  tipsEmail: z.string().trim().email(),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
  businessHours: z.string().trim().max(120),
  officeLocations: z.string().trim().max(1200),
  newsletterFromName: z.string().trim().max(100),
  newsletterFromEmail: z.string().trim().email(),
  newsletterEnabled: z.boolean(),
  dailyDigest: z.boolean(),
});

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}
