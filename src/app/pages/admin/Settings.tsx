import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { FileText, Globe2, Image as ImageIcon, KeyRound, Palette, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Upload } from 'lucide-react';
import { toast } from '../../lib/notify';
import { useCms } from '../../context/cms-context';
import type { SiteSettings } from '../../lib/admin/cms-state';
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

type AssetKey = (typeof assetKeys)[number];

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

export default function Settings() {
  const { state, dispatch, resetWorkspace } = useCms();
  const [draft, setDraft] = useState<SiteSettings>(state.settings);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setDraft(state.settings);
  }, [state.settings]);

  const imageAssets = useMemo(() => state.media.filter((item) => isImageAsset(item.mime)), [state.media]);
  const seoScore = useMemo(() => scoreSeo(draft), [draft]);
  const previewImage = draft.ogImageUrl || draft.logoUrl;
  const brandLogoUrl = draft.logoUrl || draft.faviconUrl;
  const robots = `${draft.robotsIndex ? 'index' : 'noindex'}, ${draft.robotsFollow ? 'follow' : 'nofollow'}`;

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    dispatch({ type: 'SETTINGS_SET', settings: draft });
    toast.success('Settings saved to the API workspace.');
  };

  const resetDefaults = () => {
    const defaults = buildBrandDefaults(draft);
    setDraft(defaults);
    dispatch({ type: 'SETTINGS_SET', settings: defaults });
    toast.message('SEO and brand defaults refreshed from the current publication identity.');
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, key: AssetKey) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 1_400_000) {
      toast.error('Use an image under 1.4 MB for database storage.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update(key, String(reader.result) as SiteSettings[AssetKey]);
    reader.onerror = () => toast.error('Unable to read this image.');
    reader.readAsDataURL(file);
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
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#111827] transition hover:bg-[#F3F4F6]">
          <Upload size={16} aria-hidden />
          Upload
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleImageUpload(event, key)} />
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
          <Button onClick={save} className="bg-[#194890] font-semibold hover:bg-[#2656A8]">
            <Save size={20} className="mr-2" />
            Save Changes
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
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={save}>
              <Save size={20} className="mr-2" />
              Save All Changes
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
        </aside>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh API workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This reloads posts, categories, tags, media, comments, users, and settings from the Prisma API.
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
