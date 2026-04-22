import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import {
  authenticate,
  createRefreshToken,
  hashPassword,
  requireRole,
  requireSelfOrRole,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  verifyPassword,
} from './auth.js';
import { badRequest, forbidden, notFound, unauthorized } from './errors.js';
import { aiCapabilities, generateNewsDraft, generatePostImageAsset, parseKeywords } from './ai-news.js';
import { deleteIntegrationConfig, listIntegrationConfigs, saveIntegrationConfig } from './integrations.js';
import { prisma } from './prisma.js';
import { asyncHandler, created, hashIp, idParamSchema, ok, safeUser, slugify, writeAudit } from './utils.js';
import {
  adPlacementSchema,
  aiGenerateNewsSchema,
  aiGeneratePostImageSchema,
  analyticsSnapshotSchema,
  bulkDeleteSchema,
  bulkPostStatusSchema,
  categorySchema,
  contactMessagePatchSchema,
  contactMessageSchema,
  integrationConfigSchema,
  integrationProviderParamSchema,
  commentPublicSchema,
  commentStatusUpdateSchema,
  loginSchema,
  mediaSchema,
  navigationItemSchema,
  newsletterSubscriberPatchSchema,
  newsletterSchema,
  paginationSchema,
  postPatchSchema,
  postSchema,
  refreshSchema,
  settingsSchema,
  staticPageSchema,
  tagMergeSchema,
  tagSchema,
  userCreateSchema,
  userPatchSchema,
  validateBody,
  validateQuery,
} from './validation.js';

const router = Router();

const postInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      bio: true,
      avatarUrl: true,
      location: true,
      websiteUrl: true,
      twitterUrl: true,
      linkedinUrl: true,
      facebookUrl: true,
    },
  },
  category: true,
  featuredImage: true,
  tags: { include: { tag: true } },
  _count: { select: { comments: true } },
};

function mapPost(post: any) {
  return {
    ...post,
    tags: post.tags?.map((row: any) => row.tag) ?? [],
  };
}

function paramString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function queryData(req: { validatedQuery?: unknown }) {
  return req.validatedQuery as any;
}

