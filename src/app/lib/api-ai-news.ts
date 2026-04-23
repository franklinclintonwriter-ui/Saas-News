import { apiRequest, ApiClientError } from './api-client';
import type { AdminMedia } from './admin/cms-state';

export type AiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export type AiCapabilities = {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  openrouter: boolean;
  defaults: {
    openai: string;
    anthropic: string;
    google: string;
    openrouter: string;
    openaiImage: string;
  };
};

const EMPTY_AI_CAPABILITIES: AiCapabilities = {
  openai: false,
  anthropic: false,
  google: false,
  openrouter: false,
  defaults: {
    openai: '',
    anthropic: '',
    google: '',
    openrouter: '',
    openaiImage: '',
  },
};

function normalizeAiCapabilities(value: unknown): AiCapabilities {
  if (!value || typeof value !== 'object') return EMPTY_AI_CAPABILITIES;
  const raw = value as Partial<AiCapabilities> & {
    defaults?: Partial<AiCapabilities['defaults']>;
  };
  return {
    openai: Boolean(raw.openai),
    anthropic: Boolean(raw.anthropic),
    google: Boolean(raw.google),
    openrouter: Boolean(raw.openrouter),
    defaults: {
      openai: raw.defaults?.openai ?? '',
      anthropic: raw.defaults?.anthropic ?? '',
      google: raw.defaults?.google ?? '',
      openrouter: raw.defaults?.openrouter ?? '',
      openaiImage: raw.defaults?.openaiImage ?? '',
    },
  };
}

export type AiNewsTone =
  | 'neutral'
  | 'analytical'
  | 'breaking'
  | 'investigative'
  | 'opinion_light'
  | 'human_interest';

export type AiGenerateNewsBody = {
  provider: AiProvider;
  model?: string;
  topic: string;
  focusKeywords: string | string[];
  tone: AiNewsTone;
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

export type AiGeneratePostImageBody = {
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
  style?: string;
};

export type GeneratedPostImageAsset = AdminMedia & {
  prompt: string;
  provider: AiProvider;
  model: string;
};

export async function fetchAiCapabilities(accessToken: string): Promise<AiCapabilities> {
  const payload = await apiRequest<unknown>('/admin/ai/capabilities', { token: accessToken });
  return normalizeAiCapabilities(payload);
}

export async function requestAiGenerateNews(accessToken: string, body: AiGenerateNewsBody): Promise<GeneratedNewsDraft> {
  return apiRequest<GeneratedNewsDraft>('/admin/ai/generate-news', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify(body),
  });
}

export async function requestAiGeneratePostImage(accessToken: string, body: AiGeneratePostImageBody): Promise<GeneratedPostImageAsset> {
  return apiRequest<GeneratedPostImageAsset>('/admin/ai/generate-post-image', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify(body),
  });
}

export function isExpiredAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 && /expired|unauthorized|authentication|invalid access token/i.test(error.message);
  }
  return false;
}
