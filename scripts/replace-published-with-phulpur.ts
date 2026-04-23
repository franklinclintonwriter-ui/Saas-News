import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../api/src/prisma-client.js';
import { deleteStoredMedia, storeMediaBuffer } from '../api/src/storage.js';

dotenv.config();

const prisma = createPrismaClient();

type Story = {
  title: string;
  category: string;
  excerpt: string;
  focusKeyword: string;
  tags: string[];
  featured?: boolean;
  breaking?: boolean;
  points: string[];
};

const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://phulpur.net';

const categories = [
  ['Local News', 'local-news', 'Daily reporting and civic updates from Phulpur, Mymensingh.', '#194890'],
  ['Governance', 'governance', 'Local administration, public services, and citizen accountability.', '#7C3AED'],
  ['Agriculture', 'agriculture', 'Farming, markets, crops, and rural livelihoods in Phulpur.', '#0F766E'],
  ['Transport', 'transport', 'Roads, bridges, buses, and daily movement around Phulpur.', '#DC2626'],
  ['Education', 'education', 'Schools, colleges, madrasas, exams, and youth learning.', '#2563EB'],
  ['Health', 'health', 'Local clinics, public health, referral care, and family wellbeing.', '#06B6D4'],
  ['Business', 'business', 'Bazaar trade, small businesses, remittance, and local commerce.', '#F59E0B'],
  ['Community', 'community', 'Neighborhood life, safety, volunteers, and local voices.', '#B91C1C'],
  ['Culture', 'culture', 'Festivals, faith, food, heritage, and everyday culture in Phulpur.', '#EC4899'],
  ['Sports', 'sports', 'Local football, cricket, school sports, and youth competitions.', '#10B981'],
  ['Environment', 'environment', 'Monsoon readiness, rivers, drainage, and climate resilience.', '#164E63'],
  ['Technology', 'technology', 'Digital public services, connectivity, and practical tech adoption.', '#111827'],
] as const;

const tagColors: Record<string, string> = {
  Phulpur: '#194890',
  Mymensingh: '#DC2626',
  Bangladesh: '#0F766E',
  'Local News': '#2563EB',
  Roads: '#DC2626',
  Agriculture: '#0F766E',
  Education: '#2563EB',
  Health: '#06B6D4',
  Bazaar: '#F59E0B',
  Governance: '#7C3AED',
  Community: '#B91C1C',
  Culture: '#EC4899',
  Sports: '#10B981',
  Monsoon: '#164E63',
  'Public Services': '#4338CA',
  Transport: '#DC2626',
  Business: '#F59E0B',
  Technology: '#111827',
};

