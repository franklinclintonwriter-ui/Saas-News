import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Copy, ExternalLink, FileDown, FileText, Globe2, History, Image as ImageIcon, KeyRound, Palette, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Share2, Upload } from 'lucide-react';
import { toast } from '../../lib/notify';
import { useCms } from '../../context/cms-context';
import { useAuth } from '../../context/auth-context';
import type { AdminMedia, SiteSettings } from '../../lib/admin/cms-state';
import { saveAdminSettings, uploadAdminMediaFile } from '../../lib/api-cms';
import { API_BASE_URL, ApiClientError } from '../../lib/api-client';
import { shareArticleMetaUrl } from '../../lib/share-links';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

const fieldClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15';
const textareaClass = `${fieldClass} min-h-28 resize-y`;
const labelClass = 'block text-sm font-semibold text-[#111827] mb-2';
const sectionClass = 'rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm md:p-6';
const assetKeys = ['logoUrl', 'faviconUrl', 'ogImageUrl'] as const;
const assetLabels: Record<AssetKey, string> = {
  logoUrl: 'Header & footer logo',
  faviconUrl: 'Favicon / app icon',
  ogImageUrl: 'Open Graph image',
};
const maxBrandUploadBytes = 10 * 1024 * 1024;

type AssetKey = (typeof assetKeys)[number];
type ShareHistoryEntry = {
  slug: string;
  postId: string;
  title: string;
  timestamp: string;
  checksum: string;
  passCount: number;
  totalCount: number;
};

const SHARE_HISTORY_KEY = 'phulpur24_share_debug_history_v1';
const SHARE_HISTORY_MAX = 10;

function clampText(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function scoreSeo(settings: SiteSettings): number {
  let score = 0;
  const titleLength = settings.defaultSeoTitle.trim().length;
  const descriptionLength = settings.defaultMetaDescription.trim().length;
  if (titleLength >= 30 && titleLength <= 60) score += 20;
  else if (titleLength >= 15 && titleLength <= 75) score += 12;
  if (descriptionLength >= 120 && descriptionLength <= 160) score += 20;
  else if (descriptionLength >= 80 && descriptionLength <= 200) score += 12;
  if (settings.siteUrl) score += 12;
  if (settings.defaultKeywords.split(',').map((k) => k.trim()).filter(Boolean).length >= 3) score += 10;
  if (settings.ogImageUrl || settings.logoUrl) score += 12;
  if (settings.robotsIndex && settings.robotsFollow) score += 10;
  if (settings.structuredDataEnabled) score += 10;
  if (settings.organizationName && settings.contactEmail) score += 6;
  return Math.min(score, 100);
}

function isImageAsset(mime: string): boolean {
  return mime.startsWith('image/');
}

function isExpiredAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 && /expired|unauthorized|authentication/i.test(error.message);
  }
  return error instanceof Error && /access token expired/i.test(error.message);
}

function uniqueMedia(items: AdminMedia[]): AdminMedia[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth || undefined, height: image.naturalHeight || undefined });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({});
    };
    image.src = objectUrl;
  });
}

function buildBrandDefaults(current: SiteSettings): SiteSettings {
  const brand = current.siteTitle.trim() || current.organizationName.trim() || 'Publication';
  return {
    ...current,
    siteTitle: brand,
    organizationName: current.organizationName.trim() || brand,
    logoAlt: current.logoAlt.trim() || brand,
    defaultSeoTitle: `${brand} - Local News, Analysis and Updates`,
    defaultMetaDescription: `Read ${brand} for verified local news, public-interest reporting, analysis, and timely updates from the newsroom.`,
    defaultKeywords: `${brand}, local news, breaking news, analysis, public interest reporting`,
    robotsIndex: true,
    robotsFollow: true,
    structuredDataEnabled: true,
    schemaType: current.schemaType || 'NewsMediaOrganization',
    primaryColor: current.primaryColor || '#194890',
    accentColor: current.accentColor || '#DC2626',
    headerBackground: current.headerBackground || '#FFFFFF',
    footerBackground: current.footerBackground || '#0B1220',
  };
}

function apiRootFromBase(apiBaseUrl: string): string {
  const withoutApi = apiBaseUrl.replace(/\/api\/?$/, '');
  if (/^https?:\/\//i.test(withoutApi)) return withoutApi.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    return new URL(withoutApi || '/', window.location.origin).toString().replace(/\/+$/, '');
  }
  return withoutApi.replace(/\/+$/, '');
}

