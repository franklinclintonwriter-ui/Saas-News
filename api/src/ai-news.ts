import { z } from 'zod';
import { config } from './config.js';
import { badRequest, serviceUnavailable } from './errors.js';
import { getAiRuntimeConfig } from './integrations.js';
import { slugify } from './utils.js';

export type AiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export type AiGenerateInput = {
  provider: AiProvider;
  model?: string;
  topic: string;
  focusKeywords: string[];
  tone: string;
  language: string;
  audience?: string;
  articleLength: 'brief' | 'standard' | 'in_depth';
};

export type GeneratedNewsDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  suggestedTags: string[];
  readTime: string;
  editorNotes: string;
  seoChecklist: string[];
  imagePrompt: string;
  imageAlt: string;
  imageCaption: string;
  provider: AiProvider;
  model: string;
};

export type AiGeneratePostImageInput = {
  provider: AiProvider;
  model?: string;
  title: string;
  excerpt?: string;
  content: string;
  category: string;
  focusKeyword?: string;
  postId?: string;
  imagePrompt?: string;
  placement: 'featured' | 'inline' | 'social';
  style: string;
};

export type GeneratedPostImageAsset = {
  id: string;
  name: string;
  alt: string;
  url: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedAt: string;
  prompt: string;
  provider: AiProvider;
  model: string;
};

const MIN_ARTICLE_WORDS = 1500;
const MAX_ARTICLE_WORDS = 3000;

const draftSchema = z.object({
  title: z.string().min(3).max(220),
  slug: z.string().max(240).optional(),
  excerpt: z.string().max(600).optional(),
  content: z.string().min(80).max(60_000),
  seoTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  focusKeyword: z.string().max(200).optional(),
  suggestedTags: z.array(z.string().max(100)).max(20).optional(),
  readTime: z.string().max(80).optional(),
  editorNotes: z.string().max(4000).optional(),
  seoChecklist: z.array(z.string().max(240)).max(16).optional(),
  imagePrompt: z.string().max(4000).optional(),
  imageAlt: z.string().max(400).optional(),
  imageCaption: z.string().max(500).optional(),
});

const svgImageSchema = z.object({
  svg: z.string().min(200).max(1_500_000),
  alt: z.string().max(400).optional(),
  caption: z.string().max(500).optional(),
});

const lengthGuidance: Record<AiGenerateInput['articleLength'], string> = {
  brief: 'Write 1,500-1,800 words. This is the shortest accepted professional article length.',
  standard: 'Write 1,800-2,400 words. Use this for a complete daily news feature with strong SEO depth.',
  in_depth: 'Write 2,400-3,000 words. Include deeper background, implications, and a clear what-next section.',
};

function buildSystemPrompt(): string {
  return `You are a senior newsroom editor and SEO specialist for a digital publication.
You write accurate, neutral news prose. You do not invent named sources, quotes, statistics, or allegations.
If specifics are unknown, write in general terms and note uncertainty in editorNotes.
Output must be a single JSON object only - no markdown fences, no commentary outside JSON.
Use Markdown in the "content" field only: ## for subheads, ### for FAQ questions, paragraphs separated by blank lines, **bold** sparingly for key terms, bullet lists where helpful.
Never use HTML in content.`;
}

