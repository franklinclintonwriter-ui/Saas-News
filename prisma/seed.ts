import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createPrismaClient } from '../api/src/prisma-client.js';

dotenv.config();

const prisma = createPrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function deterministicViews(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 400 + (h % 48000);
}

function escapeSvgText(input: string): string {
  return input.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return entities[char] ?? char;
  });
}

function wrapSvgTitle(input: string, maxChars = 30): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of input.split(/\s+/)) {
    if (!line) {
      line = word;
    } else if ((line.length + word.length + 1) <= maxChars) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function temporaryImageDataUrl(title: string, category: string, index: number): string {
  const palettes = [
    ['#194890', '#DC2626', '#F8FAFC'],
    ['#0F766E', '#F59E0B', '#F8FAFC'],
    ['#111827', '#2563EB', '#F8FAFC'],
    ['#7C2D12', '#10B981', '#FFF7ED'],
    ['#4338CA', '#EC4899', '#F8FAFC'],
    ['#164E63', '#22C55E', '#ECFEFF'],
  ] as const;
  const [background, accent, foreground] = palettes[index % palettes.length]!;
  const titleLines = wrapSvgTitle(title)
    .map((line, lineIndex) => `<tspan x="90" dy="${lineIndex === 0 ? 0 : 78}">${escapeSvgText(line)}</tspan>`)
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
    `<text x="90" y="685" fill="${foreground}" font-family="Arial,sans-serif" font-size="30" opacity="0.9">Editorial image ${index + 1}</text>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function initials(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarDataUrl(name: string, title: string, index: number): string {
  const colors = ['#194890', '#0F766E', '#7C3AED', '#B91C1C', '#111827', '#2563EB'];
  const color = colors[index % colors.length]!;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
    `<rect width="400" height="400" fill="${color}"/>`,
    '<circle cx="308" cy="82" r="58" fill="#FFFFFF" opacity="0.16"/>',
    '<circle cx="82" cy="318" r="76" fill="#FFFFFF" opacity="0.12"/>',
    `<text x="200" y="195" text-anchor="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="88" font-weight="700">${escapeSvgText(initials(name))}</text>`,
    `<text x="200" y="252" text-anchor="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="24" opacity="0.88">${escapeSvgText(title.slice(0, 26))}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const categories = [
  ['Technology', 'Latest tech news and updates', '#2563EB'],
  ['Business', 'Business and finance news', '#194890'],
  ['World', 'Global news and events', '#DC2626'],
  ['Politics', 'Political news and analysis', '#7C3AED'],
  ['Sports', 'Sports news and highlights', '#F59E0B'],
  ['Entertainment', 'Entertainment and celebrity news', '#EC4899'],
  ['Science', 'Science and research', '#10B981'],
  ['Health', 'Health and wellness', '#06B6D4'],
] as const;

const tags = [
  ['AI', '#2563EB'],
  ['Machine Learning', '#7C3AED'],
  ['Blockchain', '#10B981'],
  ['Cloud Computing', '#06B6D4'],
  ['Cybersecurity', '#DC2626'],
  ['5G', '#F59E0B'],
  ['IoT', '#EC4899'],
  ['Big Data', '#194890'],
  ['Video', '#111827'],
  ['Highlights', '#DC2626'],
  ['Live Updates', '#0F766E'],
] as const;

const posts = [
  ['Global Climate Summit Reaches Historic Agreement on Carbon Emissions', 'World', 'World leaders unite in unprecedented climate action plan.', 'climate summit carbon emissions world leaders agreement environment'],
  ['Tech Giant Unveils Revolutionary AI Assistant', 'Technology', 'Consumer AI reaches new milestone in reasoning and safety.', 'technology AI assistant artificial intelligence machine learning'],
  ['Stock Markets Hit Record Highs Amid Economic Recovery', 'Business', 'Indices rally as investors weigh inflation data and earnings.', 'business stocks market finance economy earnings'],
  ['Championship Finals: Underdog Team Claims Victory', 'Sports', 'Historic upset caps a dramatic postseason.', 'sports championship finals underdog victory playoffs'],
  ['New Medical Breakthrough Could Transform Cancer Treatment', 'Health', 'Early trial data shows durable responses across cohorts.', 'health medical cancer treatment oncology clinical trial'],
  ['Political Debate Highlights Key Differences on Economic Policy', 'Politics', 'Candidates outline competing visions on growth and deficits.', 'politics debate economy policy election congress'],
  ['Cybersecurity Agencies Warn of Rising Ransomware Campaigns', 'Technology', 'Joint advisory lists indicators of compromise and mitigations.', 'cybersecurity ransomware technology threat intelligence malware agencies'],
  ['Central Banks Signal Cautious Approach to Rate Cuts', 'Business', 'Minutes emphasize data dependence through the next quarter.', 'central bank rates inflation monetary policy business economy bonds'],
  ['Film Festival Opens With Standing Ovation for Opening Night Drama', 'Entertainment', 'Critics praise performances and cinematography in premiere.', 'entertainment film festival cinema hollywood drama premiere critics'],
  ['Renewable Grid Expansion Accelerates Across Coastal States', 'World', 'Offshore wind and storage projects clear regulatory milestones.', 'renewable energy offshore wind grid storage infrastructure climate'],
  ['Space Agency Announces Crewed Mission Timeline to Lunar Gateway', 'Science', 'Partners outline training milestones and launch windows.', 'space moon lunar gateway astronaut mission science world'],
  ['Retailers Report Strong Holiday Demand Despite Macro Headwinds', 'Business', 'E-commerce share gains offset softer foot traffic in malls.', 'retail holiday sales ecommerce business consumer spending macro'],
] as const;

function articleBody(title: string, categoryName: string, excerpt: string, keywords: string): string {
  const focus = keywords.split(/\s+/).filter(Boolean).slice(0, 4).join(', ');
  return [
    `## Overview`,
    `${excerpt} The newsroom is following the story through the lens of public impact, verified sourcing, and practical context for readers who need to understand what changed and why it matters.`,
    `## What Happened`,
    `The latest developments around **${title}** point to a wider shift in ${categoryName.toLowerCase()} coverage. Editors are tracking official statements, available records, expert analysis, and community reaction before drawing conclusions.`,
    `## Why It Matters`,
    `Stories in this area can affect policy decisions, household planning, business confidence, civic debate, and public trust. The most important signal is not only the headline event, but the chain of decisions that follows it.`,
    `## Reader Context`,
    `Key terms and themes for this report include ${focus || categoryName.toLowerCase()}. Readers should watch for primary documents, named sources, and updates that clarify timelines, accountability, and measurable outcomes.`,
    `## What To Watch Next`,
    `The newsroom will continue to update this report as new details are confirmed. Future updates should add direct quotes, additional documents, local reaction, and any corrections needed to keep the public record accurate.`,
  ].join('\n\n');
}

