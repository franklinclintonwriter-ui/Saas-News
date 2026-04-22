import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Wand2,
  AlertCircle,
  BookOpen,
  Gauge,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from '../../lib/notify';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import {
  fetchAiCapabilities,
  requestAiGeneratePostImage,
  requestAiGenerateNews,
  isExpiredAuthError,
  type AiCapabilities,
  type AiProvider,
  type AiNewsTone,
  type GeneratedNewsDraft,
} from '../../lib/api-ai-news';
import { slugify, type AdminPost } from '../../lib/admin/cms-state';

type ApplyMode = 'full' | 'seo_only' | 'body_only';

const TONE_OPTIONS: { value: AiNewsTone; label: string }[] = [
  { value: 'neutral', label: 'Neutral / wire style' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'breaking', label: 'Breaking news' },
  { value: 'investigative', label: 'Investigative' },
  { value: 'opinion_light', label: 'Light commentary' },
  { value: 'human_interest', label: 'Human interest' },
];

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function hasSubstantialDraft(post: AdminPost): boolean {
  return post.title.trim().length > 3 || post.content.trim().length > 120;
}

type Props = {
  post: AdminPost;
  setPost: React.Dispatch<React.SetStateAction<AdminPost>>;
};

export function AiDraftAssistant({ post, setPost }: Props) {
  const { accessToken, refreshSession } = useAuth();
  const { state, dispatch } = useCms();
  const [open, setOpen] = useState(true);
  const [caps, setCaps] = useState<AiCapabilities | null>(null);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [focusKeywords, setFocusKeywords] = useState(post.focusKeyword || '');
  const [tone, setTone] = useState<AiNewsTone>('neutral');
  const [language, setLanguage] = useState('en');
  const [audience, setAudience] = useState('');
  const [articleLength, setArticleLength] = useState<'brief' | 'standard' | 'in_depth'>('standard');
  const [provider, setProvider] = useState<AiProvider>('openai');
  const [modelOverride, setModelOverride] = useState('');
  const [applyMode, setApplyMode] = useState<ApplyMode>('full');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [lastDraft, setLastDraft] = useState<GeneratedNewsDraft | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const withFreshToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      let token = accessToken;
      if (!token) throw new Error('Sign in to use AI drafting.');
      try {
        return await fn(token);
      } catch (e) {
        if (!isExpiredAuthError(e)) throw e;
        const next = await refreshSession();
        if (!next) throw e;
        return await fn(next);
      }
    },
    [accessToken, refreshSession],
  );

  useEffect(() => {
    setFocusKeywords(post.focusKeyword || '');
  }, [post.id]);

  useEffect(() => {
    if (!caps) return;
    const ready =
      (provider === 'openai' && caps.openai) ||
      (provider === 'anthropic' && caps.anthropic) ||
      (provider === 'google' && caps.google) ||
      (provider === 'openrouter' && caps.openrouter);
    if (ready) return;
    if (caps.openai) setProvider('openai');
    else if (caps.openrouter) setProvider('openrouter');
    else if (caps.anthropic) setProvider('anthropic');
    else if (caps.google) setProvider('google');
  }, [caps, provider]);

  useEffect(() => {
    if (!accessToken) {
      setCaps(null);
      setCapsError('Sign in to load AI providers.');
      return;
    }
    let cancelled = false;
    void withFreshToken((token) => fetchAiCapabilities(token))
      .then((c) => {
        if (!cancelled) {
          setCaps(c);
          setCapsError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCapsError('Could not load AI capabilities.');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, withFreshToken]);

  const providerReady = useMemo(() => {
    if (!caps) return false;
    if (provider === 'openai') return caps.openai;
    if (provider === 'anthropic') return caps.anthropic;
    if (provider === 'openrouter') return caps.openrouter;
    return caps.google;
  }, [caps, provider]);

  const categoryName = useMemo(
    () => state.categories.find((category) => category.slug === post.categorySlug)?.name ?? 'News',
    [post.categorySlug, state.categories],
  );

  const applyDraft = useCallback(
    (draft: GeneratedNewsDraft) => {
      setPost((p) => {
        const mergeTags = (existing: string[], incoming: string[]) => {
          const set = new Set(existing.map((t) => slugify(t) || t));
          for (const t of incoming) {
            const s = slugify(t) || t;
            if (s) set.add(s);
          }
          return [...set].slice(0, 14);
        };

        if (applyMode === 'seo_only') {
          return {
            ...p,
            seoTitle: draft.seoTitle.slice(0, 70),
            metaDescription: draft.metaDescription.slice(0, 180),
            focusKeyword: draft.focusKeyword.slice(0, 80),
            excerpt: draft.excerpt ? draft.excerpt.slice(0, 280) : p.excerpt,
            readTime: draft.readTime || p.readTime,
            updatedAt: new Date().toISOString(),
          };
        }
        if (applyMode === 'body_only') {
          return {
            ...p,
            content: draft.content,
            excerpt: draft.excerpt.slice(0, 280) || p.excerpt,
            readTime: draft.readTime || p.readTime,
            updatedAt: new Date().toISOString(),
          };
        }
        const nextTitle = draft.title;
        const nextSlug = draft.slug || slugify(nextTitle);
        return {
          ...p,
          title: nextTitle,
          slug: nextSlug,
          excerpt: draft.excerpt.slice(0, 280) || draft.metaDescription.slice(0, 220),
          content: draft.content,
          seoTitle: draft.seoTitle.slice(0, 70),
          metaDescription: draft.metaDescription.slice(0, 180),
          focusKeyword: draft.focusKeyword.slice(0, 80),
          tags: mergeTags(p.tags, draft.suggestedTags),
          readTime: draft.readTime || p.readTime,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [applyMode, setPost],
  );

  const offerFeaturedImageGeneration = useCallback(
    async (draft: GeneratedNewsDraft) => {
      if (post.featuredImageId) return;
      if (!providerReady) {
        toast.message('No configured AI provider is available for image generation. Publishing will still use the automatic fallback if needed.');
        return;
      }
      const okConfirm = window.confirm(
        'This generated post has no featured image. Generate an AI featured image from the article now? Cancel will keep the draft and you can continue without an image.',
      );
      if (!okConfirm) {
        toast.message('Continuing without an AI image. You can upload one later or publish with the automatic fallback.');
        return;
      }

      setImageLoading(true);
      try {
        const media = await withFreshToken((token) =>
          requestAiGeneratePostImage(token, {
            provider,
            title: draft.title,
            excerpt: draft.excerpt,
            content: draft.content,
            category: categoryName,
            focusKeyword: draft.focusKeyword,
            postId: post.id,
            imagePrompt: draft.imagePrompt,
            placement: 'featured',
            style: 'realistic editorial news feature image, high detail, natural light, professional journalism style',
          }),
        );
        dispatch({ type: 'MEDIA_ADD', item: media });
        setPost((p) => ({
          ...p,
          featuredImageId: media.id,
          updatedAt: new Date().toISOString(),
        }));
        toast.success(`AI featured image generated (${media.provider} / ${media.model}) and attached to the post.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'AI image generation failed.';
        toast.error(msg);
      } finally {
        setImageLoading(false);
      }
    },
    [categoryName, dispatch, post.featuredImageId, post.id, provider, providerReady, setPost, withFreshToken],
  );

  const onGenerate = async () => {
    if (!topic.trim() || topic.trim().length < 20) {
      toast.error('Enter a detailed topic or brief (at least 20 characters).');
      return;
    }
    if (!focusKeywords.trim()) {
      toast.error('Add at least one focus keyword or phrase.');
      return;
    }
    if (!providerReady) {
      toast.error('Configure an API key for this provider on the server, or pick another provider.');
      return;
    }
    if (hasSubstantialDraft(post)) {
      const okConfirm = window.confirm(
        'This will merge generated content into your draft (per â€œApply modeâ€). Continue?',
      );
      if (!okConfirm) return;
    }

    setLoading(true);
    setLastDraft(null);
    try {
      const draft = await withFreshToken((token) =>
        requestAiGenerateNews(token, {
          provider,
          model: modelOverride.trim() || undefined,
          topic: topic.trim(),
          focusKeywords: focusKeywords.trim(),
          tone,
          language: language.trim() || 'en',
          audience: audience.trim() || undefined,
          articleLength,
        }),
      );
      setLastDraft(draft);
      applyDraft(draft);
      await offerFeaturedImageGeneration(draft);
      toast.success(`Draft applied (${draft.provider} Â· ${draft.model}). Review and edit before publishing.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const configuredCount = caps ? [caps.openai, caps.openrouter, caps.anthropic, caps.google].filter(Boolean).length : 0;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-[#F8FAFC] to-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#F1F5F9]/80 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
            <Sparkles size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-[#0F172A] flex items-center gap-2 flex-wrap">
              AI newsroom assistant
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
                SEO + body
              </span>
            </h3>
            <p className="text-sm text-[#64748B] truncate">
              Long-form 1500-3000 word drafts with SEO fields and optional AI featured images.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="shrink-0 text-[#64748B]" size={20} /> : <ChevronDown className="shrink-0 text-[#64748B]" size={20} />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0 space-y-4 border-t border-[#E5E7EB]">
          {capsError && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2 border border-amber-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{capsError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
            <Gauge size={14} className="shrink-0" />
            <span>
              Providers configured: <strong className="text-[#0F172A]">{configuredCount}/4</strong>
              {caps && !caps.openai && !caps.openrouter && !caps.anthropic && !caps.google && (
                <span className="block mt-1 text-amber-800">
                  Add provider keys in Settings / API Config, or set OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in `.env` and restart the API.
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#475569] mb-1">Topic & angle</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is the story? Include context, geography, timeframe, and what readers should learn."
                rows={4}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:ring-2 focus:ring-[#194890]/30 focus:border-[#194890] outline-none resize-y min-h-[100px]"
              />
              <p className="text-xs text-[#94A3B8] mt-1">{topic.trim().length}/6000 - add facts, location, timeframe, and source context</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Focus keywords</label>
              <input
                type="text"
                value={focusKeywords}
                onChange={(e) => setFocusKeywords(e.target.value)}
                placeholder="primary phrase, secondary, another (comma-separated)"
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:ring-2 focus:ring-[#194890]/30 focus:border-[#194890] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Model provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white"
              >
                <option value="openai" disabled={caps ? !caps.openai : false}>
                  OpenAI {caps && !caps.openai ? '(not configured)' : ''}
                </option>
                <option value="openrouter" disabled={caps ? !caps.openrouter : false}>
                  OpenRouter {caps && !caps.openrouter ? '(not configured)' : ''}
                </option>
                <option value="anthropic" disabled={caps ? !caps.anthropic : false}>
                  Anthropic Claude {caps && !caps.anthropic ? '(not configured)' : ''}
                </option>
                <option value="google" disabled={caps ? !caps.google : false}>
                  Google Gemini {caps && !caps.google ? '(not configured)' : ''}
                </option>
              </select>
              {caps && (
                <p className="text-xs text-[#94A3B8] mt-1">
                  Default text model:{' '}
                  <code className="text-[#475569]">
                    {provider === 'openai' && caps.defaults.openai}
                    {provider === 'openrouter' && caps.defaults.openrouter}
                    {provider === 'anthropic' && caps.defaults.anthropic}
                    {provider === 'google' && caps.defaults.google}
                  </code>
                  <span className="block">
                    Image model:{' '}
                    <code className="text-[#475569]">{caps.defaults.openaiImage}</code>
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as AiNewsTone)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white"
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Article length</label>
              <select
                value={articleLength}
                onChange={(e) => setArticleLength(e.target.value as 'brief' | 'standard' | 'in_depth')}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white"
              >
                <option value="brief">Professional short (1,500-1,800 words)</option>
                <option value="standard">SEO feature (1,800-2,400 words)</option>
                <option value="in_depth">Deep dive (2,400-3,000 words)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Language (BCP-47)</label>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#475569] mb-1">Target audience (optional)</label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. policy professionals, local readers, tech enthusiasts"
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
            <p className="text-xs font-semibold text-[#475569]">Apply mode</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {(
                [
                  ['full', 'Full article + SEO + tags'],
                  ['seo_only', 'SEO & excerpt only'],
                  ['body_only', 'Body & read time only'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                    applyMode === value
                      ? 'border-[#194890] bg-white shadow-sm'
                      : 'border-transparent bg-white/60 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="applyMode"
                    value={value}
                    checked={applyMode === value}
                    onChange={() => setApplyMode(value)}
                    className="accent-[#194890]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="text-xs font-semibold text-[#194890] hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced â€” model override
          </button>
          {showAdvanced && (
            <input
              value={modelOverride}
              onChange={(e) => setModelOverride(e.target.value)}
              placeholder="Optional: override default model id"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-mono"
            />
          )}

          <button
            type="button"
            disabled={loading || !providerReady}
            onClick={() => void onGenerate()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#194890] text-white py-3 text-sm font-semibold hover:bg-[#143a73] disabled:opacity-50 disabled:pointer-events-none transition"
          >
            {loading || imageLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Wand2 size={18} />
            )}
            {imageLoading ? 'Generating image...' : loading ? 'Generating long-form draft...' : 'Generate long-form SEO draft'}
          </button>

          {lastDraft && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950 space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <BookOpen size={16} />
                Last run: {lastDraft.provider} Â· {lastDraft.model}
              </p>
              <p className="text-xs text-emerald-900/90">
                ~{wordCount(lastDraft.content)} words Â· {lastDraft.readTime}
              </p>
              {lastDraft.seoChecklist?.length > 0 && (
                <ul className="grid gap-1 pt-2 text-xs text-emerald-900/90 sm:grid-cols-2">
                  {lastDraft.seoChecklist.slice(0, 6).map((item) => (
                    <li key={item} className="rounded border border-emerald-200/80 bg-white/60 px-2 py-1">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {lastDraft.imagePrompt && (
                <div className="flex items-start gap-2 rounded border border-emerald-200/80 bg-white/70 px-2 py-2 text-xs text-emerald-900/90">
                  <ImageIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>Featured image prompt ready. If no image is selected, the assistant asks whether to generate one after the draft.</span>
                </div>
              )}
              {lastDraft.editorNotes && (
                <div className="pt-2 border-t border-emerald-200/80">
                  <button
                    type="button"
                    onClick={() => setShowNotes((n) => !n)}
                    className="text-xs font-semibold text-emerald-900 underline"
                  >
                    {showNotes ? 'Hide' : 'Show'} editor notes (not published)
                  </button>
                  {showNotes && (
                    <p className="text-xs mt-2 whitespace-pre-wrap text-emerald-900/85">{lastDraft.editorNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
