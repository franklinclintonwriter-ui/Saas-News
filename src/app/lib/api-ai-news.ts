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
  return apiRequest<AiCapabilities>('/admin/ai/capabilities', { token: accessToken });
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
