import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/auth-context';
import { toast } from '../../lib/notify';
import {
  deleteIntegrationConfig,
  fetchIntegrationConfigs,
  isExpiredIntegrationAuthError,
  saveIntegrationConfig,
  testIntegrationConfig,
  type IntegrationConfig,
  type IntegrationSaveBody,
  type IntegrationSource,
} from '../../lib/api-integrations';

const fieldClass = 'w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15';
const textareaClass = `${fieldClass} min-h-24 resize-y`;
const labelClass = 'block text-sm font-semibold text-[#111827] mb-2';
const cardClass = 'rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm';
const categoryOptions = ['AI', 'EMAIL', 'MEDIA', 'STORAGE', 'PAYMENTS', 'ANALYTICS', 'WEBHOOK', 'GENERAL'];

type IntegrationDraft = IntegrationSaveBody & {
  secretInput: string;
};

type CustomForm = {
  provider: string;
  label: string;
  category: string;
  secret: string;
};

function sortConfigs(rows: IntegrationConfig[]): IntegrationConfig[] {
  return [...rows].sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category);
    return byCategory || a.provider.localeCompare(b.provider);
  });
}

function buildDrafts(rows: IntegrationConfig[]): Record<string, IntegrationDraft> {
  return Object.fromEntries(
    rows.map((row) => [
      row.provider,
      {
        label: row.label,
        category: row.category,
        enabled: row.enabled,
        model: row.model,
        endpoint: row.endpoint,
        notes: row.notes,
        secretInput: '',
        clearSecret: false,
      },
    ]),
  );
}

function sourceLabel(source: IntegrationSource): string {
  switch (source) {
    case 'database':
      return 'Encrypted in database';
    case 'environment':
      return 'Using server environment';
    case 'disabled':
      return 'Disabled';
    default:
      return 'Not configured';
  }
}

function sourceClass(source: IntegrationSource): string {
  switch (source) {
    case 'database':
      return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]';
    case 'environment':
      return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#194890]';
    case 'disabled':
      return 'border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]';
    default:
      return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]';
  }
}