function buildUserPrompt(input: AiGenerateInput): string {
  const primary = input.focusKeywords[0] ?? '';
  const secondary = input.focusKeywords.slice(1).filter(Boolean);
  const audience = input.audience?.trim() || 'general readers interested in current affairs';

  return `Create a professional long-form SEO news article draft.

TOPIC / ANGLE:
${input.topic.trim()}

PRIMARY FOCUS KEYWORD (use naturally in title, first paragraph, and at least one subhead where it reads well):
${primary || '(derive one short phrase from the topic)'}

${secondary.length ? `SECONDARY KEYWORDS (weave in only where natural):\n${secondary.map((k) => `- ${k}`).join('\n')}\n` : ''}
TONE: ${input.tone}
LANGUAGE (BCP-47 style): ${input.language}
TARGET AUDIENCE: ${audience}
LENGTH: ${lengthGuidance[input.articleLength]}

Required article structure inside "content":
- Start with a sharp lead paragraph that includes the primary focus keyword in the first 100 words.
- Include a short "Key Takeaways" section with 4-6 bullets.
- Include at least 7 descriptive ## subheads.
- Include background, current situation, stakeholder impact, data/context, risks or limitations, next steps, and reader-service implications.
- Include a "What happens next" section.
- Include an "FAQ" section with 3-5 ### question headings and concise answers.
- Use short paragraphs for readability. Avoid filler.
- Do not invent quotes, named officials, exact numbers, allegations, court actions, casualty figures, or scientific findings.

SEO rules:
- seoTitle: 45-60 characters when possible, include primary keyword near the start if it fits naturally.
- metaDescription: 140-158 characters, compelling, includes primary keyword once.
- focusKeyword: single primary phrase (can match PRIMARY FOCUS KEYWORD).
- suggestedTags: 6-12 short topic tags, lowercase slug-style words or hyphenated phrases (no #).
- seoChecklist: 6-10 short checks covering keyword usage, title length, meta length, slug, subheads, FAQ, image alt text, and internal link ideas.
- imagePrompt: a production-ready prompt for an AI image model to create a realistic editorial featured image for this post. Avoid text overlays, watermarks, logos, political endorsements, gore, and misleading staged claims.
- imageAlt: concise accessible alt text for the featured image.
- imageCaption: publishable caption that does not claim the image is documentary evidence unless the brief explicitly says so.

Return JSON with exactly these keys:
{
  "title": string,
  "slug": string (URL slug, lowercase, hyphens; optional - we can derive),
  "excerpt": string (<= 220 chars, newsroom dek),
  "content": string (markdown body, 1500-3000 words),
  "seoTitle": string,
  "metaDescription": string,
  "focusKeyword": string,
  "suggestedTags": string[],
  "readTime": string (e.g. "9 min read" based on length),
  "editorNotes": string (fact-check reminders, optional angles, NOT for publication),
  "seoChecklist": string[],
  "imagePrompt": string,
  "imageAlt": string,
  "imageCaption": string
}`;
}

export function parseKeywords(raw: string | string[]): string[] {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((s) => s.trim()).filter(Boolean))].slice(0, 12);
  }
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

function stripJsonFences(text: string): string {
  const t = text.trim();
  if (t.startsWith('```')) {
    return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return t;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function plainExcerpt(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]*\)/g, ' ')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultSeoChecklist(title: string, focusKeyword: string): string[] {
  return [
    `Focus keyword "${focusKeyword}" appears in the title and opening section.`,
    'SEO title is written for search result scanning.',
    'Meta description is in the recommended 140-158 character range.',
    `Slug is concise and aligned with "${slugify(title)}".`,
    'Article uses descriptive H2 subheads and short paragraphs.',
    'FAQ section is included for long-tail search coverage.',
    'Featured image prompt, alt text, and caption are ready for media generation.',
    'Add internal links to related categories before publishing.',
  ];
}