const staticPages = [
  {
    slug: 'about',
    title: 'About Phulpur24',
    excerpt: 'Your trusted source for breaking news, in-depth analysis, and compelling stories from around the world.',
    seoTitle: 'About Phulpur24 - Independent Journalism',
    metaDescription: 'Learn about Phulpur24, our newsroom mission, leadership, editorial values, and commitment to accurate journalism.',
    content: [
      '## Our Story',
      'Founded in 2020, Phulpur24 was created to make accurate, independent journalism easier to discover and trust.',
      'Our editors, reporters, and analysts cover global events, business, technology, culture, science, and public affairs with context and verification.',
      '## Mission',
      'We empower readers with timely, useful reporting that helps them understand the forces shaping their communities and the world.',
      '## Values',
      '- Integrity in reporting',
      '- Independence from commercial pressure',
      '- Transparency about sourcing and corrections',
    ].join('\n\n'),
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    excerpt: 'How Phulpur24 collects, uses, protects, and manages reader information.',
    seoTitle: 'Privacy Policy - Phulpur24',
    metaDescription: 'Read the Phulpur24 privacy policy covering data collection, cookies, retention, security, and reader choices.',
    content: [
      '## Overview',
      'Phulpur24 explains in this policy how we collect, use, disclose, and safeguard information when readers use our websites, newsletters, and related services.',
      '## Information We Collect',
      '- Account and contact details readers provide',
      '- Usage data such as pages viewed, region, device type, and referral source',
      '- Messages sent through contact forms or support channels',
      '## Cookies',
      'We use cookies and similar technologies to remember preferences, measure readership, and improve performance.',
      '## Contact',
      'Questions about privacy can be sent to privacy@phulpur24.com.',
    ].join('\n\n'),
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    excerpt: 'The terms that govern access to and use of Phulpur24 services.',
    seoTitle: 'Terms of Service - Phulpur24',
    metaDescription: 'Review the Phulpur24 terms of service for accounts, content use, prohibited conduct, disclaimers, and contact information.',
    content: [
      '## Agreement',
      'By accessing Phulpur24 you agree to these terms and to our Privacy Policy.',
      '## Use of Content',
      'Editorial content is protected by copyright and applicable law. Redistribution requires permission unless otherwise stated.',
      '## Accounts',
      'You are responsible for safeguarding credentials and for activity under your account.',
      '## Prohibited Conduct',
      '- Attempting to disrupt, scrape, or overload systems',
      '- Posting unlawful, harassing, or deceptive material',
      '- Misrepresenting affiliation with Phulpur24',
      '## Contact',
      'Legal inquiries can be sent to legal@phulpur24.com.',
    ].join('\n\n'),
  },
] as const;