function providerIcon(row: IntegrationConfig) {
  if (!row.enabled) return <AlertTriangle size={18} aria-hidden />;
  if (row.configured) return <CheckCircle2 size={18} aria-hidden />;
  return <KeyRound size={18} aria-hidden />;
}

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export default function ApiConfig() {
  const { accessToken, refreshSession } = useAuth();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, IntegrationDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<CustomForm>({ provider: '', label: '', category: 'GENERAL', secret: '' });

  const withAuth = useCallback(
    async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new Error('Sign in again to manage API keys.');
      try {
        return await action(accessToken);
      } catch (error) {
        if (isExpiredIntegrationAuthError(error)) {
          const nextToken = await refreshSession();
          if (nextToken) return action(nextToken);
        }
        throw error;
      }
    },
    [accessToken, refreshSession],
  );

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await withAuth(fetchIntegrationConfigs);
      setConfigs(sortConfigs(rows));
      setDrafts(buildDrafts(rows));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load API configuration.');
    } finally {
      setLoading(false);
    }
  }, [withAuth]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const groupedConfigs = useMemo(() => {
    const groups = new Map<string, IntegrationConfig[]>();
    for (const row of configs) {
      groups.set(row.category, [...(groups.get(row.category) ?? []), row]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [configs]);

  const stats = useMemo(() => {
    const configured = configs.filter((item) => item.configured && item.enabled).length;
    const missing = configs.filter((item) => !item.configured && item.enabled).length;
    return { configured, missing, total: configs.length };
  }, [configs]);

  const updateDraft = <K extends keyof IntegrationDraft>(provider: string, key: K, value: IntegrationDraft[K]) => {
    setDrafts((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        [key]: value,
      },
    }));
  };

  const replaceConfig = (saved: IntegrationConfig) => {
    setConfigs((current) => sortConfigs(current.some((item) => item.provider === saved.provider)
      ? current.map((item) => (item.provider === saved.provider ? saved : item))
      : [...current, saved]));
    setDrafts((current) => ({
      ...current,
      [saved.provider]: {
        label: saved.label,
        category: saved.category,
        enabled: saved.enabled,
        model: saved.model,
        endpoint: saved.endpoint,
        notes: saved.notes,
        secretInput: '',
        clearSecret: false,
      },
    }));
  };

  const handleSave = async (row: IntegrationConfig) => {
    const draft = drafts[row.provider];
    if (!draft) return;
    setSaving((current) => ({ ...current, [row.provider]: true }));
    try {
      const typedSecret = draft.secretInput.trim();
      const body: IntegrationSaveBody = {
        label: draft.label.trim(),
        category: draft.category.trim().toUpperCase(),
        enabled: Boolean(draft.enabled),
        model: draft.model?.trim(),
        endpoint: draft.endpoint?.trim(),
        notes: draft.notes?.trim(),
        clearSecret: typedSecret ? false : Boolean(draft.clearSecret),
      };
      if (typedSecret) body.secret = typedSecret;
      const saved = await withAuth((token) => saveIntegrationConfig(token, row.provider, body));
      replaceConfig(saved);
      toast.success(`${saved.label} saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save integration.');
    } finally {
      setSaving((current) => ({ ...current, [row.provider]: false }));
    }
  };

  const handleTest = async (row: IntegrationConfig) => {
    setTesting((current) => ({ ...current, [row.provider]: true }));
    try {
      const result = await withAuth((token) => testIntegrationConfig(token, row.provider));
      if (result.ready) toast.success(result.message);
      else toast.warning(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to check integration.');
    } finally {
      setTesting((current) => ({ ...current, [row.provider]: false }));
    }
  };

  const handleDelete = async (row: IntegrationConfig) => {
    setSaving((current) => ({ ...current, [row.provider]: true }));
    try {
      await withAuth((token) => deleteIntegrationConfig(token, row.provider));
      await loadConfigs();
      toast.success(row.builtIn ? `${row.label} reset to defaults.` : `${row.label} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove integration.');
    } finally {
      setSaving((current) => ({ ...current, [row.provider]: false }));
    }
  };

  const handleCustomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const provider = custom.provider.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(provider)) {
      toast.error('Use a slug-like provider id.');
      return;
    }
    if (configs.some((item) => item.provider === provider)) {
      toast.error('That provider already exists.');
      return;
    }
    setSaving((current) => ({ ...current, [provider]: true }));
    try {
      const saved = await withAuth((token) => saveIntegrationConfig(token, provider, {
        label: custom.label.trim(),
        category: custom.category,
        enabled: true,
        secret: custom.secret.trim() || undefined,
        model: '',
        endpoint: '',
        notes: '',
      }));
      replaceConfig(saved);
      setCustom({ provider: '', label: '', category: 'GENERAL', secret: '' });
      toast.success(`${saved.label} added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add integration.');
    } finally {
      setSaving((current) => ({ ...current, [provider]: false }));
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-end md:mb-8">
        <Button type="button" onClick={loadConfigs} variant="outline" disabled={loading}>
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className={cardClass}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#0F766E]" size={22} aria-hidden />
            <div>
              <p className="text-sm text-[#6B7280]">Ready providers</p>
              <p className="text-2xl font-bold">{stats.configured}</p>
            </div>
          </div>
        </section>
        <section className={cardClass}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-[#B45309]" size={22} aria-hidden />
            <div>
              <p className="text-sm text-[#6B7280]">Missing keys</p>
              <p className="text-2xl font-bold">{stats.missing}</p>
            </div>
          </div>
        </section>
        <section className={cardClass}>
          <div className="flex items-center gap-3">
            <KeyRound className="text-[#194890]" size={22} aria-hidden />
            <div>
              <p className="text-sm text-[#6B7280]">Total providers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
            <Plus size={20} aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold">Add Custom Provider</h2>
            <p className="text-sm text-[#6B7280]">Store a private key or token for a custom integration</p>
          </div>
        </div>
        <form onSubmit={handleCustomSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_180px_1fr_auto] lg:items-end">
          <div>
            <label className={labelClass}>Provider ID</label>
            <input
              type="text"
              value={custom.provider}
              onChange={(e) => setCustom((current) => ({ ...current, provider: e.target.value }))}
              placeholder="custom-provider"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Label</label>
            <input
              type="text"
              value={custom.label}
              onChange={(e) => setCustom((current) => ({ ...current, label: e.target.value }))}
              placeholder="Provider name"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={custom.category}
              onChange={(e) => setCustom((current) => ({ ...current, category: e.target.value }))}
              className={fieldClass}
            >
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>API Key</label>
            <input
              type="password"
              value={custom.secret}
              onChange={(e) => setCustom((current) => ({ ...current, secret: e.target.value }))}
              placeholder="Write-only secret"
              className={fieldClass}
            />
          </div>
          <Button type="submit" className="bg-[#194890] font-semibold hover:bg-[#2656A8]">
            <Plus size={18} className="mr-2" />
            Add
          </Button>
        </form>
      </section>

      {loading ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#6B7280]">
          Loading API providers...
        </div>
      ) : (
        <div className="space-y-8">
          {groupedConfigs.map(([category, rows]) => (
            <section key={category}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{category}</h2>
                <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold text-[#6B7280]">
                  {rows.length} providers
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {rows.map((row) => {
                  const draft = drafts[row.provider];
                  if (!draft) return null;
                  return (
                    <article key={row.provider} className={cardClass}>
                      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">{row.label}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sourceClass(row.source)}`}>
                              {providerIcon(row)}
                              {sourceLabel(row.source)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {row.provider}
                            {row.secretPreview ? ` - ${row.secretPreview}` : ''}
                          </p>
                        </div>
                        <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm font-semibold text-[#111827]">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.enabled)}
                            onChange={(e) => updateDraft(row.provider, 'enabled', e.target.checked)}
                            className="h-4 w-4 accent-[#194890]"
                          />
                          Enabled
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className={labelClass}>Label</label>
                          <input
                            type="text"
                            value={draft.label}
                            onChange={(e) => updateDraft(row.provider, 'label', e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Category</label>
                          <input
                            type="text"
                            value={draft.category}
                            onChange={(e) => updateDraft(row.provider, 'category', e.target.value.toUpperCase())}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Model</label>
                          <input
                            type="text"
                            value={draft.model ?? ''}
                            onChange={(e) => updateDraft(row.provider, 'model', e.target.value)}
                            placeholder={row.category === 'AI' ? 'Provider model' : 'Optional'}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Endpoint</label>
                          <input
                            type="url"
                            value={draft.endpoint ?? ''}
                            onChange={(e) => updateDraft(row.provider, 'endpoint', e.target.value)}
                            placeholder="https://api.example.com"
                            className={fieldClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Replace API Key</label>
                          <input
                            type="password"
                            value={draft.secretInput}
                            onChange={(e) => updateDraft(row.provider, 'secretInput', e.target.value)}
                            placeholder={row.secretPreview || 'Write-only secret'}
                            className={fieldClass}
                          />
                          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#4B5563]">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.clearSecret)}
                              onChange={(e) => updateDraft(row.provider, 'clearSecret', e.target.checked)}
                              className="h-4 w-4 accent-[#DC2626]"
                            />
                            Clear saved database key
                          </label>
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Notes</label>
                          <textarea
                            value={draft.notes ?? ''}
                            onChange={(e) => updateDraft(row.provider, 'notes', e.target.value)}
                            className={textareaClass}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#6B7280]">Updated: {formatDate(row.updatedAt)}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => handleTest(row)} disabled={testing[row.provider]}>
                            <Zap size={16} className="mr-2" />
                            {testing[row.provider] ? 'Checking' : 'Check'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => handleDelete(row)} disabled={saving[row.provider]}>
                            <Trash2 size={16} className="mr-2" />
                            {row.builtIn ? 'Reset' : 'Delete'}
                          </Button>
                          <Button type="button" onClick={() => handleSave(row)} disabled={saving[row.provider]} className="bg-[#194890] hover:bg-[#2656A8]">
                            <Save size={16} className="mr-2" />
                            {saving[row.provider] ? 'Saving' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