function buildPostImagePrompt(input: {
  title: string;
  excerpt?: string;
  category?: string;
  focusKeyword?: string;
  content?: string;
  style?: string;
}): string {
  const summary = (input.excerpt || plainExcerpt(input.content || '')).slice(0, 420);
  return [
    input.style || 'editorial news feature image, realistic, high detail',
    `Subject: ${input.title}`,
    input.category ? `Category: ${input.category}` : '',
    input.focusKeyword ? `Focus keyword: ${input.focusKeyword}` : '',
    summary ? `Context: ${summary}` : '',
    'Create a landscape 3:2 editorial image suitable as a news featured image.',
    'No readable text, no logos, no watermark, no sensational gore, no fake documents, no staged claims presented as evidence.',
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeDraft(parsed: z.infer<typeof draftSchema>, provider: AiProvider, model: string): GeneratedNewsDraft {
  const title = parsed.title.trim();
  const slug = slugify((parsed.slug ?? title).trim() || title);
  const fk = (parsed.focusKeyword ?? '').trim();
  const focus = fk || title.split(/\s+/).slice(0, 4).join(' ').toLowerCase();
  const words = countWords(parsed.content);

  if (words < MIN_ARTICLE_WORDS) {
    badRequest(`AI draft is too short (${words} words). Regenerate with a stronger model; minimum is ${MIN_ARTICLE_WORDS} words.`);
  }
  if (words > MAX_ARTICLE_WORDS) {
    badRequest(`AI draft is too long (${words} words). Regenerate within the ${MIN_ARTICLE_WORDS}-${MAX_ARTICLE_WORDS} word range.`);
  }

  let seoTitle = (parsed.seoTitle ?? title).trim().slice(0, 60);
  let metaDescription = (parsed.metaDescription ?? parsed.excerpt ?? '').trim().slice(0, 160);
  if (!metaDescription && parsed.excerpt) metaDescription = parsed.excerpt.trim().slice(0, 160);
  if (!metaDescription) metaDescription = `${plainExcerpt(parsed.content).slice(0, 154)}...`;

  const excerpt = (parsed.excerpt ?? metaDescription).trim().slice(0, 280);
  const suggestedTags = (parsed.suggestedTags ?? [])
    .map((t) => slugify(t.trim()) || t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
    .slice(0, 12);
  const readTime = parsed.readTime?.trim() || `${Math.max(7, Math.round(words / 220))} min read`;
  const imagePrompt =
    parsed.imagePrompt?.trim() ||
    buildPostImagePrompt({
      title,
      excerpt,
      focusKeyword: focus,
      content: parsed.content,
    });

  return {
    title,
    slug,
    excerpt,
    content: parsed.content.trim(),
    seoTitle,
    metaDescription,
    focusKeyword: focus.slice(0, 80),
    suggestedTags,
    readTime,
    editorNotes: (parsed.editorNotes ?? '').trim().slice(0, 1200),
    seoChecklist: (parsed.seoChecklist?.length ? parsed.seoChecklist : defaultSeoChecklist(title, focus)).slice(0, 10),
    imagePrompt,
    imageAlt: (parsed.imageAlt || `${title} illustration`).trim().slice(0, 200),
    imageCaption: (parsed.imageCaption || `Editorial illustration for "${title}".`).trim().slice(0, 220),
    provider,
    model,
  };
}

function parseDraftJson(text: string, provider: AiProvider, model: string): GeneratedNewsDraft {
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFences(text));
  } catch {
    badRequest('The model did not return valid JSON. Try again or switch provider/model.');
  }
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    badRequest(`AI draft failed validation: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  return normalizeDraft(parsed.data, provider, model);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.aiRequestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      badRequest(`AI request timed out after ${Math.round(config.aiRequestTimeoutMs / 1000)}s.`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function endpointUrl(endpoint: string | undefined, fallbackBase: string, path: string): string {
  const base = (endpoint || fallbackBase).replace(/\/+$/, '');
  return `${base}${path}`;
}

function isAnthropicModelError(message: string): boolean {
  return /^model\s*:/i.test(message.trim()) || /model.+not.+(found|supported|available|valid)/i.test(message);
}

async function callOpenAI(apiKey: string, model: string, system: string, user: string, endpoint?: string): Promise<string> {
  if (!apiKey) serviceUnavailable('OpenAI is not configured. Add an OpenAI key in API Config or set OPENAI_API_KEY on the API server.');
  const res = await fetchWithTimeout(endpointUrl(endpoint, 'https://api.openai.com/v1', '/chat/completions'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    badRequest(`OpenAI error: ${msg}`);
  }
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) badRequest('OpenAI returned an empty response.');
  return text;
}

async function callOpenRouter(apiKey: string, model: string, system: string, user: string, endpoint?: string): Promise<string> {
  if (!apiKey) serviceUnavailable('OpenRouter is not configured. Add an OpenRouter key in API Config or set OPENROUTER_API_KEY on the API server.');
  const res = await fetchWithTimeout(endpointUrl(endpoint, 'https://openrouter.ai/api/v1', '/chat/completions'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.openrouterSiteUrl,
      'X-Title': config.openrouterAppName,
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    badRequest(`OpenRouter error: ${msg}`);
  }
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) badRequest('OpenRouter returned an empty response.');
  return text;
}

async function callAnthropicOnce(apiKey: string, model: string, system: string, user: string, endpoint?: string): Promise<string> {
  if (!apiKey) serviceUnavailable('Anthropic is not configured. Add an Anthropic key in API Config or set ANTHROPIC_API_KEY on the API server.');
  const res = await fetchWithTimeout(endpointUrl(endpoint, 'https://api.anthropic.com/v1', '/messages'), {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.45,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    badRequest(`Anthropic error: ${msg}`);
  }
  const blocks = body?.content;
  if (!Array.isArray(blocks)) badRequest('Anthropic returned an unexpected response.');
  const text = blocks.map((b: any) => (b?.type === 'text' ? b.text : '')).join('');
  if (!text.trim()) badRequest('Anthropic returned an empty response.');
  return text;
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string, endpoint?: string): Promise<{ text: string; model: string }> {
  const candidates = [...new Set([model, 'claude-3-5-haiku-latest', 'claude-3-haiku-20240307'].filter(Boolean))];
  let lastModelError = '';
  for (const candidate of candidates) {
    try {
      return { text: await callAnthropicOnce(apiKey, candidate, system, user, endpoint), model: candidate };
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^Anthropic error:\s*/i, '') : '';
      if (!isAnthropicModelError(message)) throw error;
      lastModelError = message;
    }
  }
  badRequest(`Anthropic error: ${lastModelError || `model: ${model}`}. Try claude-3-5-haiku-latest or update the model in API Config.`);
}

async function callGoogle(apiKey: string, model: string, system: string, user: string, endpoint?: string): Promise<string> {
  if (!apiKey) serviceUnavailable('Google AI (Gemini) is not configured. Add a Gemini key in API Config or set GOOGLE_AI_API_KEY on the API server.');
  const base = (endpoint || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const url = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const combined = `${system}\n\n---\n\n${user}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: combined }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    badRequest(`Gemini error: ${msg}`);
  }
  const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  if (!text.trim()) badRequest('Gemini returned an empty response.');
  return text;
}