const stories: Story[] = [
  {
    title: 'Phulpur Local News Desk: What Matters for Mymensingh Readers This Week',
    category: 'Local News',
    excerpt: 'A Phulpur-focused local news briefing on roads, schools, health services, markets, public offices, and community priorities across the upazila.',
    focusKeyword: 'Phulpur local news',
    tags: ['Phulpur', 'Mymensingh', 'Bangladesh', 'Local News', 'Public Services'],
    featured: true,
    breaking: true,
    points: [
      'Local reporting should track practical issues residents face every day, including road access, school attendance, health referrals, bazaar prices, and administrative services.',
      'The most useful Phulpur coverage connects village-level concerns with decisions made at union, upazila, district, and national offices.',
      'Readers benefit when stories explain what changed, who is responsible, where residents can get help, and what documents or dates matter next.',
    ],
  },
  {
    title: 'Village Road Links Remain Central to Daily Travel Across Phulpur Unions',
    category: 'Transport',
    excerpt: 'Road connections between villages, bazaars, schools, and Mymensingh-bound routes remain one of the biggest daily concerns for Phulpur residents.',
    focusKeyword: 'Phulpur roads',
    tags: ['Phulpur', 'Mymensingh', 'Roads', 'Transport', 'Public Services'],
    points: [
      'Road quality affects travel time for students, workers, patients, farmers, small traders, and emergency services.',
      'Approach roads, culverts, drainage, and maintenance planning can determine whether a completed bridge or route actually helps residents.',
      'Local reporting should follow both project announcements and the practical condition of roads after rain, heavy traffic, and seasonal use.',
    ],
  },
  {
    title: 'Farmers in Phulpur Prepare for Seasonal Crop Planning and Market Swings',
    category: 'Agriculture',
    excerpt: 'Agriculture remains central to Phulpur livelihoods as farmers balance crop planning, input costs, weather uncertainty, and market prices.',
    focusKeyword: 'Phulpur agriculture',
    tags: ['Phulpur', 'Mymensingh', 'Agriculture', 'Bangladesh', 'Bazaar'],
    featured: true,
    points: [
      'Farmers track seed, fertilizer, irrigation, labor, transport, and market price changes before deciding how much land to use for each crop.',
      'Weather timing can influence planting, harvesting, storage, and transport decisions across rural communities.',
      'Local markets, middlemen, storage access, and road conditions can affect whether a good harvest becomes a good income season.',
    ],
  },
  {
    title: 'Phulpur Schools Focus on Attendance, Exam Preparation and Safer Journeys',
    category: 'Education',
    excerpt: 'Students, parents, and teachers in Phulpur are focused on attendance, exam readiness, safe travel, and steady classroom support.',
    focusKeyword: 'Phulpur education',
    tags: ['Phulpur', 'Mymensingh', 'Education', 'Community', 'Bangladesh'],
    points: [
      'Attendance can be affected by household income, transport, weather, road safety, coaching costs, health, and family responsibilities.',
      'Parents often judge school quality through teacher presence, exam preparation, discipline, safety, and communication from school authorities.',
      'Local education reporting should include girls, students with disabilities, madrasa learners, college students, and children from remote villages.',
    ],
  },
  {
    title: 'Health Access in Phulpur: Clinics, Pharmacies and Referral Travel to Mymensingh',
    category: 'Health',
    excerpt: 'Families in Phulpur depend on local health facilities, pharmacies, community advice, and referral routes to Mymensingh for urgent care.',
    focusKeyword: 'Phulpur health services',
    tags: ['Phulpur', 'Mymensingh', 'Health', 'Public Services', 'Community'],
    points: [
      'Primary care, maternal health, child vaccination, pharmacy guidance, emergency transport, and referral decisions all shape local health outcomes.',
      'Families often consider cost, distance, transport availability, trust, and waiting time before choosing where to seek care.',
      'Clear public information can reduce confusion during seasonal illness, heat, dengue concern, floods, and other health pressures.',
    ],
  },
  {
    title: 'Phulpur Bazaar Traders Adapt as Local Shopping Moves Toward Digital Payments',
    category: 'Business',
    excerpt: 'Small businesses in Phulpur bazaars are adjusting to changing customer habits, mobile financial services, price pressure, and local competition.',
    focusKeyword: 'Phulpur bazaar',
    tags: ['Phulpur', 'Mymensingh', 'Business', 'Bazaar', 'Technology'],
    featured: true,
    points: [
      'Mobile payments and digital communication help some sellers serve customers faster, but cash remains important for daily trade.',
      'Transport costs, wholesale prices, rent, electricity, and seasonal demand can quickly change profit margins for small shops.',
      'Local shoppers often combine price comparison, trust, credit relationships, and convenience when choosing where to buy.',
    ],
  },
  {
    title: 'Monsoon Readiness in Phulpur: Drainage, Embankments and Household Safety',
    category: 'Environment',
    excerpt: 'As seasonal rain approaches, Phulpur residents watch drainage, low-lying roads, canals, household preparedness, and emergency information.',
    focusKeyword: 'Phulpur monsoon readiness',
    tags: ['Phulpur', 'Mymensingh', 'Monsoon', 'Community', 'Public Services'],
    points: [
      'Drainage, culverts, canal flow, road shoulders, bridge approaches, and waste management can influence how quickly rainwater clears.',
      'Households prepare by protecting documents, planning safe travel, checking drinking water, and staying alert to weather updates.',
      'Farmers and traders need early information because heavy rain can affect planting, harvesting, storage, transport, and market supply.',
    ],
  },
  {
    title: 'Youth Sports in Phulpur Keep Community Fields Busy After School',
    category: 'Sports',
    excerpt: 'Football, cricket, school competitions, and informal tournaments continue to give young people in Phulpur a shared space for discipline and community pride.',
    focusKeyword: 'Phulpur sports',
    tags: ['Phulpur', 'Mymensingh', 'Sports', 'Community', 'Education'],
    points: [
      'Sports help students build routine, teamwork, leadership, fitness, and friendships across village and school lines.',
      'Teams often rely on local sponsors, teachers, older players, families, and community organizers for equipment and tournament support.',
      'Safe fields, lighting, transport, first aid, and fair scheduling are practical issues that affect participation.',
    ],
  },
  {
    title: 'How Union Parishad Services Shape Everyday Life in Phulpur',
    category: 'Governance',
    excerpt: 'Birth registration, certificates, local notices, social safety programs, and development priorities make union-level services important to Phulpur households.',
    focusKeyword: 'Phulpur Union Parishad services',
    tags: ['Phulpur', 'Mymensingh', 'Governance', 'Public Services', 'Bangladesh'],
    points: [
      'Union parishad services can affect school admission, job applications, social protection, land matters, travel documents, and family records.',
      'Clear public notices help residents avoid repeated visits, missing documents, unofficial fees, and confusing timelines.',
      'Local accountability improves when residents know which office handles which service and how decisions are recorded.',
    ],
  },
  {
    title: 'Women Entrepreneurs in Phulpur Markets Build Customer Trust Through Local Networks',
    category: 'Community',
    excerpt: 'Women running shops, home businesses, tailoring services, food sales, and online pages are using trust and local networks to grow in Phulpur.',
    focusKeyword: 'Phulpur women entrepreneurs',
    tags: ['Phulpur', 'Mymensingh', 'Community', 'Business', 'Technology'],
    points: [
      'Small businesses may begin from home, a stall, a tailoring machine, a food order page, a cosmetics counter, or a seasonal product line.',
      'Trust matters because customers often buy through personal recommendations, neighborhood familiarity, and consistent product quality.',
      'Access to training, safe transport, reliable delivery, digital payment knowledge, and family support can influence growth.',
    ],
  },
  {
    title: 'Local Culture in Phulpur: Markets, Mosques, Festivals and Family Gatherings',
    category: 'Culture',
    excerpt: 'Phulpur cultural life is shaped by faith, markets, family occasions, food traditions, school events, and seasonal gatherings across villages.',
    focusKeyword: 'Phulpur culture',
    tags: ['Phulpur', 'Mymensingh', 'Culture', 'Community', 'Bangladesh'],
    points: [
      'Mosques, schools, bazaars, family homes, community fields, and public spaces all shape how residents gather and share news.',
      'Seasonal festivals and religious occasions can affect travel, shopping, food prices, security planning, and family schedules.',
      'Cultural reporting should include elders, young people, women, teachers, shopkeepers, artists, and local organizers.',
    ],
  },
  {
    title: 'Safe Water and Sanitation Remain Everyday Priorities for Phulpur Families',
    category: 'Health',
    excerpt: 'Clean drinking water, sanitation, drainage, handwashing, and public awareness remain practical health priorities for families across Phulpur.',
    focusKeyword: 'Phulpur safe water',
    tags: ['Phulpur', 'Mymensingh', 'Health', 'Public Services', 'Monsoon'],
    points: [
      'Families need reliable drinking water, safe latrines, drainage, waste management, and health messages that are easy to act on.',
      'Schools, markets, mosques, and transport points require special attention because many people use them every day.',
      'Monsoon periods can increase concern around water contamination, standing water, mosquitoes, and road access to health services.',
    ],
  },
  {
    title: 'Phulpur-Mymensingh Commuters Look for Reliable Transport and Safer Roads',
    category: 'Transport',
    excerpt: 'Daily movement between Phulpur and Mymensingh depends on predictable transport, safe roads, fair fares, and clear information during disruptions.',
    focusKeyword: 'Phulpur Mymensingh transport',
    tags: ['Phulpur', 'Mymensingh', 'Transport', 'Roads', 'Business'],
    points: [
      'Transport reliability affects students, office workers, patients, traders, job seekers, and families traveling for services.',
      'Road safety depends on vehicle condition, driver behavior, traffic pressure, road surface, lighting, signage, and passenger awareness.',
      'Fare changes and delays can have real budget impact for people who travel frequently.',
    ],
  },
  {
    title: 'Small Tea Stalls and Local Shops Keep Phulpur Neighborhood Economy Moving',
    category: 'Business',
    excerpt: 'Tea stalls, grocery shops, mobile recharge counters, pharmacies, and repair points form a neighborhood economy that keeps Phulpur moving every day.',
    focusKeyword: 'Phulpur small business',
    tags: ['Phulpur', 'Mymensingh', 'Business', 'Bazaar', 'Community'],
    points: [
      'Neighborhood businesses provide convenience, informal credit, local information, and daily services close to home.',
      'Small traders face price changes, rent, transport costs, electricity bills, supplier pressure, and uncertain customer demand.',
      'Tea stalls and shops also operate as social spaces where residents discuss roads, politics, crops, weather, sports, and family news.',
    ],
  },
  {
    title: 'Digital Public Services Gain Attention Among Young Residents in Phulpur',
    category: 'Technology',
    excerpt: 'Young residents in Phulpur are increasingly helping families navigate online forms, mobile payments, digital notices, and public service portals.',
    focusKeyword: 'Phulpur digital services',
    tags: ['Phulpur', 'Mymensingh', 'Technology', 'Public Services', 'Education'],
    points: [
      'Online forms can support birth registration, education applications, job searches, payments, land-related information, and public notices.',
      'Digital service centers, mobile shops, students, and younger family members often become informal guides for older residents.',
      'Digital literacy also requires privacy awareness, document safety, password care, and protection from scams.',
    ],
  },
  {
    title: 'Bridge Approach Roads Remain a Key Infrastructure Question for Phulpur Villages',
    category: 'Governance',
    excerpt: 'Bridge projects only deliver full value for Phulpur residents when approach roads, drainage, safety rails, and maintenance are completed together.',
    focusKeyword: 'Phulpur bridge approach roads',
    tags: ['Phulpur', 'Mymensingh', 'Roads', 'Governance', 'Public Services'],
    featured: true,
    points: [
      'A bridge without usable approach roads can leave students, patients, farmers, and traders facing the same access problems as before.',
      'Project reporting should follow planning, land issues, contractor work, drainage, safety features, and handover documents.',
      'Local accountability improves when residents can compare promised timelines with practical results on the ground.',
    ],
  },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'phulpur-story';
}

