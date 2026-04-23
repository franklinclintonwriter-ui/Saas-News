import { useMemo, useState } from 'react';
import { Edit, ExternalLink, Megaphone, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { makeId, slugify, type AdPlacement } from '../../lib/admin/cms-state';
import { toast } from '../../lib/notify';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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

type AdForm = Omit<AdPlacement, 'id' | 'startsAt' | 'endsAt'> & {
  startsAt: string;
  endsAt: string;
};

const emptyForm: AdForm = {
  key: '',
  name: '',
  placement: 'home-sidebar',
  label: 'Advertisement',
  imageUrl: '',
  targetUrl: '',
  html: '',
  enabled: true,
  startsAt: '',
  endsAt: '',
};

const placementOptions = [
  'home-sidebar',
  'article-sidebar',
  'category-sidebar',
  'search-sidebar',
  'header-banner',
  'footer-banner',
  'sponsored-card',
];

function toDateTimeInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function AdsManager() {
  const { user } = useAuth();
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [placement, setPlacement] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdPlacement | null>(null);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canManageAds = hasMinimumRole(user?.role, 'EDITOR');

  const placements = useMemo(() => ['all', ...Array.from(new Set([...placementOptions, ...state.ads.map((ad) => ad.placement)]))], [state.ads]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.ads
      .filter((ad) => (placement === 'all' ? true : ad.placement === placement))
      .filter((ad) => {
        if (!words.length) return true;
        const hay = `${ad.key} ${ad.name} ${ad.placement} ${ad.targetUrl} ${ad.label}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => a.placement.localeCompare(b.placement) || a.name.localeCompare(b.name));
  }, [state.ads, q, placement]);

  const openCreate = () => {
    if (!canManageAds) {
      toast.error('Editor access is required to create ads.');
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (ad: AdPlacement) => {
    if (!canManageAds) {
      toast.error('Editor access is required to edit ads.');
      return;
    }
    setEditing(ad);
    setForm({
      key: ad.key,
      name: ad.name,
      placement: ad.placement,
      label: ad.label,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      html: ad.html,
      enabled: ad.enabled,
      startsAt: toDateTimeInput(ad.startsAt),
      endsAt: toDateTimeInput(ad.endsAt),
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (!canManageAds) {
      toast.error('Editor access is required to save ads.');
      setModalOpen(false);
      return;
    }
    if (!form.name.trim() || !form.placement.trim()) {
      toast.error('Ad name and placement are required.');
      return;
    }
    const key = slugify(form.key || form.name);
    const duplicate = state.ads.some((ad) => ad.key === key && ad.id !== editing?.id);
    if (duplicate) {
      toast.error('Ad key already exists.');
      return;
    }
    dispatch({
      type: 'AD_UPSERT',
      ad: {
        id: editing?.id ?? makeId(),
        key,
        name: form.name.trim(),
        placement: form.placement.trim(),
        label: form.label.trim() || 'Advertisement',
        imageUrl: form.imageUrl.trim(),
        targetUrl: form.targetUrl.trim(),
        html: form.html.trim(),
        enabled: form.enabled,
        startsAt: fromDateTimeInput(form.startsAt),
        endsAt: fromDateTimeInput(form.endsAt),
      },
    });
    toast.success(editing ? 'Ad placement updated.' : 'Ad placement created.');
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!canManageAds) {
      toast.error('Editor access is required to delete ads.');
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    dispatch({ type: 'AD_DELETE', id: deleteId });
    toast.success('Ad placement deleted.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        {!canManageAds ? <p className="text-xs font-semibold text-[#92400E]">Read-only for your role</p> : null}
        <Button onClick={openCreate} disabled={!canManageAds} className="bg-[#194890] font-semibold hover:bg-[#2656A8] ml-auto">
          <Plus size={20} className="mr-2" />
          New Ad
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Placements</p>
          <p className="mt-2 text-3xl font-bold">{state.ads.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Enabled</p>
          <p className="mt-2 text-3xl font-bold">{state.ads.filter((ad) => ad.enabled).length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">With images</p>
          <p className="mt-2 text-3xl font-bold">{state.ads.filter((ad) => ad.imageUrl).length}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search ads..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select value={placement} onChange={(event) => setPlacement(event.target.value)} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              {placements.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All placements' : item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
          {filtered.map((ad) => (
            <article key={ad.id} className="overflow-hidden rounded-lg border border-[#E5E7EB]">
              <div className="flex h-40 items-center justify-center bg-[#F3F4F6]">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.label || ad.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center text-sm text-[#6B7280]">
                    <Megaphone className="mx-auto mb-2" size={28} aria-hidden />
                    HTML or empty creative
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{ad.name}</h2>
                    <p className="mt-1 text-xs text-[#6B7280]">{ad.placement}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ad.enabled ? 'bg-[#E8EEF8] text-[#194890]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                    {ad.enabled ? 'Live' : 'Off'}
                  </span>
                </div>
                <p className="truncate rounded bg-[#F3F4F6] px-2 py-1 font-mono text-xs">{ad.key}</p>
                {ad.targetUrl && (
                  <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#194890] hover:underline">
                    <ExternalLink size={15} />
                    Target URL
                  </a>
                )}
                {canManageAds ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(ad)}>
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]" onClick={() => setDeleteId(ad.id)}>
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit ad placement' : 'Create ad placement'}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">Name</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Key</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 font-mono text-sm" value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Placement</label>
              <input list="ad-placement-options" className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.placement} onChange={(event) => setForm((current) => ({ ...current, placement: event.target.value }))} />
              <datalist id="ad-placement-options">
                {placementOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Label</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Image URL or data URL</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Target URL</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Starts at</label>
              <input type="datetime-local" className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Ends at</label>
              <input type="datetime-local" className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
              Enabled
            </label>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">HTML creative</label>
              <textarea className="min-h-32 w-full rounded-lg border border-[#E5E7EB] px-4 py-2 font-mono text-sm" value={form.html} onChange={(event) => setForm((current) => ({ ...current, html: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit} disabled={!canManageAds}>
              Save Ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ad placement?</AlertDialogTitle>
            <AlertDialogDescription>This removes the creative from the public ad slots that reference this placement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#DC2626] hover:bg-[#B91C1C]" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