const navigationItems = [
  ['nav-home', 'Home', '/', 'HEADER', 0, false],
  ['nav-about', 'About', '/about', 'UTILITY', 10, false],
  ['nav-contact', 'Contact', '/contact', 'UTILITY', 20, false],
  ['nav-advertise', 'Advertise', '/contact', 'UTILITY', 30, false],
  ['nav-privacy', 'Privacy Policy', '/privacy', 'FOOTER', 10, false],
  ['nav-terms', 'Terms of Service', '/terms', 'FOOTER', 20, false],
] as const;

const adPlacements = [
  ['ad-home-sidebar', 'Homepage Sidebar 300x250', 'home-sidebar', 'Advertisement'],
  ['ad-article-sidebar', 'Article Sidebar 300x600', 'article-sidebar', 'Sponsored'],
  ['ad-category-sidebar', 'Category Sidebar 300x250', 'category-sidebar', 'Advertisement'],
  ['ad-search-sidebar', 'Search Sidebar 300x250', 'search-sidebar', 'Advertisement'],
] as const;

const staffProfiles = [
  {
    name: 'Emma Davis',
    email: 'emma@phulpur24.com',
    role: 'AUTHOR',
    title: 'World affairs correspondent',
    bio: 'Emma reports on diplomacy, climate policy, and global institutions, emphasizing verified records, public documents, and local expert voices.',
    location: 'London',
    twitterUrl: 'https://twitter.com/phulpur24',
    linkedinUrl: 'https://www.linkedin.com',
  },
  {
    name: 'Mike Chen',
    email: 'mike@phulpur24.com',
    role: 'EDITOR',
    title: 'Technology editor',
    bio: 'Mike edits technology and cybersecurity reporting with a focus on primary documentation, platform accountability, and reader-useful context.',
    location: 'San Francisco',
    twitterUrl: 'https://twitter.com/phulpur24',
    linkedinUrl: 'https://www.linkedin.com',
  },
  {
    name: 'John Smith',
    email: 'john@phulpur24.com',
    role: 'AUTHOR',
    title: 'Business reporter',
    bio: 'John covers markets, company earnings, labor, and economic policy for readers who need clear numbers and plain-language analysis.',
    location: 'Chicago',
    twitterUrl: 'https://twitter.com/phulpur24',
    linkedinUrl: 'https://www.linkedin.com',
  },
  {
    name: 'Alex Brown',
    email: 'alex@phulpur24.com',
    role: 'EDITOR',
    title: 'Culture and media editor',
    bio: 'Alex edits entertainment, media, and culture stories with attention to attribution, fairness, and audience transparency.',
    location: 'Los Angeles',
    twitterUrl: 'https://twitter.com/phulpur24',
    linkedinUrl: 'https://www.linkedin.com',
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@phulpur24.com',
    role: 'ADMIN',
    title: 'Editor in chief',
    bio: 'Sarah leads Phulpur24 coverage standards, corrections policy, and newsroom verification workflows.',
    location: 'New York',
    twitterUrl: 'https://twitter.com/phulpur24',
    linkedinUrl: 'https://www.linkedin.com',
  },
] as const;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@phulpur24.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME ?? 'Phulpur24 Admin';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'ADMIN',
      status: 'ACTIVE',
      title: 'Publisher and newsroom administrator',
      bio: 'Manages newsroom operations, security, publishing workflow, and deployment readiness for Phulpur24.',
      avatarUrl: avatarDataUrl(adminName, 'Admin', 0),
      location: 'Phulpur24 HQ',
      websiteUrl: '',
      twitterUrl: 'https://twitter.com/phulpur24',
      linkedinUrl: 'https://www.linkedin.com',
      facebookUrl: '',
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: 'ADMIN',
      status: 'ACTIVE',
      title: 'Publisher and newsroom administrator',
      bio: 'Manages newsroom operations, security, publishing workflow, and deployment readiness for Phulpur24.',
      avatarUrl: avatarDataUrl(adminName, 'Admin', 0),
      location: 'Phulpur24 HQ',
      websiteUrl: '',
      twitterUrl: 'https://twitter.com/phulpur24',
      linkedinUrl: 'https://www.linkedin.com',
      facebookUrl: '',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const staffUsers = [];
  for (let i = 0; i < staffProfiles.length; i++) {
    const profile = staffProfiles[i]!;
    const row = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        role: profile.role,
        status: 'ACTIVE',
        title: profile.title,
        bio: profile.bio,
        avatarUrl: avatarDataUrl(profile.name, profile.title, i + 1),
        location: profile.location,
        websiteUrl: '',
        twitterUrl: profile.twitterUrl,
        linkedinUrl: profile.linkedinUrl,
        facebookUrl: '',
      },
      create: {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        status: 'ACTIVE',
        title: profile.title,
        bio: profile.bio,
        avatarUrl: avatarDataUrl(profile.name, profile.title, i + 1),
        location: profile.location,
        websiteUrl: '',
        twitterUrl: profile.twitterUrl,
        linkedinUrl: profile.linkedinUrl,
        facebookUrl: '',
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    staffUsers.push(row);
  }

  await prisma.siteSetting.upsert({
    where: { id: 'site' },
    update: {},
    create: {
      id: 'site',
      siteTitle: 'Phulpur24',
      tagline: 'Verified local news, analysis, and updates from Phulpur',
      logoAlt: 'Phulpur24',
      logoHeight: 40,
      showHeaderLogo: true,
      showSiteTitle: true,
      showFooterLogo: true,
      showFooterSiteTitle: true,
      siteUrl: 'http://localhost:5174',
      organizationName: 'Phulpur24',
      defaultSeoTitle: 'Phulpur24 - Local News, Analysis and Updates',
      defaultMetaDescription: 'Read Phulpur24 for verified local news, public-interest reporting, analysis, and timely updates from Phulpur, Mymensingh, Bangladesh and beyond.',
      defaultKeywords: 'Phulpur24, Phulpur news, Mymensingh news, Bangladesh news, local news, breaking news',
      twitterHandle: '',
      robotsIndex: true,
      robotsFollow: true,
      structuredDataEnabled: true,
      schemaType: 'NewsMediaOrganization',
      primaryColor: '#194890',
      accentColor: '#DC2626',
      headerBackground: '#FFFFFF',
      footerBackground: '#0B1220',
      footerAbout: 'Phulpur24 publishes verified local news, analysis, and public-interest reporting for readers in Phulpur and surrounding communities.',
      copyright: '(c) 2026 Phulpur24. All rights reserved.',
      contactEmail: 'contact@phulpur24.com',
      supportEmail: 'support@phulpur24.com',
      pressEmail: 'press@phulpur24.com',
      advertisingEmail: 'ads@phulpur24.com',
      tipsEmail: 'tips@phulpur24.com',
      businessHours: 'Mon-Fri 9am-6pm EST',
      officeLocations: 'New York|123 News Street, NY 10001|+1 (555) 123-4567\nLondon|456 Fleet Street, EC4Y 1AA|+44 20 1234 5678\nTokyo|789 Shibuya, 150-0002|+81 3 1234 5678',
      newsletterFromName: 'Phulpur24 Team',
      newsletterFromEmail: 'newsletter@phulpur24.com',
    },
  });

  for (const page of staticPages) {
    await prisma.staticPage.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        excerpt: page.excerpt,
        content: page.content,
        status: 'PUBLISHED',
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
      },
      create: {
        slug: page.slug,
        title: page.title,
        excerpt: page.excerpt,
        content: page.content,
        status: 'PUBLISHED',
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
      },
    });
  }

  for (const [id, label, href, location, position, external] of navigationItems) {
    await prisma.navigationItem.upsert({
      where: { id },
      update: { label, href, location, position, external, enabled: true },
      create: { id, label, href, location, position, external, enabled: true },
    });
  }

  for (let i = 0; i < adPlacements.length; i++) {
    const [key, name, placement, label] = adPlacements[i]!;
    await prisma.adPlacement.upsert({
      where: { key },
      update: {
        name,
        placement,
        label,
        imageUrl: temporaryImageDataUrl(name, 'Advertisement', i + 20),
        targetUrl: 'https://example.com/advertise',
        enabled: true,
      },
      create: {
        key,
        name,
        placement,
        label,
        imageUrl: temporaryImageDataUrl(name, 'Advertisement', i + 20),
        targetUrl: 'https://example.com/advertise',
        enabled: true,
      },
    });
  }

  const analyticsBase = Date.UTC(2026, 3, 15, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const date = new Date(analyticsBase + i * 24 * 60 * 60 * 1000);
    const views = 42000 + i * 5800;
    const visitors = 30000 + i * 4300;
    await prisma.analyticsSnapshot.upsert({
      where: { date },
      update: {
        views,
        visitors,
        sessions: Math.round(visitors * 0.88),
        activeUsers: 900 + i * 73,
        avgLoadMs: 1320 - i * 18,
        direct: 34 + i,
        search: 28 + i,
        social: 21,
        referral: 17 - Math.min(i, 5),
        desktopUsers: 48000 + i * 900,
        mobileUsers: 36000 + i * 1200,
        tabletUsers: 10000 + i * 300,
      },
      create: {
        date,
        views,
        visitors,
        sessions: Math.round(visitors * 0.88),
        activeUsers: 900 + i * 73,
        avgLoadMs: 1320 - i * 18,
        direct: 34 + i,
        search: 28 + i,
        social: 21,
        referral: 17 - Math.min(i, 5),
        desktopUsers: 48000 + i * 900,
        mobileUsers: 36000 + i * 1200,
        tabletUsers: 10000 + i * 300,
      },
    });
  }

  const categoryRows = new Map<string, string>();
  for (const [name, description, color] of categories) {
    const row = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, description, color },
      create: { name, slug: slugify(name), description, color },
    });
    categoryRows.set(name, row.id);
  }

  const tagRows = new Map<string, string>();
  for (const [name, color] of tags) {
    const row = await prisma.tag.upsert({
      where: { slug: slugify(name) },
      update: { name, color },
      create: { name, slug: slugify(name), color },
    });
    tagRows.set(name, row.id);
  }

  for (let i = 0; i < posts.length; i++) {
    const [title, categoryName, excerpt, keywords] = posts[i]!;
    const slug = slugify(title);
    const status = i === 2 ? 'DRAFT' : i === 5 ? 'SCHEDULED' : 'PUBLISHED';
    const publishedAt = status === 'PUBLISHED' ? new Date(Date.now() - i * 60 * 60 * 1000) : null;
    const scheduledAt = status === 'SCHEDULED' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    const imageUrl = temporaryImageDataUrl(title, categoryName, i);
    const author = staffUsers[i % staffUsers.length] ?? admin;
    const media = await prisma.mediaAsset.upsert({
      where: { id: `seed-post-image-${i + 1}` },
      update: {
        name: `${slug}.svg`,
        alt: title,
        url: imageUrl,
        mime: 'image/svg+xml',
        sizeBytes: Buffer.byteLength(imageUrl),
        width: 1200,
        height: 800,
        uploaderId: admin.id,
      },
      create: {
        id: `seed-post-image-${i + 1}`,
        name: `${slug}.svg`,
        alt: title,
        url: imageUrl,
        mime: 'image/svg+xml',
        sizeBytes: Buffer.byteLength(imageUrl),
        width: 1200,
        height: 800,
        uploaderId: admin.id,
      },
    });
    const post = await prisma.post.upsert({
      where: { slug },
      update: {
        title,
        excerpt,
        content: articleBody(title, categoryName, excerpt, keywords),
        status,
        featured: i === 0,
        breaking: i === 1,
        seoTitle: title.slice(0, 70),
        metaDescription: excerpt.slice(0, 180),
        focusKeyword: keywords.split(' ')[0] ?? categoryName.toLowerCase(),
        readTime: `${5 + i} min read`,
        views: status === 'PUBLISHED' ? deterministicViews(slug) : 0,
        publishedAt,
        scheduledAt,
        authorId: author.id,
        categoryId: categoryRows.get(categoryName)!,
        featuredImageId: media.id,
      },
      create: {
        title,
        slug,
        excerpt,
        content: articleBody(title, categoryName, excerpt, keywords),
        status,
        featured: i === 0,
        breaking: i === 1,
        seoTitle: title.slice(0, 70),
        metaDescription: excerpt.slice(0, 180),
        focusKeyword: keywords.split(' ')[0] ?? categoryName.toLowerCase(),
        readTime: `${5 + i} min read`,
        views: status === 'PUBLISHED' ? deterministicViews(slug) : 0,
        publishedAt,
        scheduledAt,
        authorId: author.id,
        categoryId: categoryRows.get(categoryName)!,
        featuredImageId: media.id,
      },
    });

    const baseTag = i % 2 === 0 ? 'AI' : 'Cybersecurity';
    const assignedTagNames = new Set([baseTag]);
    if ([0, 1, 3, 6].includes(i)) assignedTagNames.add('Video');
    if ([0, 3, 8, 10].includes(i)) assignedTagNames.add('Highlights');
    if ([1, 6].includes(i)) assignedTagNames.add('Live Updates');

    for (const tagName of assignedTagNames) {
      const tagId = tagRows.get(tagName) ?? [...tagRows.values()][0]!;
      await prisma.postTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId } },
        update: {},
        create: { postId: post.id, tagId },
      });
    }
  }

  const firstPost = await prisma.post.findFirst({ where: { status: 'PUBLISHED' } });
  if (firstPost) {
    await prisma.comment.upsert({
      where: { id: 'seed-comment-1' },
      update: {},
      create: {
        id: 'seed-comment-1',
        postId: firstPost.id,
        author: 'Reader One',
        email: 'reader@example.com',
        content: 'Strong reporting and a useful starting point for the public article flow.',
        status: 'APPROVED',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'SEED',
      resource: 'System',
      detail: 'Initial API database seeded.',
    },
  });

  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