function escapeSvgText(input: string): string {
  return input.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char));
}

function wrapTitle(input: string, max = 27): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of input.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= max) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function imageSvg(story: Story, index: number): Buffer {
  const palettes = [
    ['#0B3B2E', '#F59E0B', '#F8FAFC'],
    ['#12355B', '#DC2626', '#F8FAFC'],
    ['#3B1D4A', '#10B981', '#F8FAFC'],
    ['#4A2B13', '#2563EB', '#FFF7ED'],
    ['#0F172A', '#F97316', '#ECFEFF'],
    ['#064E3B', '#EC4899', '#F8FAFC'],
  ] as const;
  const [bg, accent, fg] = palettes[index % palettes.length]!;
  const lines = wrapTitle(story.title).map((line, i) => `<tspan x="86" dy="${i === 0 ? 0 : 68}">${escapeSvgText(line)}</tspan>`).join('');
  return Buffer.from([
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">',
    `<rect width="1200" height="800" fill="${bg}"/>`,
    `<path d="M0 590 C210 520 370 660 590 600 C790 546 965 494 1200 565 L1200 800 L0 800 Z" fill="${accent}" opacity="0.95"/>`,
    '<rect x="64" y="64" width="1072" height="672" rx="28" fill="#FFFFFF" opacity="0.08"/>',
    '<circle cx="982" cy="164" r="94" fill="#FFFFFF" opacity="0.14"/>',
    '<circle cx="1065" cy="248" r="44" fill="#FFFFFF" opacity="0.10"/>',
    `<text x="86" y="128" fill="${fg}" font-family="Arial,sans-serif" font-size="32" font-weight="700" letter-spacing="2">PHULPUR, MYMENSINGH</text>`,
    `<text x="86" y="230" fill="${fg}" font-family="Georgia,serif" font-size="58" font-weight="700">${lines}</text>`,
    `<text x="86" y="682" fill="${fg}" font-family="Arial,sans-serif" font-size="28" font-weight="700">${escapeSvgText(story.category.toUpperCase())}</text>`,
    `<text x="86" y="724" fill="${fg}" font-family="Arial,sans-serif" font-size="22" opacity="0.86">Local reporting for Phulpur, Bangladesh</text>`,
    '</svg>',
  ].join(''), 'utf8');
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function articleBody(story: Story): string {
  return [
    '## Overview',
    `${story.excerpt} This article is part of the Phulpur24 local coverage reset, keeping the public homepage focused on Phulpur, Mymensingh, Bangladesh.`,
    'The report is designed for residents, families outside the area, public service users, students, farmers, traders, and community leaders who need practical local context. It avoids unrelated global demo content and keeps attention on what can affect daily life in Phulpur.',
    '## Key Points',
    bullets(story.points),
    '## Local Context',
    'Phulpur communities depend on a close network of village roads, markets, schools, mosques, public offices, health facilities, transport points, farms, family networks, and small businesses. A change in one part of that network can quickly affect several others.',
    'Good local reporting should start with what residents are experiencing, then check that experience against field observation, official notices, named sources, public documents, and follow-up questions. That standard matters because local stories involve real neighbors, real services, and real reputations.',
    '## Why This Matters',
    `For Phulpur readers, ${story.focusKeyword} is not an abstract topic. It can affect travel time, household expenses, school routines, crop decisions, market confidence, public service access, health planning, or community safety.`,
    'The same issue can touch more than one beat. A road problem can become an education story when students miss class, a health story when patients struggle to travel, an agriculture story when crops cannot move easily, and a business story when shops face supply delays.',
    'This is why Phulpur24 treats local coverage as a public service. The most useful article is not only the one that announces a problem; it is the one that helps readers understand the cause, the responsible office, the next step, and the human impact behind the headline.',
    'A Phulpur-first approach also helps people who live outside the upazila but still care about home. Many families have members studying, working, or doing business in Mymensingh, Dhaka, abroad, or other districts. They still need a reliable local source that explains what is happening in familiar places.',
    '## Impact Across Daily Life',
    'Local news becomes important when it reaches ordinary routines. A transport update can decide when a student leaves for class. A market report can change how a family plans weekly spending. A health notice can affect whether parents seek help early. A public service update can save residents from repeated trips to an office.',
    'The impact is often strongest for people with the least flexibility: elderly residents, day laborers, students facing exams, small farmers with perishable goods, patients who need referral care, shopkeepers working with narrow margins, and families managing paperwork under time pressure.',
    'For that reason, each Phulpur24 post should be judged by a practical question: does this help someone in Phulpur make a better decision or ask a better question? If the answer is yes, the story belongs on the local homepage. If the answer is no, it should not replace truly local coverage.',
    'The newsroom will continue connecting topics across beats. A school story may involve roads and sanitation. A business story may involve transport and digital payments. An agriculture story may involve weather, credit, markets, and storage. Local life is connected, so local reporting should be connected too.',
    '## Beat-Specific Local Angle',
    `${story.points[0]} This point should be checked in the field whenever possible because the same headline can look very different from one village, bazaar, school area, or transport route to another.`,
    `${story.points[1]} The newsroom should ask residents how the situation changes their cost, time, safety, access to services, or ability to plan. Those details make a local article more useful than a general summary.`,
    `${story.points[2]} Follow-up reporting should look for documents, dates, responsible offices, budget references, public commitments, and visible work on the ground. Without that follow-up, local readers are left with announcements but not accountability.`,
    'A complete Phulpur article should also include the quiet details that residents notice first: whether a road is usable after rain, whether a counter is open when people arrive, whether a market price is different from last week, whether students feel safe traveling, and whether families know whom to contact when a service fails.',
    'The local angle should remain respectful. It should not turn every problem into blame before facts are checked, and it should not turn every announcement into success before residents see results. The job is to document, verify, explain, and return to the story.',
    '## Service and Accountability Lens',
    'Every local story should identify the service chain. That means asking where the issue begins, which office or group has authority, which budget or program may apply, who can confirm the current status, and what residents can reasonably expect next. This service lens keeps coverage practical.',
    'Accountability also requires memory. If a road, school facility, health service, market improvement, or public notice was discussed before, the newsroom should connect the new article to earlier promises. Readers should not have to remember every previous update on their own.',
    'A professional local newsroom should keep a calm tone even when the subject is frustrating. Strong reporting comes from evidence and persistence, not from loud wording. That approach helps residents, officials, and community leaders focus on solving the issue.',
    '## What Residents Should Watch',
    bullets([
      'Official notices from union parishad offices, the upazila administration, schools, health authorities, market committees, and transport operators.',
      'Clear timelines, responsible offices, required documents, contact points, and visible field progress after any public promise is made.',
      'Resident feedback from villages, bazaars, school areas, transport stands, farms, clinics, and community organizations.',
      'Whether announced projects include realistic deadlines, complete access arrangements, safety measures, maintenance responsibility, and public contact channels.',
      'How decisions affect women, children, elderly residents, farmers, students, people with disabilities, low-income workers, and families living farther from central services.',
    ]),
    '## Questions for Follow-Up',
    bullets([
      'Which exact area, village, road, institution, market, or public service is affected?',
      'Who is responsible for the next decision, and has that office provided a clear response?',
      'What evidence is available through public notices, field photographs, documents, resident interviews, or direct observation?',
      'What is the expected timeline, and what happens if the timeline is missed?',
      'How many people are likely to be affected, and which groups face the highest cost or risk?',
      'Does the issue require action from union, upazila, district, or national-level offices?',
      'Are there safety concerns that residents should know immediately?',
      'What practical steps can readers take today while waiting for a permanent solution?',
      'What previous promises or related projects should be checked again?',
      'How will Phulpur24 verify progress after publication?',
    ]),
    '## How Residents Can Use This Information',
    'Readers can use this report as a starting point for better questions. Before visiting an office, they can check what documents may be needed. Before traveling, they can look for road or transport updates. Before sharing a claim online, they can look for whether the information came from a named source or an official notice.',
    'Community leaders can use local coverage to identify repeated problems and organize clearer communication. Teachers can use it to explain civic responsibility and local development to students. Small business owners can use it to track market and transport conditions. Families outside Phulpur can use it to stay connected with home without relying only on rumor.',
    'The article is also useful for tip submissions. If residents know more about the issue, they can send exact location details, dates, photos, documents, and names of offices already contacted. Specific information helps the newsroom verify quickly and follow up professionally.',
    '## Reporting Checklist',
    bullets([
      'Confirm names, places, dates, numbers, and public notices before presenting a claim as fact.',
      'Ask both affected residents and responsible offices for comment when a service problem is reported.',
      'Explain what readers can do next, including where to find help, what documents may be required, and what deadline matters.',
      'Return to important stories after announcements so readers can see whether action followed the promise.',
      'Separate confirmed facts from community claims, early reports, opinion, and analysis.',
      'Use plain language so readers can understand the issue without needing administrative or technical background.',
      'Avoid exaggeration, copied national framing, and unrelated filler that does not help Phulpur readers.',
      'Correct mistakes clearly and keep updated stories transparent when new information changes the picture.',
    ]),
    '## Editorial Standard for Phulpur24',
    'The editorial standard for this local coverage is simple: useful, verified, specific, and fair. Useful means the story should help readers understand a local problem or opportunity. Verified means the newsroom should check information before presenting it as fact. Specific means the story should name places, offices, dates, and next steps whenever possible. Fair means affected residents and responsible authorities should both have a chance to be represented accurately.',
    'Local journalism can lose trust quickly if it turns into rumor, personal attack, or copied content. Phulpur24 should avoid those traps by building each article around evidence, context, and follow-up. A strong local report does not need dramatic language. It needs clarity, patience, and enough detail for readers to see what is known and what still needs answers.',
    'This standard also applies to images. Temporary editorial images can help keep the site visually complete, but field photos, verified documents, maps, and original reporting images should replace them when available. The image should support the story, not mislead readers about what has been directly photographed.',
    '## Background for New Readers',
    'Phulpur is part of Mymensingh district, and residents maintain strong links with Mymensingh city for education, health care, business, administration, transport, and family needs. At the same time, everyday life is shaped by local unions, village routes, bazaars, schools, faith institutions, and community relationships.',
    'A Phulpur-first news strategy means the site should feel useful to someone living in the upazila, someone from Phulpur working elsewhere, and someone trying to understand local conditions before making a decision. The editorial focus should remain close to the people affected.',
    'That focus does not mean ignoring wider Bangladesh. National decisions matter when they change local services, prices, roads, schools, agriculture, health, safety, or business conditions in Phulpur. The difference is that every wider story should be explained through its local effect.',
    'A resident should be able to open the homepage and immediately recognize the priorities of Phulpur: public services, roads, agriculture, education, health, markets, culture, sports, environment, and community life. That is the purpose of this new article set.',
    '## Reader Contribution Guide',
    bullets([
      'Send the exact location and date when reporting a local issue.',
      'Include photos only when they are your own or when you have permission to share them.',
      'Mention which office, school, market committee, health facility, or public representative has already been contacted.',
      'Avoid forwarding rumors without context; explain what you personally saw, heard, or documented.',
      'Share corrections politely when a name, place, date, number, or description needs updating.',
      'Suggest follow-up angles that help residents understand whether a problem was solved.',
    ]),
    '## Next Steps',
    'Phulpur24 will continue adding verified local updates, service explainers, community profiles, field reports, and follow-up stories focused on Phulpur, Mymensingh. Readers can help by sending clear tips, photos with context, public notices, and corrections when details need updating.',
  ].join('\n\n');
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function deterministicViews(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 650 + (h % 8400);
}

function extractMediaId(url: string): string | null {
  const match = /\/media\/([^/]+)\/file/.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let index = 2;
  while (await prisma.post.findUnique({ where: { slug } })) slug = `${base}-${index++}`;
  return slug;
}

async function main(): Promise<void> {
  const settings = await prisma.siteSetting.upsert({ where: { id: 'site' }, update: {}, create: { id: 'site' } });
  const protectedMediaIds = new Set<string>();
  for (const url of [settings.logoUrl, settings.faviconUrl, settings.ogImageUrl]) {
    const id = extractMediaId(url || '');
    if (id) protectedMediaIds.add(id);
  }

  const publishedPosts = await prisma.post.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, featuredImageId: true } });
  const publishedIds = publishedPosts.map((post) => post.id);
  const oldImageIds = [...new Set(publishedPosts.map((post) => post.featuredImageId).filter((id): id is string => Boolean(id)))];

  if (publishedIds.length) {
    await prisma.postTag.deleteMany({ where: { postId: { in: publishedIds } } });
    await prisma.comment.deleteMany({ where: { postId: { in: publishedIds } } });
    await prisma.post.deleteMany({ where: { id: { in: publishedIds } } });
  }

  const removableMedia = oldImageIds.length
    ? await prisma.mediaAsset.findMany({ where: { id: { in: oldImageIds.filter((id) => !protectedMediaIds.has(id)) }, posts: { none: {} } } })
    : [];
  for (const media of removableMedia) {
    await prisma.mediaAsset.delete({ where: { id: media.id } });
    await deleteStoredMedia(media.storageProvider, media.storageKey);
  }

  const author = await prisma.user.upsert({
    where: { email: 'newsdesk@phulpur.net' },
    update: {
      name: 'Phulpur News Desk',
      role: 'EDITOR',
      status: 'ACTIVE',
      title: 'Local newsroom for Phulpur, Mymensingh',
      bio: 'The Phulpur News Desk covers roads, schools, health, agriculture, public services, markets, culture, and community life across Phulpur, Mymensingh, Bangladesh.',
      location: 'Phulpur, Mymensingh, Bangladesh',
      websiteUrl: siteUrl,
    },
    create: {
      name: 'Phulpur News Desk',
      email: 'newsdesk@phulpur.net',
      passwordHash: await bcrypt.hash(`phulpur-newsdesk-${randomUUID()}`, 12),
      role: 'EDITOR',
      status: 'ACTIVE',
      title: 'Local newsroom for Phulpur, Mymensingh',
      bio: 'The Phulpur News Desk covers roads, schools, health, agriculture, public services, markets, culture, and community life across Phulpur, Mymensingh, Bangladesh.',
      location: 'Phulpur, Mymensingh, Bangladesh',
      websiteUrl: siteUrl,
    },
  });

  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const [name, slug, description, color] of categories) {
    const category = await prisma.category.upsert({ where: { slug }, update: { name, description, color }, create: { name, slug, description, color } });
    categoryMap.set(name, category);
  }

  const tagIds = new Map<string, string>();
  for (const name of [...new Set(stories.flatMap((story) => story.tags))]) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name, color: tagColors[name] || '#194890' },
      create: { name, slug, color: tagColors[name] || '#194890' },
    });
    tagIds.set(name, tag.id);
  }

  await prisma.siteSetting.update({
    where: { id: 'site' },
    data: {
      siteTitle: 'Phulpur24',
      tagline: 'Local news, public service updates, and community reporting from Phulpur, Mymensingh, Bangladesh.',
      siteUrl,
      organizationName: 'Phulpur24',
      defaultSeoTitle: 'Phulpur24 - Phulpur, Mymensingh Local News',
      defaultMetaDescription: 'Read local news, public service updates, agriculture, transport, education, health, business, sports, and community reporting from Phulpur, Mymensingh, Bangladesh.',
      defaultKeywords: 'Phulpur news, Mymensingh news, Phulpur Bangladesh, local news, Phulpur24',
      contactEmail: 'news@phulpur.net',
      supportEmail: 'support@phulpur.net',
      pressEmail: 'press@phulpur.net',
      advertisingEmail: 'ads@phulpur.net',
      tipsEmail: 'tips@phulpur.net',
      footerAbout: 'Phulpur24 is a local-first newsroom focused on Phulpur, Mymensingh, Bangladesh.',
    },
  });

  const created: Array<{ title: string; slug: string; category: string; words: number; imageUrl: string }> = [];
  const now = new Date();
  for (let index = 0; index < stories.length; index++) {
    const story = stories[index]!;
    const category = categoryMap.get(story.category);
    if (!category) throw new Error(`Missing category ${story.category}`);
    const slug = await uniqueSlug(slugify(story.title));
    const imageId = randomUUID();
    const stored = await storeMediaBuffer({
      id: imageId,
      name: `${slug}.svg`,
      mime: 'image/svg+xml',
      buffer: imageSvg(story, index),
    });
    const media = await prisma.mediaAsset.create({
      data: {
        id: imageId,
        name: `${slug}.svg`,
        alt: `${story.title} - Phulpur, Mymensingh`,
        url: stored.url,
        mime: 'image/svg+xml',
        sizeBytes: stored.sizeBytes,
        width: 1200,
        height: 800,
        storageProvider: stored.provider,
        storageKey: stored.key,
        uploaderId: author.id,
      },
    });
    const content = articleBody(story);
    const words = wordCount(content);
    const post = await prisma.post.create({
      data: {
        id: randomUUID(),
        title: story.title,
        slug,
        excerpt: story.excerpt,
        content,
        status: 'PUBLISHED',
        featured: Boolean(story.featured),
        breaking: Boolean(story.breaking),
        seoTitle: `${story.title} | Phulpur24`,
        metaDescription: story.excerpt.slice(0, 158),
        focusKeyword: story.focusKeyword,
        canonicalUrl: `${siteUrl}/article/${slug}`,
        readTime: `${Math.max(5, Math.ceil(words / 220))} min read`,
        views: deterministicViews(story.title),
        publishedAt: new Date(now.getTime() - index * 36 * 60 * 1000),
        scheduledAt: null,
        authorId: author.id,
        categoryId: category.id,
        featuredImageId: media.id,
      },
    });
    await prisma.postTag.createMany({ data: story.tags.map((name) => ({ postId: post.id, tagId: tagIds.get(name)! })) });
    created.push({ title: post.title, slug: post.slug, category: story.category, words, imageUrl: media.url });
  }

  await prisma.tag.deleteMany({ where: { posts: { none: {} } } });
  await prisma.category.deleteMany({ where: { posts: { none: {} } } });

  const [statusCounts, publicCategories] = await Promise.all([
    prisma.post.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.category.findMany({
      where: { posts: { some: { status: 'PUBLISHED', deletedAt: null, publishedAt: { lte: new Date() } } } },
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  console.log(JSON.stringify({
    deletedPublishedPosts: publishedIds.length,
    deletedOldFeaturedImages: removableMedia.length,
    createdPosts: created.length,
    statusCounts,
    publicCategories: publicCategories.map((category) => ({ name: category.name, slug: category.slug, posts: category._count.posts })),
    firstPosts: created.slice(0, 5),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