function extractSlugFromArticleInput(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  if (!raw.includes('/')) return raw.replace(/^\/+|\/+$/g, '');

  try {
    const url = new URL(raw.includes('://') ? raw : `https://placeholder.local${raw.startsWith('/') ? '' : '/'}${raw}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const articleIndex = parts.findIndex((part) => part.toLowerCase() === 'article');
    if (articleIndex >= 0 && parts[articleIndex + 1]) return decodeURIComponent(parts[articleIndex + 1]!);
    return decodeURIComponent(parts[parts.length - 1] || '').replace(/^\/+|\/+$/g, '');
  } catch {
    return raw.replace(/^\/+|\/+$/g, '');
  }
}

function normalizeSiteUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function siteHost(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function checksumHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export default function Settings() {
  const { state, dispatch, resetWorkspace } = useCms();
  const { accessToken, refreshSession, signOut } = useAuth();
  const [draft, setDraft] = useState<SiteSettings>(state.settings);
  const [uploadedAssets, setUploadedAssets] = useState<AdminMedia[]>([]);
  const [uploadingKey, setUploadingKey] = useState<AssetKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [shareSlug, setShareSlug] = useState('');
  const [shareInput, setShareInput] = useState('');
  const [compareMode, setCompareMode] = useState<'article' | 'default'>('article');
  const [shareHistory, setShareHistory] = useState<ShareHistoryEntry[]>([]);

  useEffect(() => {
    setDraft(state.settings);
  }, [state.settings]);

  const imageAssets = useMemo(() => uniqueMedia([...uploadedAssets, ...state.media]).filter((item) => isImageAsset(item.mime)), [state.media, uploadedAssets]);
  const seoScore = useMemo(() => scoreSeo(draft), [draft]);
  const previewImage = draft.ogImageUrl || draft.logoUrl;
  const brandLogoUrl = draft.logoUrl;
  const robots = `${draft.robotsIndex ? 'index' : 'noindex'}, ${draft.robotsFollow ? 'follow' : 'nofollow'}`;
  const publishedPosts = useMemo(
    () => state.posts.filter((post) => post.status === 'Published' && post.slug).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.posts],
  );

  useEffect(() => {
    if (!shareSlug && publishedPosts.length > 0) {
      setShareSlug(publishedPosts[0]!.slug);
    }
  }, [publishedPosts, shareSlug]);

  const activeShareSlug = shareSlug.trim() || publishedPosts[0]?.slug || '';
  const selectedSharePost = useMemo(
    () => publishedPosts.find((post) => post.slug === activeShareSlug) || null,
    [publishedPosts, activeShareSlug],
  );
  const selectedSharePostId = selectedSharePost?.id || '';
  const selectedShareTitle = selectedSharePost?.seoTitle?.trim() || selectedSharePost?.title || draft.defaultSeoTitle || draft.siteTitle;
  const selectedShareDescription =
    selectedSharePost?.metaDescription?.trim() || selectedSharePost?.excerpt || draft.defaultMetaDescription || draft.tagline;
  const selectedShareImage = selectedSharePost?.featuredImageId
    ? `${apiRootFromBase(API_BASE_URL)}/media/${selectedSharePost.featuredImageId}/file`
    : previewImage;
  const shareMetaUrl = activeShareSlug ? shareArticleMetaUrl(API_BASE_URL, activeShareSlug) : '';
  const shareDebugLinks = {
    facebookInspector: shareMetaUrl
      ? `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shareMetaUrl)}`
      : '',
    linkedinInspector: shareMetaUrl
      ? `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(shareMetaUrl)}`
      : '',
    twitterValidator: 'https://cards-dev.twitter.com/validator',
  };

  const shareChecks = useMemo(
    () => [
      {
        label: 'Title length',
        ok: selectedShareTitle.trim().length >= 30 && selectedShareTitle.trim().length <= 70,
        detail: `${selectedShareTitle.trim().length} chars (target 30-70)`,
      },
      {
        label: 'Description length',
        ok: selectedShareDescription.trim().length >= 80 && selectedShareDescription.trim().length <= 200,
        detail: `${selectedShareDescription.trim().length} chars (target 80-200)`,
      },
      {
        label: 'Card image',
        ok: Boolean(selectedShareImage),
        detail: selectedShareImage ? 'Image detected' : 'No image configured',
      },
      {
        label: 'Share URL',
        ok: Boolean(shareMetaUrl),
        detail: shareMetaUrl ? 'Generated' : 'Missing',
      },
      {
        label: 'Twitter handle',
        ok: Boolean(draft.twitterHandle.trim()),
        detail: draft.twitterHandle.trim() ? draft.twitterHandle.trim() : 'Not set',
      },
    ],
    [selectedShareTitle, selectedShareDescription, selectedShareImage, shareMetaUrl, draft.twitterHandle],
  );
  const passCount = useMemo(() => shareChecks.filter((item) => item.ok).length, [shareChecks]);
  const qaChecksum = useMemo(
    () =>
      checksumHex(
        JSON.stringify({
          slug: activeShareSlug,
          shareMetaUrl,
          title: selectedShareTitle,
          description: selectedShareDescription,
          image: selectedShareImage,
          checks: shareChecks.map((item) => ({ label: item.label, ok: item.ok })),
        }),
      ),
    [activeShareSlug, shareMetaUrl, selectedShareTitle, selectedShareDescription, selectedShareImage, shareChecks],
  );

  const defaultShareTitle = draft.defaultSeoTitle || draft.siteTitle;
  const defaultShareDescription = draft.defaultMetaDescription || draft.tagline;
  const defaultShareImage = previewImage;
  const previewModeTitle = compareMode === 'article' ? selectedShareTitle : defaultShareTitle;
  const previewModeDescription = compareMode === 'article' ? selectedShareDescription : defaultShareDescription;
  const previewModeImage = compareMode === 'article' ? selectedShareImage : defaultShareImage;
  const canonicalSiteUrl = normalizeSiteUrl(draft.siteUrl);
  const canonicalHost = siteHost(canonicalSiteUrl);
  const googleSearchConsolePropertyUrl = canonicalHost
    ? `https://search.google.com/search-console?resource_id=sc-domain:${encodeURIComponent(canonicalHost)}`
    : 'https://search.google.com/search-console';
  const googleSearchConsoleInspectUrl = canonicalSiteUrl
    ? `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(canonicalSiteUrl)}&id=${encodeURIComponent(canonicalSiteUrl)}`
    : 'https://search.google.com/search-console';

  const copyShareUrl = async () => {
    if (!shareMetaUrl) {
      toast.error('Choose a published article to generate a share URL.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareMetaUrl);
      toast.success('Share metadata URL copied.');
    } catch {
      toast.error('Clipboard copy failed.');
    }
  };

  const copyChecksum = async () => {
    try {
      await navigator.clipboard.writeText(qaChecksum);
      toast.success('QA checksum copied.');
    } catch {
      toast.error('Checksum copy failed.');
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHARE_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ShareHistoryEntry[];
      if (!Array.isArray(parsed)) return;
      setShareHistory(parsed.slice(0, SHARE_HISTORY_MAX));
    } catch {
      // Ignore history hydration failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHARE_HISTORY_KEY, JSON.stringify(shareHistory.slice(0, SHARE_HISTORY_MAX)));
    } catch {
      // Ignore storage quota/private mode errors.
    }
  }, [shareHistory]);

  const pushShareHistory = () => {
    if (!activeShareSlug) return;
    const nextEntry: ShareHistoryEntry = {
      slug: activeShareSlug,
      postId: selectedSharePostId,
      title: selectedSharePost?.title || selectedShareTitle,
      timestamp: new Date().toISOString(),
      checksum: qaChecksum,
      passCount,
      totalCount: shareChecks.length,
    };

    setShareHistory((current) => {
      const withoutSame = current.filter((item) => !(item.slug === nextEntry.slug && item.checksum === nextEntry.checksum));
      return [nextEntry, ...withoutSame].slice(0, SHARE_HISTORY_MAX);
    });
  };

  const detectShareSlug = () => {
    const candidate = extractSlugFromArticleInput(shareInput);
    if (!candidate) {
      toast.error('Paste an article URL or slug first.');
      return;
    }
    const match = publishedPosts.find((post) => post.slug.toLowerCase() === candidate.toLowerCase());
    if (!match) {
      toast.error('No published article matched that URL/slug.');
      return;
    }
    setShareSlug(match.slug);
    toast.success(`Selected: ${match.slug}`);
    pushShareHistory();
  };

  const openInspector = (url: string, label: string) => {
    if (!url || !shareMetaUrl) {
      toast.error('Generate a share URL first.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.message(`${label} opened in a new tab.`);
  };

  const openAllInspectors = () => {
    if (!shareMetaUrl) {
      toast.error('Generate a share URL first.');
      return;
    }
    const urls = [
      shareDebugLinks.facebookInspector,
      shareDebugLinks.linkedinInspector,
      shareDebugLinks.twitterValidator,
    ].filter(Boolean);

    urls.forEach((url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    pushShareHistory();
    toast.success('Opened all platform validators.');
  };

  const exportQaReport = () => {
    if (!shareMetaUrl) {
      toast.error('Generate a share URL first.');
      return;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      selectedArticle: {
        id: selectedSharePostId,
        slug: activeShareSlug,
        title: selectedSharePost?.title || '',
        status: selectedSharePost?.status || '',
      },
      shareUrls: {
        shareMetaUrl,
        facebookInspector: shareDebugLinks.facebookInspector,
        linkedinInspector: shareDebugLinks.linkedinInspector,
        twitterValidator: shareDebugLinks.twitterValidator,
      },
      metadata: {
        articleMode: {
          title: selectedShareTitle,
          description: selectedShareDescription,
          image: selectedShareImage,
        },
        defaultMode: {
          title: defaultShareTitle,
          description: defaultShareDescription,
          image: defaultShareImage,
        },
      },
      checks: shareChecks,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `share-qa-${activeShareSlug || 'article'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushShareHistory();
    toast.success('QA report exported.');
  };

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const withFreshToken = async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    let token = accessToken;
    if (!token) token = await refreshSession();
    if (!token) {
      signOut();
      throw new Error('Please sign in again to change settings.');
    }

    try {
      return await operation(token);
    } catch (error) {
      if (!isExpiredAuthError(error)) throw error;
      const freshToken = await refreshSession();
      if (!freshToken) {
        signOut();
        throw new Error('Session expired. Please sign in again.');
      }
      return operation(freshToken);
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await withFreshToken((token) => saveAdminSettings(draft, token));
      const media = uniqueMedia([...uploadedAssets, ...state.media]);
      setDraft(saved);
      dispatch({ type: 'HYDRATE', payload: { ...state, media, settings: saved } });
      toast.success('Settings saved to the API workspace.');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        toast.error('Only Admin users can change site settings.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Unable to save settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    const defaults = buildBrandDefaults(draft);
    setDraft(defaults);
    dispatch({ type: 'SETTINGS_SET', settings: defaults });
    toast.message('SEO and brand defaults refreshed from the current publication identity.');
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, key: AssetKey) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > maxBrandUploadBytes) {
      toast.error('Use an image under 10 MB for branding assets.');
      return;
    }
    setUploadingKey(key);
    try {
      const dimensions = await getImageDimensions(file);
      const media = await withFreshToken((token) => uploadAdminMediaFile(file, token, dimensions));
      setUploadedAssets((current) => uniqueMedia([media, ...current]));
      setDraft((current) => {
        const next = { ...current, [key]: media.url } as SiteSettings;
        if (key === 'logoUrl' && !next.logoAlt.trim()) {
          next.logoAlt = media.alt || media.name.replace(/\.[^.]+$/, '');
        }
        return next;
      });
      toast.success(`${assetLabels[key]} uploaded. Save changes to publish it.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to upload ${assetLabels[key].toLowerCase()}.`);
    } finally {
      setUploadingKey(null);
    }
  };

  const assetControl = (key: AssetKey, label: string, previewClass = 'h-20 w-32') => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={draft[key]}
          onChange={(e) => update(key, e.target.value as SiteSettings[AssetKey])}
          placeholder="https://cdn.example.com/asset.png or uploaded data URL"
          className={fieldClass}
        />
        <label className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#F3F4F6] ${uploadingKey ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
          <Upload size={16} aria-hidden />
          {uploadingKey === key ? 'Uploading...' : 'Upload'}
          <input disabled={Boolean(uploadingKey)} type="file" accept="image/*" className="sr-only" onChange={(event) => void handleImageUpload(event, key)} />
        </label>
      </div>
      {imageAssets.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const asset = imageAssets.find((item) => item.id === e.target.value);
            if (asset) update(key, asset.url as SiteSettings[AssetKey]);
          }}
          className={`${fieldClass} mt-3`}
          aria-label={`Select ${label.toLowerCase()} from media library`}
        >
          <option value="">Select from media library</option>
          {imageAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
      )}
      {draft[key] && (
        <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <img src={draft[key]} alt="" className={`${previewClass} object-contain`} />
        </div>
      )}
    </div>
  );

  const colorControl = (key: 'primaryColor' | 'accentColor' | 'headerBackground' | 'footerBackground', label: string) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-3">
        <input
          type="color"
          value={draft[key]}
          onChange={(e) => update(key, e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-[#D1D5DB] bg-white p-1"
          aria-label={`${label} color picker`}
        />
        <input type="text" value={draft[key]} onChange={(e) => update(key, e.target.value)} className={fieldClass} />
      </div>
    </div>
  );

  const checkboxControl = (key: 'showHeaderLogo' | 'showSiteTitle' | 'showFooterLogo' | 'showFooterSiteTitle', label: string) => (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm font-semibold text-[#111827]">
      <input
        type="checkbox"
        checked={draft[key]}
        onChange={(e) => update(key, e.target.checked)}
        className="h-4 w-4 rounded border-[#D1D5DB] accent-[#194890]"
      />
      {label}
    </label>
  );

  const showPreviewHeaderLogo = draft.showHeaderLogo && Boolean(brandLogoUrl);
  const showPreviewHeaderTitle = draft.showSiteTitle || !showPreviewHeaderLogo;
  const showPreviewFooterLogo = draft.showFooterLogo && Boolean(brandLogoUrl);
  const showPreviewFooterTitle = draft.showFooterSiteTitle || !showPreviewFooterLogo;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center md:mb-8">
        <div>
          <h1 className="mb-2 text-2xl font-bold md:text-3xl">Settings</h1>
          <p className="text-sm text-[#6B7280] md:text-base">Branding, SEO, metadata, and publication controls</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/admin/api-config">
              <KeyRound size={18} className="mr-2" />
              API Config
            </Link>
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="bg-[#194890] font-semibold hover:bg-[#2656A8]">
            <Save size={20} className="mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
                <ImageIcon size={20} aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold">Site Identity</h2>
                <p className="text-sm text-[#6B7280]">Logo, title, tagline, and public organization identity</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Site Title</label>
                <input type="text" value={draft.siteTitle} onChange={(e) => update('siteTitle', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Organization Name</label>
                <input type="text" value={draft.organizationName} onChange={(e) => update('organizationName', e.target.value)} className={fieldClass} />
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass}>Tagline</label>
                <input type="text" value={draft.tagline} onChange={(e) => update('tagline', e.target.value)} className={fieldClass} />
              </div>
              <div className="lg:col-span-2">{assetControl('logoUrl', 'Header & Footer Logo')}</div>
              <div>
                <label className={labelClass}>Logo Alt Text</label>
                <input type="text" value={draft.logoAlt} onChange={(e) => update('logoAlt', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Logo Height</label>
                <div className="grid grid-cols-[1fr_88px] gap-3">
                  <input
                    type="range"
                    min={24}
                    max={96}
                    value={draft.logoHeight}
                    onChange={(e) => update('logoHeight', Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min={24}
                    max={96}
                    value={draft.logoHeight}
                    onChange={(e) => update('logoHeight', Number(e.target.value))}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass}>Header & Footer Display</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {checkboxControl('showHeaderLogo', 'Show logo in header')}
                  {checkboxControl('showSiteTitle', 'Show site name in header')}
                  {checkboxControl('showFooterLogo', 'Show logo in footer')}
                  {checkboxControl('showFooterSiteTitle', 'Show site name in footer')}
                </div>
              </div>
              <div className="lg:col-span-2">{assetControl('faviconUrl', 'Favicon / App Icon', 'h-16 w-16')}</div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626]">
                <Search size={20} aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold">SEO Defaults</h2>
                <p className="text-sm text-[#6B7280]">Search result defaults and social sharing metadata</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Default SEO Title</label>
                <input type="text" value={draft.defaultSeoTitle} onChange={(e) => update('defaultSeoTitle', e.target.value)} className={fieldClass} />
                <p className="mt-1 text-xs text-[#6B7280]">{draft.defaultSeoTitle.length}/60 preferred characters</p>
              </div>
              <div>
                <label className={labelClass}>Default Meta Description</label>
                <textarea value={draft.defaultMetaDescription} onChange={(e) => update('defaultMetaDescription', e.target.value)} className={textareaClass} />
                <p className="mt-1 text-xs text-[#6B7280]">{draft.defaultMetaDescription.length}/160 preferred characters</p>
              </div>
              <div>
                <label className={labelClass}>Default Keywords</label>
                <input type="text" value={draft.defaultKeywords} onChange={(e) => update('defaultKeywords', e.target.value)} className={fieldClass} />
              </div>
              <div>{assetControl('ogImageUrl', 'Default Open Graph Image', 'h-32 w-56')}</div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981]/10 text-[#0F766E]">
                <Globe2 size={20} aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold">Indexing & Structured Data</h2>
                <p className="text-sm text-[#6B7280]">Canonical URL, robots, schema, and search verification</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className={labelClass}>Canonical Site URL</label>
                <input type="url" value={draft.siteUrl} onChange={(e) => update('siteUrl', e.target.value)} placeholder="https://example.com" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Schema Type</label>
                <select value={draft.schemaType} onChange={(e) => update('schemaType', e.target.value)} className={fieldClass}>
                  <option value="NewsMediaOrganization">NewsMediaOrganization</option>
                  <option value="Organization">Organization</option>
                  <option value="LocalBusiness">LocalBusiness</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Twitter/X Handle</label>
                <input type="text" value={draft.twitterHandle} onChange={(e) => update('twitterHandle', e.target.value)} placeholder="@phulpur24" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Google Verification</label>
                <input type="text" value={draft.googleSiteVerification} onChange={(e) => update('googleSiteVerification', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Bing Verification</label>
                <input type="text" value={draft.bingSiteVerification} onChange={(e) => update('bingSiteVerification', e.target.value)} className={fieldClass} />
              </div>
              <div className="lg:col-span-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Google Search Console Links</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {canonicalHost ? `Using domain property for ${canonicalHost}` : 'Set Canonical Site URL to generate direct property links.'}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a
                    href={googleSearchConsolePropertyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Open Search Console Property
                  </a>
                  <a
                    href={googleSearchConsoleInspectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Inspect Canonical URL
                  </a>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.robotsIndex} onChange={(e) => update('robotsIndex', e.target.checked)} />
                Allow search indexing
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.robotsFollow} onChange={(e) => update('robotsFollow', e.target.checked)} />
                Allow link following
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.structuredDataEnabled} onChange={(e) => update('structuredDataEnabled', e.target.checked)} />
                Enable JSON-LD structured data
              </label>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                <Palette size={20} aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold">Visual Customization</h2>
                <p className="text-sm text-[#6B7280]">Brand colors used by header, footer, live labels, and metadata</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {colorControl('primaryColor', 'Primary Brand Color')}
              {colorControl('accentColor', 'Accent Color')}
              {colorControl('headerBackground', 'Header Background')}
              {colorControl('footerBackground', 'Footer Background')}
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-6 text-xl font-bold">Social Media</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {(['facebook', 'twitter', 'instagram', 'linkedin'] as const).map((key) => (
                <div key={key}>
                  <label className={labelClass}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  <input type="url" value={draft[key]} onChange={(e) => update(key, e.target.value)} placeholder={`https://${key}.com/account`} className={fieldClass} />
                </div>
              ))}
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-6 text-xl font-bold">Footer & Contact</h2>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className={labelClass}>Footer About Text</label>
                <textarea value={draft.footerAbout} onChange={(e) => update('footerAbout', e.target.value)} className={textareaClass} />
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass}>Copyright Text</label>
                <input type="text" value={draft.copyright} onChange={(e) => update('copyright', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Email</label>
                <input type="email" value={draft.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Support Email</label>
                <input type="email" value={draft.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Press Email</label>
                <input type="email" value={draft.pressEmail} onChange={(e) => update('pressEmail', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Advertising Email</label>
                <input type="email" value={draft.advertisingEmail} onChange={(e) => update('advertisingEmail', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Tips Email</label>
                <input type="email" value={draft.tipsEmail} onChange={(e) => update('tipsEmail', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" value={draft.phone} onChange={(e) => update('phone', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Business Hours</label>
                <input type="text" value={draft.businessHours} onChange={(e) => update('businessHours', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <textarea value={draft.address} onChange={(e) => update('address', e.target.value)} className={`${fieldClass} min-h-11`} />
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass}>Office Locations</label>
                <textarea
                  value={draft.officeLocations}
                  onChange={(e) => update('officeLocations', e.target.value)}
                  placeholder="City|Address|Phone, one office per line"
                  className={textareaClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-6 text-xl font-bold">Newsletter & Tracking</h2>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Newsletter From Name</label>
                <input type="text" value={draft.newsletterFromName} onChange={(e) => update('newsletterFromName', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Newsletter From Email</label>
                <input type="email" value={draft.newsletterFromEmail} onChange={(e) => update('newsletterFromEmail', e.target.value)} className={fieldClass} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.newsletterEnabled} onChange={(e) => update('newsletterEnabled', e.target.checked)} />
                Enable newsletter subscriptions
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.dailyDigest} onChange={(e) => update('dailyDigest', e.target.checked)} />
                Send daily digest emails
              </label>
              <div>
                <label className={labelClass}>Google Analytics ID</label>
                <input type="text" value={draft.gaId} onChange={(e) => update('gaId', e.target.value)} placeholder="G-XXXXXXXXXX" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Facebook Pixel ID</label>
                <input type="text" value={draft.fbPixel} onChange={(e) => update('fbPixel', e.target.value)} className={fieldClass} />
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass}>Custom Tracking Code</label>
                <textarea value={draft.customTracking} onChange={(e) => update('customTracking', e.target.value)} className={`${textareaClass} font-mono`} />
              </div>
            </div>
          </section>

          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={resetDefaults}>
              <RotateCcw size={18} className="mr-2" />
              Reset to Defaults
            </Button>
            <Button type="button" variant="destructive" onClick={() => setResetOpen(true)}>
              <RefreshCw size={18} className="mr-2" />
              Refresh from API
            </Button>
            <Button type="button" disabled={saving} className="bg-[#194890] hover:bg-[#2656A8]" onClick={() => void save()}>
              <Save size={20} className="mr-2" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className={sectionClass}>
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="text-[#0F766E]" size={22} aria-hidden />
              <div>
                <h2 className="font-bold">SEO Health</h2>
                <p className="text-sm text-[#6B7280]">{seoScore}/100</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div className="h-full rounded-full bg-[#0F766E]" style={{ width: `${seoScore}%` }} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Robots</dt>
                <dd className="font-semibold">{robots}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Schema</dt>
                <dd className="font-semibold">{draft.structuredDataEnabled ? draft.schemaType : 'Off'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7280]">Canonical</dt>
                <dd className="max-w-[190px] truncate font-semibold">{draft.siteUrl || 'Missing'}</dd>
              </div>
            </dl>
          </section>

          <section className={sectionClass}>
            <div className="mb-4 flex items-center gap-3">
              <FileText className="text-[#194890]" size={22} aria-hidden />
              <h2 className="font-bold">Brand Preview</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
              <div className="px-4 py-3" style={{ backgroundColor: draft.primaryColor }}>
                <span className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: draft.accentColor }}>
                  Live
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-4" style={{ backgroundColor: draft.headerBackground }}>
                {showPreviewHeaderLogo && <img src={brandLogoUrl} alt="" className="max-w-[120px] object-contain" style={{ height: `${Math.min(draft.logoHeight, 52)}px` }} />}
                {showPreviewHeaderTitle && <span className="font-bold" style={{ color: draft.primaryColor }}>{draft.siteTitle}</span>}
              </div>
              <div className="px-4 py-4 text-sm text-white" style={{ backgroundColor: draft.footerBackground }}>
                <div className="mb-3 flex items-center gap-3">
                  {showPreviewFooterLogo && <img src={brandLogoUrl} alt="" className="max-w-[120px] object-contain" style={{ height: `${Math.min(draft.logoHeight, 44)}px` }} />}
                  {showPreviewFooterTitle && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{draft.siteTitle}</span>}
                </div>
                <p>{draft.footerAbout || draft.tagline}</p>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-4 font-bold">Search Preview</h2>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#1A0DAB]">{clampText(draft.defaultSeoTitle || draft.siteTitle, 64)}</p>
              <p className="mt-1 text-xs text-[#006621]">{draft.siteUrl || 'https://example.com'}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{clampText(draft.defaultMetaDescription || draft.tagline, 170)}</p>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-4 font-bold">Social Preview</h2>
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex h-40 items-center justify-center bg-[#F3F4F6]">
                {previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="text-[#9CA3AF]" size={42} aria-hidden />}
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">{draft.siteUrl || 'localhost'}</p>
                <h3 className="mt-1 line-clamp-2 font-bold">{draft.defaultSeoTitle || draft.siteTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-[#6B7280]">{draft.defaultMetaDescription || draft.tagline}</p>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-4 flex items-center gap-3">
              <Share2 className="text-[#194890]" size={22} aria-hidden />
              <div>
                <h2 className="font-bold">Share Debug Studio</h2>
                <p className="text-xs text-[#6B7280]">Validate crawler-safe OG/Twitter metadata before publishing</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Paste Article URL or Slug</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    className={fieldClass}
                    value={shareInput}
                    onChange={(e) => setShareInput(e.target.value)}
                    placeholder="https://site.com/article/some-slug or some-slug"
                    aria-label="Paste article URL or slug"
                  />
                  <Button type="button" variant="outline" onClick={detectShareSlug}>
                    Detect
                  </Button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Published Article Slug</label>
                <select
                  className={fieldClass}
                  value={activeShareSlug}
                  onChange={(e) => setShareSlug(e.target.value)}
                  aria-label="Published article slug"
                >
                  {publishedPosts.length === 0 ? <option value="">No published posts found</option> : null}
                  {publishedPosts.map((post) => (
                    <option key={post.id} value={post.slug}>
                      {post.slug}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (publishedPosts[0]) setShareSlug(publishedPosts[0].slug);
                    }}
                  >
                    Use Latest Published
                  </Button>
                  {selectedSharePost ? <span className="text-xs text-[#6B7280] line-clamp-1">{selectedSharePost.title}</span> : null}
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Selection Lock</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
                  <p className="text-[#111827]"><span className="font-semibold">ID:</span> {selectedSharePostId || 'N/A'}</p>
                  <p className="text-[#111827]"><span className="font-semibold">Slug:</span> {activeShareSlug || 'N/A'}</p>
                  <p className="text-[#111827]"><span className="font-semibold">QA Checksum:</span> {qaChecksum}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyChecksum()}>
                    <Copy size={14} className="mr-1" />
                    Copy Checksum
                  </Button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Crawler Share URL</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    className={fieldClass}
                    value={shareMetaUrl}
                    readOnly
                    aria-label="Crawler share URL"
                    placeholder="Select a published article to generate metadata URL"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" onClick={() => void copyShareUrl()} disabled={!shareMetaUrl}>
                      <Copy size={16} className="mr-2" />
                      Copy URL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!shareMetaUrl}
                      onClick={() => {
                        if (!shareMetaUrl) return;
                        window.open(shareMetaUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Open Share HTML
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => openInspector(shareDebugLinks.facebookInspector, 'Facebook Inspector')}
                  className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                >
                  Facebook Inspector
                </button>
                <button
                  type="button"
                  onClick={() => openInspector(shareDebugLinks.linkedinInspector, 'LinkedIn Inspector')}
                  className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                >
                  LinkedIn Inspector
                </button>
                <button
                  type="button"
                  onClick={() => openInspector(shareDebugLinks.twitterValidator, 'X Card Validator')}
                  className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                >
                  X Card Validator
                </button>
              </div>

              <Button type="button" variant="outline" onClick={openAllInspectors} disabled={!shareMetaUrl} className="w-full">
                <ExternalLink size={16} className="mr-2" />
                Open All Validators
              </Button>

              <Button type="button" variant="outline" onClick={exportQaReport} disabled={!shareMetaUrl} className="w-full">
                <FileDown size={16} className="mr-2" />
                Export QA Report
              </Button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCompareMode('article')}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${compareMode === 'article' ? 'border-[#194890] bg-[#E8EEF8] text-[#194890]' : 'border-[#D1D5DB] bg-white text-[#111827]'}`}
                >
                  Preview: Article Metadata
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('default')}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${compareMode === 'default' ? 'border-[#194890] bg-[#E8EEF8] text-[#194890]' : 'border-[#D1D5DB] bg-white text-[#111827]'}`}
                >
                  Preview: Site Defaults
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Metadata Quality Checks</p>
                <ul className="space-y-2">
                  {shareChecks.map((item) => (
                    <li key={item.label} className="flex items-start justify-between gap-3 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                        <p className="text-xs text-[#6B7280]">{item.detail}</p>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${item.ok ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'}`}
                      >
                        {item.ok ? 'Pass' : 'Needs Attention'}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#6B7280]">Score: {passCount}/{shareChecks.length} checks passed</p>
              </div>

              <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Recent Test History</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShareHistory([])}>
                    Clear
                  </Button>
                </div>
                {shareHistory.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No share checks recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {shareHistory.map((item) => (
                      <li key={`${item.slug}-${item.checksum}-${item.timestamp}`} className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#111827] line-clamp-1">{item.slug}</p>
                            <p className="text-[11px] text-[#6B7280]">{new Date(item.timestamp).toLocaleString()} · {item.passCount}/{item.totalCount} pass</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShareSlug(item.slug);
                              setCompareMode('article');
                              toast.success(`Restored ${item.slug}`);
                            }}
                            className="inline-flex items-center rounded border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#111827] hover:bg-[#F3F4F6]"
                          >
                            <History size={12} className="mr-1" />
                            Restore
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[#6B7280] line-clamp-1">Checksum: {item.checksum}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Expected Card Snapshot</p>
                <div className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
                  <div className="h-24 bg-[#F3F4F6]">
                    {previewModeImage ? <img src={previewModeImage} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] uppercase text-[#6B7280]">{(draft.siteUrl || 'site').replace(/^https?:\/\//, '')}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-[#111827]">{previewModeTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{previewModeDescription}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Platform Simulations</p>

                <div className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    Facebook Feed Card
                  </div>
                  <div className="h-28 bg-[#E5E7EB]">
                    {previewModeImage ? <img src={previewModeImage} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] uppercase text-[#6B7280]">{(draft.siteUrl || 'site').replace(/^https?:\/\//, '')}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#1D2129]">{previewModeTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#606770]">{previewModeDescription}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    X Large Summary Card
                  </div>
                  <div className="h-28 bg-[#111827]">
                    {previewModeImage ? <img src={previewModeImage} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-[#6B7280]">{(draft.siteUrl || 'site').replace(/^https?:\/\//, '')}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#0F1419]">{previewModeTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#536471]">{previewModeDescription}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    LinkedIn Share Card
                  </div>
                  <div className="h-28 bg-[#EEF3F8]">
                    {previewModeImage ? <img src={previewModeImage} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] uppercase text-[#6B7280]">{(draft.siteUrl || 'site').replace(/^https?:\/\//, '')}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#191919]">{previewModeTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#666666]">{previewModeDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh API workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This reloads posts, categories, tags, media, comments, users, and settings from the live API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              onClick={() => {
                resetWorkspace();
                setResetOpen(false);
                toast.success('Workspace refreshed from the API.');
              }}
            >
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