async function getSiteSettings() {
  return prisma.siteSetting.upsert({
    where: { id: 'site' },
    update: {},
    create: { id: 'site' },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapSvgTitle(value: string): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= 28) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return (lines.length ? lines : ['Untitled story']).slice(0, 3);
}

function seedNumber(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function generatedPostImageDataUrl(title: string, category: string, seed: string): string {
  const palettes = [
    ['#194890', '#DC2626', '#F8FAFC'],
    ['#0F766E', '#F59E0B', '#F8FAFC'],
    ['#111827', '#2563EB', '#F8FAFC'],
    ['#7C2D12', '#10B981', '#FFF7ED'],
    ['#4338CA', '#EC4899', '#F8FAFC'],
    ['#164E63', '#22C55E', '#ECFEFF'],
  ] as const;
  const [background, accent, foreground] = palettes[seedNumber(seed) % palettes.length]!;
  const titleLines = wrapSvgTitle(title)
    .map((line, index) => `<tspan x="90" dy="${index === 0 ? 0 : 78}">${escapeSvgText(line)}</tspan>`)
    .join('');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">',
    `<rect width="1200" height="800" fill="${background}"/>`,
    `<rect x="64" y="64" width="1072" height="672" rx="34" fill="${foreground}" opacity="0.10"/>`,
    `<rect x="0" y="610" width="1200" height="190" fill="${accent}" opacity="0.94"/>`,
    `<circle cx="1010" cy="168" r="88" fill="${accent}" opacity="0.92"/>`,
    `<circle cx="1090" cy="250" r="42" fill="${foreground}" opacity="0.18"/>`,
    `<text x="90" y="150" fill="${foreground}" font-family="Georgia,serif" font-size="38" font-weight="700" letter-spacing="2">${escapeSvgText(category.toUpperCase())}</text>`,
    `<text x="90" y="320" fill="${foreground}" font-family="Georgia,serif" font-size="66" font-weight="700">${titleLines}</text>`,
    `<text x="90" y="685" fill="${foreground}" font-family="Arial,sans-serif" font-size="30" opacity="0.9">Generated editorial image</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function ensureGeneratedFeaturedImage(input: {
  postId: string;
  title: string;
  categoryName: string;
  uploaderId?: string | null;
}): Promise<string> {
  const id = `auto-post-image-${input.postId}`;
  const name = `${slugify(input.title).slice(0, 80) || input.postId}-auto.svg`;
  const url = generatedPostImageDataUrl(input.title, input.categoryName, input.postId);
  const media = await prisma.mediaAsset.upsert({
    where: { id },
    update: {
      name,
      alt: input.title,
      url,
      mime: 'image/svg+xml',
      sizeBytes: Buffer.byteLength(url),
      width: 1200,
      height: 800,
      uploaderId: input.uploaderId ?? null,
    },
    create: {
      id,
      name,
      alt: input.title,
      url,
      mime: 'image/svg+xml',
      sizeBytes: Buffer.byteLength(url),
      width: 1200,
      height: 800,
      uploaderId: input.uploaderId ?? null,
    },
  });
  return media.id;
}

function siteUrl(settings: Awaited<ReturnType<typeof getSiteSettings>>): string {
  return (settings.siteUrl || 'http://localhost:5174').replace(/\/+$/, '');
}

function absoluteUrl(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function resolveCategory(input: { categoryId?: string; categorySlug?: string }) {
  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) badRequest('Category does not exist.');
    return category;
  }
  if (input.categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
    if (!category) badRequest('Category does not exist.');
    return category;
  }
  const category = await prisma.category.findFirst({ orderBy: { name: 'asc' } });
  if (!category) badRequest('Create a category before creating posts.');
  return category;
}

async function resolveTagIds(tagIds: string[] = [], tagSlugs: string[] = []) {
  const normalizedSlugs = [...new Set(tagSlugs.map((slug) => slugify(slug)).filter(Boolean))];
  const tags = await prisma.tag.findMany({
    where: {
      OR: [{ id: { in: tagIds } }, { slug: { in: normalizedSlugs } }],
    },
  });
  const existingSlugs = new Set(tags.map((tag) => tag.slug));
  const createdTags = await Promise.all(
    normalizedSlugs
      .filter((slug) => !existingSlugs.has(slug))
      .map((slug) =>
        prisma.tag.upsert({
          where: { slug },
          update: {},
          create: {
            name: slug
              .split('-')
              .filter(Boolean)
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' '),
            slug,
            color: '#194890',
          },
        }),
      ),
  );
  const ids = [...new Set([...tags, ...createdTags].map((tag) => tag.id))];
  return ids.map((tagId) => ({ tagId }));
}

function publishFields(status: string, publishedAt?: string | null, scheduledAt?: string | null) {
  const now = new Date();
  if (status === 'PUBLISHED') {
    return {
      publishedAt: publishedAt ? new Date(publishedAt) : now,
      scheduledAt: null,
    };
  }
  if (status === 'SCHEDULED') {
    return {
      publishedAt: null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
  return { publishedAt: null, scheduledAt: null };
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

function adPayload(input: any) {
  return {
    ...input,
    key: input.key ? slugify(input.key) : undefined,
    startsAt: nullableDate(input.startsAt),
    endsAt: nullableDate(input.endsAt),
  };
}

function analyticsPayload(input: any) {
  return {
    ...input,
    date: new Date(input.date),
  };
}

function publicAdWhere() {
  const now = new Date();
  return {
    enabled: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

router.get('/health', (_req, res) => {
  ok(res, { status: 'healthy', service: 'phulpur24-api', time: new Date().toISOString() });
});

router.post(
  '/auth/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user || user.status !== 'ACTIVE') unauthorized('Invalid email or password.');
    const valid = await verifyPassword(req.body.password, user.passwordHash);
    if (!valid) unauthorized('Invalid email or password.');

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      status: user.status as any,
    };
    const accessToken = signAccessToken(authUser);
    const refreshToken = await createRefreshToken({
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({ actorId: user.id, actorEmail: user.email, action: 'LOGIN', resource: 'Auth', ip: req.ip });
    ok(res, { user: safeUser(user), accessToken, refreshToken });
  }),
);

router.post(
  '/auth/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    ok(res, await rotateRefreshToken({ token: req.body.refreshToken, ip: req.ip, userAgent: req.headers['user-agent'] }));
  }),
);

router.post(
  '/auth/logout',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.body.refreshToken);
    ok(res, { loggedOut: true });
  }),
);

router.get('/auth/me', authenticate, (req, res) => {
  ok(res, { user: req.user });
});

router.get(
  '/public/settings',
  asyncHandler(async (_req, res) => {
    ok(res, await getSiteSettings());
  }),
);

router.get(
  '/public/robots.txt',
  asyncHandler(async (_req, res) => {
    const settings = await getSiteSettings();
    const base = siteUrl(settings);
    const robots = [
      'User-agent: *',
      settings.robotsIndex ? 'Allow: /' : 'Disallow: /',
      `Sitemap: ${absoluteUrl(base, '/api/public/sitemap.xml')}`,
      '',
    ].join('\n');
    res.type('text/plain').send(robots);
  }),
);

router.get(
  '/public/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const settings = await getSiteSettings();
    const base = siteUrl(settings);
    const [posts, categories, pages] = await Promise.all([
      prisma.post.findMany({
        where: { deletedAt: null, status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true }, orderBy: { name: 'asc' } }),
      prisma.staticPage.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true }, orderBy: { title: 'asc' } }),
    ]);
    const urls = [
      { loc: absoluteUrl(base, '/'), lastmod: new Date().toISOString() },
      ...categories.map((item) => ({ loc: absoluteUrl(base, `/category/${item.slug}`), lastmod: item.updatedAt.toISOString() })),
      ...pages.map((item) => ({ loc: absoluteUrl(base, ['about', 'privacy', 'terms', 'contact'].includes(item.slug) ? `/${item.slug}` : `/page/${item.slug}`), lastmod: item.updatedAt.toISOString() })),
      ...posts.map((item) => ({ loc: absoluteUrl(base, `/article/${item.slug}`), lastmod: item.updatedAt.toISOString() })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${escapeXml(url.loc)}</loc><lastmod>${url.lastmod}</lastmod></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  }),
);

router.get(
  '/public/rss.xml',
  asyncHandler(async (_req, res) => {
    const settings = await getSiteSettings();
    const base = siteUrl(settings);
    const posts = await prisma.post.findMany({
      where: { deletedAt: null, status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      include: { category: true, author: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    const channelTitle = settings.siteTitle || 'Phulpur24';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(channelTitle)}</title><link>${escapeXml(base)}</link><description>${escapeXml(settings.tagline || settings.defaultMetaDescription)}</description>${posts
      .map((post) => {
        const link = absoluteUrl(base, `/article/${post.slug}`);
        return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><category>${escapeXml(post.category.name)}</category><author>${escapeXml(post.author.email)} (${escapeXml(post.author.name)})</author><pubDate>${(post.publishedAt ?? post.updatedAt).toUTCString()}</pubDate><description>${escapeXml(post.excerpt)}</description></item>`;
      })
      .join('')}</channel></rss>`;
    res.type('application/rss+xml').send(xml);
  }),
);

router.get(
  '/public/pages',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.staticPage.findMany({ where: { status: 'PUBLISHED' }, orderBy: { title: 'asc' } }));
  }),
);

router.get(
  '/public/pages/:slug',
  asyncHandler(async (req, res) => {
    const page = await prisma.staticPage.findFirst({ where: { slug: paramString(req.params.slug), status: 'PUBLISHED' } });
    if (!page) notFound('Page not found.');
    ok(res, page);
  }),
);

router.get(
  '/public/ads',
  asyncHandler(async (req, res) => {
    const placement = paramString(req.query.placement as string | string[] | undefined);
    const where: any = publicAdWhere();
    if (placement) where.placement = placement;
    ok(res, await prisma.adPlacement.findMany({ where, orderBy: [{ placement: 'asc' }, { name: 'asc' }] }));
  }),
);

router.get(
  '/public/navigation',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.navigationItem.findMany({ where: { enabled: true }, orderBy: [{ location: 'asc' }, { position: 'asc' }] }));
  }),
);

router.get(
  '/public/categories',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } }));
  }),
);

router.get(
  '/public/tags',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.tag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } }));
  }),
);

router.get(
  '/public/posts',
  validateQuery(paginationSchema.extend({ category: z.string().optional(), date: z.enum(['all', '24h', '7d', '30d']).optional() })),
  asyncHandler(async (req, res) => {
    const { page, limit, q, sort, category, date } = queryData(req);
    const where: any = {
      deletedAt: null,
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
    };
    if (category) where.category = { slug: category };
    if (date && date !== 'all') {
      const days = date === '24h' ? 1 : date === '7d' ? 7 : 30;
      where.publishedAt.gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { content: { contains: q } },
      ];
    }
    const orderBy = sort === 'popular' ? { views: 'desc' as const } : { publishedAt: 'desc' as const };
    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({ where, include: postInclude, orderBy, skip: (page - 1) * limit, take: limit }),
    ]);
    ok(res, posts.map(mapPost), { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

router.get(
  '/public/posts/:slug',
  asyncHandler(async (req, res) => {
    const idOrSlug = paramString(req.params.slug);
    const now = new Date();
    const existing = await prisma.post.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
        status: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      select: { id: true },
    });
    if (!existing) notFound('Article not found.');

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: { views: { increment: 1 } },
      include: {
        ...postInclude,
        comments: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    ok(res, mapPost(post));
  }),
);

router.post(
  '/public/posts/:id/comments',
  validateBody(commentPublicSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({ where: { id: paramString(req.params.id), deletedAt: null, status: 'PUBLISHED' } });
    if (!post) notFound('Article not found.');
    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        author: req.body.author,
        email: req.body.email,
        content: req.body.content,
        status: 'PENDING',
      },
    });
    created(res, comment);
  }),
);

router.post(
  '/public/newsletter',
  validateBody(newsletterSchema),
  asyncHandler(async (req, res) => {
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: req.body.email },
      update: { source: req.body.source, status: 'ACTIVE' },
      create: req.body,
    });
    created(res, subscriber);
  }),
);

router.post(
  '/public/contact',
  validateBody(contactMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.create({
      data: {
        ...req.body,
        status: 'NEW',
        ipHash: hashIp(req.ip),
        userAgent: req.headers['user-agent']?.slice(0, 300),
      },
    });
    created(res, message);
  }),
);

router.use('/admin', authenticate);

router.get(
  '/admin/ai/capabilities',
  requireRole('AUTHOR'),
  asyncHandler(async (_req, res) => {
    ok(res, await aiCapabilities());
  }),
);

router.post(
  '/admin/ai/generate-news',
  requireRole('AUTHOR'),
  validateBody(aiGenerateNewsSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof aiGenerateNewsSchema>;
    const focusKeywords = parseKeywords(body.focusKeywords);
    if (!focusKeywords.length) badRequest('Provide at least one focus keyword or phrase.');
    const draft = await generateNewsDraft({
      provider: body.provider,
      model: body.model,
      topic: body.topic,
      focusKeywords,
      tone: body.tone,
      language: body.language,
      audience: body.audience,
      articleLength: body.articleLength,
    });
    await writeAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'AI_GENERATE_NEWS',
      resource: 'Post',
      detail: `${body.provider}:${draft.model} — ${body.topic.slice(0, 100)}`,
      ip: req.ip,
    });
    ok(res, draft);
  }),
);

router.post(
  '/admin/ai/generate-post-image',
  requireRole('AUTHOR'),
  validateBody(aiGeneratePostImageSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof aiGeneratePostImageSchema>;
    const asset = await generatePostImageAsset({
      provider: body.provider,
      model: body.model,
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      category: body.category,
      focusKeyword: body.focusKeyword,
      postId: body.postId,
      imagePrompt: body.imagePrompt,
      placement: body.placement,
      style: body.style,
    });
    await writeAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'AI_GENERATE_IMAGE',
      resource: 'Media',
      resourceId: asset.id,
      detail: `${asset.provider}:${asset.model} - ${body.title.slice(0, 100)}`,
      ip: req.ip,
    });
    ok(res, asset);
  }),
);

router.get(
  '/admin/integrations',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    ok(res, await listIntegrationConfigs());
  }),
);

router.put(
  '/admin/integrations/:provider',
  requireRole('ADMIN'),
  validateBody(integrationConfigSchema),
  asyncHandler(async (req, res) => {
    const { provider } = integrationProviderParamSchema.parse(req.params);
    const saved = await saveIntegrationConfig(provider, req.body);
    await writeAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'UPSERT',
      resource: 'IntegrationSecret',
      resourceId: provider,
      detail: saved.label,
      ip: req.ip,
    });
    ok(res, saved);
  }),
);

router.post(
  '/admin/integrations/:provider/test',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { provider } = integrationProviderParamSchema.parse(req.params);
    const configRow = (await listIntegrationConfigs()).find((item) => item.provider === provider);
    if (!configRow) notFound('Integration not found.');
    ok(res, {
      provider,
      ready: Boolean(configRow.configured && configRow.enabled),
      source: configRow.source,
      message: configRow.enabled
        ? configRow.configured
          ? `${configRow.label} has a saved key or environment key.`
          : `${configRow.label} is enabled but no key is configured.`
        : `${configRow.label} is disabled.`,
    });
  }),
);

router.delete(
  '/admin/integrations/:provider',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { provider } = integrationProviderParamSchema.parse(req.params);
    await deleteIntegrationConfig(provider);
    await writeAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'DELETE',
      resource: 'IntegrationSecret',
      resourceId: provider,
      ip: req.ip,
    });
    ok(res, { deleted: true });
  }),
);

router.get(
  '/admin/analytics',
  requireRole('AUTHOR'),
  asyncHandler(async (_req, res) => {
    const [posts, published, comments, subscribers, views] = await Promise.all([
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      prisma.comment.count(),
      prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.post.aggregate({ _sum: { views: true }, where: { deletedAt: null } }),
    ]);
    const [topPosts, snapshots] = await Promise.all([
      prisma.post.findMany({
        where: { deletedAt: null },
        orderBy: { views: 'desc' },
        take: 8,
        include: postInclude,
      }),
      prisma.analyticsSnapshot.findMany({ orderBy: { date: 'asc' }, take: 30 }),
    ]);
    const latest = snapshots.at(-1);
    ok(res, {
      posts,
      published,
      comments,
      subscribers,
      views: views._sum.views ?? 0,
      topPosts: topPosts.map(mapPost),
      snapshots,
      trafficSources: latest
        ? [
            { name: 'Direct', value: latest.direct },
            { name: 'Search', value: latest.search },
            { name: 'Social', value: latest.social },
            { name: 'Referral', value: latest.referral },
          ]
        : [],
      deviceBreakdown: latest
        ? [
            { device: 'Desktop', users: latest.desktopUsers },
            { device: 'Mobile', users: latest.mobileUsers },
            { device: 'Tablet', users: latest.tabletUsers },
          ]
        : [],
      activeUsers: latest?.activeUsers ?? 0,
      avgLoadMs: latest?.avgLoadMs ?? 0,
    });
  }),
);

router.get(
  '/admin/posts',
  requireRole('AUTHOR'),
  validateQuery(paginationSchema.extend({ status: z.string().optional(), category: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { page, limit, q, sort, status, category } = queryData(req);
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (category) where.category = { slug: category };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { content: { contains: q } },
      ];
    }
    const orderBy = sort === 'popular' ? { views: 'desc' as const } : { updatedAt: 'desc' as const };
    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({ where, include: postInclude, orderBy, skip: (page - 1) * limit, take: limit }),
    ]);
    ok(res, posts.map(mapPost), { page, limit, total, totalPages: Math.ceil(total / limit) });
  }),
);

router.post(
  '/admin/posts',
  requireRole('AUTHOR'),
  validateBody(postSchema),
  asyncHandler(async (req, res) => {
    const category = await resolveCategory(req.body);
    const authorId = req.body.authorId ?? req.user!.id;
    if (authorId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'EDITOR') forbidden('Only editors can assign another author.');
    const tagCreates = await resolveTagIds(req.body.tagIds, req.body.tagSlugs);
    const statusDates = publishFields(req.body.status, req.body.publishedAt, req.body.scheduledAt);
    const featuredImageId =
      req.body.featuredImageId ??
      (req.body.status === 'PUBLISHED'
        ? await ensureGeneratedFeaturedImage({
            postId: req.body.id || slugify(req.body.title),
            title: req.body.title,
            categoryName: category.name,
            uploaderId: req.user!.id,
          })
        : null);
    const post = await prisma.post.create({
      data: {
        id: req.body.id,
        title: req.body.title,
        slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.title),
        excerpt: req.body.excerpt,
        content: req.body.content,
        status: req.body.status,
        featured: req.body.featured,
        breaking: req.body.breaking,
        seoTitle: req.body.seoTitle,
        metaDescription: req.body.metaDescription,
        focusKeyword: req.body.focusKeyword,
        canonicalUrl: req.body.canonicalUrl,
        readTime: req.body.readTime,
        views: req.body.views,
        ...statusDates,
        authorId,
        categoryId: category.id,
        featuredImageId,
        ...(tagCreates.length ? { tags: { createMany: { data: tagCreates } } } : {}),
      },
      include: postInclude,
    });
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'CREATE', resource: 'Post', resourceId: post.id, detail: post.title, ip: req.ip });
    created(res, mapPost(post));
  }),
);

router.get(
  '/admin/posts/:id',
  requireRole('AUTHOR'),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({ where: { id: paramString(req.params.id), deletedAt: null }, include: postInclude });
    if (!post) notFound('Post not found.');
    ok(res, mapPost(post));
  }),
);

router.patch(
  '/admin/posts/:id',
  requireRole('AUTHOR'),
  validateBody(postPatchSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.post.findFirst({ where: { id: paramString(req.params.id), deletedAt: null } });
    if (!existing) notFound('Post not found.');
    if (existing.authorId !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'EDITOR') forbidden('Only the author or an editor can update this post.');

    const category = req.body.categoryId || req.body.categorySlug ? await resolveCategory(req.body) : null;
    const status = req.body.status ?? existing.status;
    const statusDates = req.body.status ? publishFields(status, req.body.publishedAt, req.body.scheduledAt) : {};
    const tagCreates = req.body.tagIds || req.body.tagSlugs ? await resolveTagIds(req.body.tagIds, req.body.tagSlugs) : null;
    const categoryForImage = category ?? (await prisma.category.findUnique({ where: { id: existing.categoryId } }));
    const nextFeaturedImageId =
      req.body.featuredImageId === undefined ? existing.featuredImageId : req.body.featuredImageId;
    const featuredImageId =
      status === 'PUBLISHED' && !nextFeaturedImageId
        ? await ensureGeneratedFeaturedImage({
            postId: existing.id,
            title: req.body.title ?? existing.title,
            categoryName: categoryForImage?.name ?? 'News',
            uploaderId: req.user!.id,
          })
        : nextFeaturedImageId;

    const post = await prisma.$transaction(async (tx) => {
      if (tagCreates) {
        await tx.postTag.deleteMany({ where: { postId: existing.id } });
      }
      return tx.post.update({
        where: { id: existing.id },
        data: {
          title: req.body.title,
          slug: req.body.slug ? slugify(req.body.slug) : undefined,
          excerpt: req.body.excerpt,
          content: req.body.content,
          status: req.body.status,
          featured: req.body.featured,
          breaking: req.body.breaking,
          seoTitle: req.body.seoTitle,
          metaDescription: req.body.metaDescription,
          focusKeyword: req.body.focusKeyword,
          canonicalUrl: req.body.canonicalUrl,
          readTime: req.body.readTime,
          views: req.body.views,
          categoryId: category?.id,
          authorId: req.body.authorId,
          ...statusDates,
          ...(tagCreates?.length ? { tags: { createMany: { data: tagCreates } } } : {}),
          featuredImageId,
        },
        include: postInclude,
      });
    });
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'UPDATE', resource: 'Post', resourceId: post.id, detail: post.title, ip: req.ip });
    ok(res, mapPost(post));
  }),
);

router.delete(
  '/admin/posts/:id',
  requireRole('EDITOR'),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.update({ where: { id: paramString(req.params.id) }, data: { deletedAt: new Date() } }).catch(() => null);
    if (!post) notFound('Post not found.');
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'DELETE', resource: 'Post', resourceId: post.id, detail: post.title, ip: req.ip });
    ok(res, { deleted: true });
  }),
);

router.post(
  '/admin/posts/bulk-status',
  requireRole('EDITOR'),
  validateBody(bulkPostStatusSchema),
  asyncHandler(async (req, res) => {
    const statusDates = publishFields(req.body.status);
    if (req.body.status === 'PUBLISHED') {
      const missingImages = await prisma.post.findMany({
        where: { id: { in: req.body.ids }, deletedAt: null, featuredImageId: null },
        include: { category: true },
      });
      for (const post of missingImages) {
        const featuredImageId = await ensureGeneratedFeaturedImage({
          postId: post.id,
          title: post.title,
          categoryName: post.category.name,
          uploaderId: req.user!.id,
        });
        await prisma.post.update({ where: { id: post.id }, data: { featuredImageId } });
      }
    }
    const result = await prisma.post.updateMany({ where: { id: { in: req.body.ids } }, data: { status: req.body.status, ...statusDates } });
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'BULK_STATUS', resource: 'Post', detail: `${result.count} posts to ${req.body.status}`, ip: req.ip });
    ok(res, result);
  }),
);

router.post(
  '/admin/posts/bulk-delete',
  requireRole('EDITOR'),
  validateBody(bulkDeleteSchema),
  asyncHandler(async (req, res) => {
    const result = await prisma.post.updateMany({ where: { id: { in: req.body.ids } }, data: { deletedAt: new Date() } });
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'BULK_DELETE', resource: 'Post', detail: `${result.count} posts`, ip: req.ip });
    ok(res, result);
  }),
);

router.get('/admin/categories', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } }))));
router.post('/admin/categories', requireRole('EDITOR'), validateBody(categorySchema), asyncHandler(async (req, res) => {
  const category = await prisma.category.create({ data: { ...req.body, slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.name) } });
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'CREATE', resource: 'Category', resourceId: category.id, detail: category.name, ip: req.ip });
  created(res, category);
}));
router.patch('/admin/categories/:id', requireRole('EDITOR'), validateBody(categorySchema.partial()), asyncHandler(async (req, res) => {
  const category = await prisma.category.update({ where: idParamSchema.parse(req.params), data: { ...req.body, slug: req.body.slug ? slugify(req.body.slug) : undefined } }).catch(() => null);
  if (!category) notFound('Category not found.');
  ok(res, category);
}));
router.delete('/admin/categories/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  const count = await prisma.post.count({ where: { categoryId: paramString(req.params.id), deletedAt: null } });
  if (count > 0) badRequest('Move or delete posts before deleting this category.');
  await prisma.category.delete({ where: idParamSchema.parse(req.params) });
  ok(res, { deleted: true });
}));

router.get('/admin/tags', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.tag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } }))));
router.post('/admin/tags', requireRole('AUTHOR'), validateBody(tagSchema), asyncHandler(async (req, res) => created(res, await prisma.tag.create({ data: { ...req.body, slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.name) } }))));
router.post('/admin/tags/merge', requireRole('EDITOR'), validateBody(tagMergeSchema), asyncHandler(async (req, res) => {
  const target = await prisma.tag.findUnique({ where: { id: req.body.targetId } });
  if (!target) notFound('Target tag not found.');
  const sourceIds = req.body.sourceIds.filter((id: string) => id !== target.id);
  await prisma.$transaction(async (tx) => {
    const sourceLinks = await tx.postTag.findMany({ where: { tagId: { in: sourceIds } } });
    for (const link of sourceLinks) {
      await tx.postTag.upsert({
        where: { postId_tagId: { postId: link.postId, tagId: target.id } },
        update: {},
        create: { postId: link.postId, tagId: target.id },
      });
    }
    await tx.tag.deleteMany({ where: { id: { in: sourceIds } } });
  });
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'MERGE', resource: 'Tag', resourceId: target.id, detail: `${sourceIds.length} tags into ${target.slug}`, ip: req.ip });
  ok(res, { merged: sourceIds.length, targetId: target.id });
}));
router.patch('/admin/tags/:id', requireRole('AUTHOR'), validateBody(tagSchema.partial()), asyncHandler(async (req, res) => {
  const tag = await prisma.tag.update({ where: idParamSchema.parse(req.params), data: { ...req.body, slug: req.body.slug ? slugify(req.body.slug) : undefined } }).catch(() => null);
  if (!tag) notFound('Tag not found.');
  ok(res, tag);
}));
router.delete('/admin/tags/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.tag.delete({ where: idParamSchema.parse(req.params) });
  ok(res, { deleted: true });
}));

router.get('/admin/media', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.mediaAsset.findMany({ orderBy: { uploadedAt: 'desc' } }))));
router.post('/admin/media', requireRole('AUTHOR'), validateBody(mediaSchema), asyncHandler(async (req, res) => created(res, await prisma.mediaAsset.create({ data: { ...req.body, uploaderId: req.user!.id } }))));
router.patch('/admin/media/:id', requireRole('AUTHOR'), validateBody(mediaSchema.partial()), asyncHandler(async (req, res) => {
  const media = await prisma.mediaAsset.update({ where: idParamSchema.parse(req.params), data: req.body }).catch(() => null);
  if (!media) notFound('Media asset not found.');
  ok(res, media);
}));
router.delete('/admin/media/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.mediaAsset.delete({ where: idParamSchema.parse(req.params) });
  ok(res, { deleted: true });
}));

router.get('/admin/comments', requireRole('AUTHOR'), validateQuery(paginationSchema.extend({ status: z.string().optional() })), asyncHandler(async (req, res) => {
  const { page, limit, status } = queryData(req);
  const where = status ? { status } : {};
  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({ where, include: { post: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  ok(res, comments, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));
router.patch('/admin/comments/:id/status', requireRole('EDITOR'), validateBody(commentStatusUpdateSchema), asyncHandler(async (req, res) => {
  const comment = await prisma.comment.update({ where: idParamSchema.parse(req.params), data: { status: req.body.status } }).catch(() => null);
  if (!comment) notFound('Comment not found.');
  ok(res, comment);
}));
router.delete('/admin/comments/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.comment.delete({ where: idParamSchema.parse(req.params) });
  ok(res, { deleted: true });
}));

router.get('/admin/users', requireRole('ADMIN'), asyncHandler(async (_req, res) => ok(res, (await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })).map(safeUser))));
router.post('/admin/users', requireRole('ADMIN'), validateBody(userCreateSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.create({ data: { ...req.body, passwordHash: await hashPassword(req.body.password), password: undefined } as any });
  created(res, safeUser(user));
}));
router.patch('/admin/users/:id', requireSelfOrRole('id', 'ADMIN'), validateBody(userPatchSchema), asyncHandler(async (req, res) => {
  if (req.user!.id === req.params.id && (req.body.role || req.body.status)) forbidden('You cannot change your own role or status.');
  const data: any = { ...req.body };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }
  const user = await prisma.user.update({ where: idParamSchema.parse(req.params), data }).catch(() => null);
  if (!user) notFound('User not found.');
  ok(res, safeUser(user));
}));
router.delete('/admin/users/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  if (req.user!.id === req.params.id) badRequest('You cannot delete your own account.');
  await prisma.user.delete({ where: idParamSchema.parse(req.params) });
  ok(res, { deleted: true });
}));

router.get('/admin/settings', requireRole('EDITOR'), asyncHandler(async (_req, res) => ok(res, await getSiteSettings())));
router.put('/admin/settings', requireRole('ADMIN'), validateBody(settingsSchema), asyncHandler(async (req, res) => {
  const settings = await prisma.siteSetting.upsert({ where: { id: 'site' }, update: req.body, create: { id: 'site', ...req.body } });
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'UPDATE', resource: 'Settings', resourceId: 'site', ip: req.ip });
  ok(res, settings);
}));

router.get('/admin/pages', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.staticPage.findMany({ orderBy: { updatedAt: 'desc' } }))));
router.post('/admin/pages', requireRole('EDITOR'), validateBody(staticPageSchema), asyncHandler(async (req, res) => {
  const page = await prisma.staticPage.create({ data: { ...req.body, slug: slugify(req.body.slug) } });
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'CREATE', resource: 'Page', resourceId: page.id, detail: page.title, ip: req.ip });
  created(res, page);
}));
router.patch('/admin/pages/:id', requireRole('EDITOR'), validateBody(staticPageSchema.partial()), asyncHandler(async (req, res) => {
  const page = await prisma.staticPage.update({
    where: idParamSchema.parse(req.params),
    data: { ...req.body, slug: req.body.slug ? slugify(req.body.slug) : undefined },
  }).catch(() => null);
  if (!page) notFound('Page not found.');
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'UPDATE', resource: 'Page', resourceId: page.id, detail: page.title, ip: req.ip });
  ok(res, page);
}));
router.delete('/admin/pages/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.staticPage.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  ok(res, { deleted: true });
}));

router.get('/admin/contact-messages', requireRole('AUTHOR'), validateQuery(paginationSchema.extend({ status: z.string().optional() })), asyncHandler(async (req, res) => {
  const { page, limit, q, status } = queryData(req);
  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { subject: { contains: q } },
      { message: { contains: q } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  ok(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));
router.patch('/admin/contact-messages/:id', requireRole('EDITOR'), validateBody(contactMessagePatchSchema), asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.update({
    where: idParamSchema.parse(req.params),
    data: { status: req.body.status, resolvedAt: req.body.status === 'RESOLVED' ? new Date() : null },
  }).catch(() => null);
  if (!message) notFound('Contact message not found.');
  ok(res, message);
}));
router.delete('/admin/contact-messages/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.contactMessage.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  ok(res, { deleted: true });
}));

router.get('/admin/ads', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.adPlacement.findMany({ orderBy: [{ placement: 'asc' }, { name: 'asc' }] }))));
router.post('/admin/ads', requireRole('EDITOR'), validateBody(adPlacementSchema), asyncHandler(async (req, res) => {
  const ad = await prisma.adPlacement.create({ data: adPayload(req.body) });
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'CREATE', resource: 'Ad', resourceId: ad.id, detail: ad.name, ip: req.ip });
  created(res, ad);
}));
router.patch('/admin/ads/:id', requireRole('EDITOR'), validateBody(adPlacementSchema.partial()), asyncHandler(async (req, res) => {
  const ad = await prisma.adPlacement.update({ where: idParamSchema.parse(req.params), data: adPayload(req.body) }).catch(() => null);
  if (!ad) notFound('Ad placement not found.');
  ok(res, ad);
}));
router.delete('/admin/ads/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.adPlacement.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  ok(res, { deleted: true });
}));

router.get('/admin/navigation', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.navigationItem.findMany({ orderBy: [{ location: 'asc' }, { position: 'asc' }] }))));
router.post('/admin/navigation', requireRole('EDITOR'), validateBody(navigationItemSchema), asyncHandler(async (req, res) => {
  created(res, await prisma.navigationItem.create({ data: req.body }));
}));
router.patch('/admin/navigation/:id', requireRole('EDITOR'), validateBody(navigationItemSchema.partial()), asyncHandler(async (req, res) => {
  const item = await prisma.navigationItem.update({ where: idParamSchema.parse(req.params), data: req.body }).catch(() => null);
  if (!item) notFound('Navigation item not found.');
  ok(res, item);
}));
router.delete('/admin/navigation/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.navigationItem.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  ok(res, { deleted: true });
}));

router.get('/admin/analytics/snapshots', requireRole('AUTHOR'), asyncHandler(async (_req, res) => ok(res, await prisma.analyticsSnapshot.findMany({ orderBy: { date: 'asc' } }))));
router.post('/admin/analytics/snapshots', requireRole('EDITOR'), validateBody(analyticsSnapshotSchema), asyncHandler(async (req, res) => {
  created(res, await prisma.analyticsSnapshot.create({ data: analyticsPayload(req.body) }));
}));
router.patch('/admin/analytics/snapshots/:id', requireRole('EDITOR'), validateBody(analyticsSnapshotSchema.partial()), asyncHandler(async (req, res) => {
  const row = await prisma.analyticsSnapshot.update({ where: idParamSchema.parse(req.params), data: req.body.date ? analyticsPayload(req.body) : req.body }).catch(() => null);
  if (!row) notFound('Analytics snapshot not found.');
  ok(res, row);
}));
router.delete('/admin/analytics/snapshots/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  await prisma.analyticsSnapshot.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  ok(res, { deleted: true });
}));

router.get('/admin/newsletter/subscribers', requireRole('EDITOR'), validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, q } = queryData(req);
  const where = q ? { email: { contains: q } } : {};
  const [total, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  ok(res, subscribers, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

router.patch('/admin/newsletter/subscribers/:id', requireRole('EDITOR'), validateBody(newsletterSubscriberPatchSchema), asyncHandler(async (req, res) => {
  const subscriber = await prisma.newsletterSubscriber.update({
    where: idParamSchema.parse(req.params),
    data: { status: req.body.status },
  }).catch(() => null);
  if (!subscriber) notFound('Newsletter subscriber not found.');
  await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'UPDATE', resource: 'NewsletterSubscriber', resourceId: subscriber.id, detail: subscriber.email, ip: req.ip });
  ok(res, subscriber);
}));

router.delete('/admin/newsletter/subscribers/:id', requireRole('EDITOR'), asyncHandler(async (req, res) => {
  const subscriber = await prisma.newsletterSubscriber.delete({ where: idParamSchema.parse(req.params) }).catch(() => null);
  if (subscriber) {
    await writeAudit({ actorId: req.user!.id, actorEmail: req.user!.email, action: 'DELETE', resource: 'NewsletterSubscriber', resourceId: subscriber.id, detail: subscriber.email, ip: req.ip });
  }
  ok(res, { deleted: true });
}));

router.get('/admin/audit-log', requireRole('ADMIN'), validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit } = queryData(req);
  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({ orderBy: { at: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  ok(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
}));

export default router;