function openAiImageSize(model: string): { width: number; height: number; size: string } {
  return /^dall-e-3/i.test(model)
    ? { width: 1792, height: 1024, size: '1792x1024' }
    : { width: 1536, height: 1024, size: '1536x1024' };
}

async function callOpenAiImage(apiKey: string, model: string, prompt: string, endpoint?: string): Promise<string> {
  if (!apiKey) serviceUnavailable('OpenAI image generation is not configured. Add an OpenAI key in API Config or set OPENAI_API_KEY on the API server.');
  const imageSize = openAiImageSize(model);
  const isDalle3 = /^dall-e-3/i.test(model);
  const payload: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size: imageSize.size,
  };
  if (isDalle3) {
    payload.quality = 'standard';
    payload.response_format = 'b64_json';
  } else {
    payload.quality = 'medium';
  }

  const res = await fetchWithTimeout(endpointUrl(endpoint, 'https://api.openai.com/v1', '/images/generations'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    badRequest(`OpenAI image error: ${msg}`);
  }
  const item = body?.data?.[0];
  if (typeof item?.b64_json === 'string' && item.b64_json.trim()) {
    return `data:image/png;base64,${item.b64_json}`;
  }
  if (typeof item?.url === 'string' && item.url.trim()) {
    return item.url;
  }
  badRequest('OpenAI image generation returned no image.');
}

function imageSizeBytes(url: string): number {
  if (!url.startsWith('data:')) return 0;
  const base64 = url.split(',')[1] ?? '';
  return Buffer.byteLength(base64, 'base64');
}

function sanitizeGeneratedSvg(svg: string): string {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) badRequest('The image model did not return a valid SVG.');
  return trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\s(?:href|xlink:href)=["'](?!#)[^"']*["']/gi, '');
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizeGeneratedSvg(svg))}`;
}

async function callTextModelForSvg(input: AiGeneratePostImageInput, model: string, runtime: Awaited<ReturnType<typeof getAiRuntimeConfig>>): Promise<{ svg: string; alt: string; caption: string }> {
  const system = `You are an editorial art director and SVG illustrator.
Return JSON only with keys: svg, alt, caption.
The svg must be a complete safe SVG string sized 1536 by 1024 with xmlns.
Do not use script, foreignObject, external images, external links, embedded fonts, readable news headlines, watermarks, logos, signatures, political endorsements, gore, or copyrighted characters.
Use abstract editorial symbolism, environment, objects, maps, infrastructure, charts, silhouettes, light, texture, and color.`;
  const user = `Create a professional news featured image as SVG.

Title: ${input.title}
Category: ${input.category}
Focus keyword: ${input.focusKeyword || ''}
Placement: ${input.placement}
Style: ${input.style}
Prompt/context:
${input.imagePrompt || buildPostImagePrompt(input)}

Article excerpt:
${input.excerpt || plainExcerpt(input.content).slice(0, 700)}

Return a polished SVG illustration with layered shapes, depth, and a strong first-screen composition.`;

  let text: string;
  switch (input.provider) {
    case 'openai':
      text = await callOpenAI(runtime.apiKey, model, system, user, runtime.endpoint);
      break;
    case 'anthropic': {
      const result = await callAnthropic(runtime.apiKey, model, system, user, runtime.endpoint);
      text = result.text;
      break;
    }
    case 'google':
      text = await callGoogle(runtime.apiKey, model, system, user, runtime.endpoint);
      break;
    case 'openrouter':
      text = await callOpenRouter(runtime.apiKey, model, system, user, runtime.endpoint);
      break;
    default:
      badRequest('Unknown image generation provider.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFences(text));
  } catch {
    badRequest('The image model did not return valid JSON.');
  }
  const parsed = svgImageSchema.safeParse(raw);
  if (!parsed.success) {
    badRequest(`AI image failed validation: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  return {
    svg: sanitizeGeneratedSvg(parsed.data.svg),
    alt: (parsed.data.alt || `${input.title} editorial illustration`).slice(0, 200),
    caption: (parsed.data.caption || `AI-generated editorial illustration for "${input.title}".`).slice(0, 220),
  };
}

export async function aiCapabilities(): Promise<{
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  openrouter: boolean;
  defaults: { openai: string; anthropic: string; google: string; openrouter: string; openaiImage: string };
}> {
  const [openai, anthropic, google, openrouter] = await Promise.all([
    getAiRuntimeConfig('openai'),
    getAiRuntimeConfig('anthropic'),
    getAiRuntimeConfig('google'),
    getAiRuntimeConfig('openrouter'),
  ]);
  return {
    openai: Boolean(openai.apiKey),
    anthropic: Boolean(anthropic.apiKey),
    google: Boolean(google.apiKey),
    openrouter: Boolean(openrouter.apiKey),
    defaults: {
      openai: openai.model || config.openaiModel,
      anthropic: anthropic.model || config.anthropicModel,
      google: google.model || config.googleGeminiModel,
      openrouter: openrouter.model || config.openrouterModel,
      openaiImage: config.openaiImageModel,
    },
  };
}

export async function generateNewsDraft(input: AiGenerateInput): Promise<GeneratedNewsDraft> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(input);

  let text: string;
  let modelUsed: string;

  switch (input.provider) {
    case 'openai': {
      const runtime = await getAiRuntimeConfig('openai');
      modelUsed = (input.model?.trim() || runtime.model || config.openaiModel).slice(0, 80);
      text = await callOpenAI(runtime.apiKey, modelUsed, system, user, runtime.endpoint);
      break;
    }
    case 'anthropic': {
      const runtime = await getAiRuntimeConfig('anthropic');
      modelUsed = (input.model?.trim() || runtime.model || config.anthropicModel).slice(0, 80);
      const result = await callAnthropic(runtime.apiKey, modelUsed, system, user, runtime.endpoint);
      text = result.text;
      modelUsed = result.model;
      break;
    }
    case 'google': {
      const runtime = await getAiRuntimeConfig('google');
      modelUsed = (input.model?.trim() || runtime.model || config.googleGeminiModel).slice(0, 80);
      text = await callGoogle(runtime.apiKey, modelUsed, system, user, runtime.endpoint);
      break;
    }
    case 'openrouter': {
      const runtime = await getAiRuntimeConfig('openrouter');
      modelUsed = (input.model?.trim() || runtime.model || config.openrouterModel).slice(0, 120);
      text = await callOpenRouter(runtime.apiKey, modelUsed, system, user, runtime.endpoint);
      break;
    }
    default:
      badRequest('Unknown AI provider.');
  }

  return parseDraftJson(text, input.provider, modelUsed);
}

export async function generatePostImageAsset(input: AiGeneratePostImageInput): Promise<GeneratedPostImageAsset> {
  const prompt = (input.imagePrompt?.trim() || buildPostImagePrompt(input)).slice(0, 2200);
  const runtime = await getAiRuntimeConfig(input.provider);
  const canUseOpenAiImageApi = input.provider === 'openai' && Boolean(runtime.apiKey);
  const model = (input.model?.trim() || (canUseOpenAiImageApi ? config.openaiImageModel : runtime.model) || config.openaiImageModel).slice(0, 120);
  const size = canUseOpenAiImageApi ? openAiImageSize(model) : { width: 1536, height: 1024, size: '1536x1024' };
  let url: string;
  let mime = 'image/png';
  let alt = `${input.title} ${input.placement} image`.slice(0, 200);

  if (canUseOpenAiImageApi) {
    url = await callOpenAiImage(runtime.apiKey, model, prompt, runtime.endpoint);
    mime = url.startsWith('data:image/') ? url.slice(5, url.indexOf(';')) || 'image/png' : 'image/png';
  } else {
    if (!runtime.apiKey) {
      serviceUnavailable(`AI image generation is not configured for ${input.provider}. Add a key in API Config or choose a configured provider.`);
    }
    const svg = await callTextModelForSvg(input, model, runtime);
    url = svgDataUrl(svg.svg);
    mime = 'image/svg+xml';
    alt = svg.alt;
  }

  const idSeed = input.postId || slugify(input.title);
  const id = `ai-post-image-${idSeed}-${Date.now()}`;

  return {
    id,
    name: `${slugify(input.title).slice(0, 90)}-${input.placement}-ai.${mime === 'image/svg+xml' ? 'svg' : 'png'}`,
    alt,
    url,
    mime,
    sizeBytes: imageSizeBytes(url),
    width: size.width,
    height: size.height,
    uploadedAt: new Date().toISOString(),
    prompt,
    provider: input.provider,
    model,
  };
}
