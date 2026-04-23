import { useMemo, useState } from 'react';
import { Edit, ExternalLink, Link as LinkIcon, Navigation, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { makeId, type NavigationItem } from '../../lib/admin/cms-state';
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

type NavigationForm = Omit<NavigationItem, 'id'>;

const emptyForm: NavigationForm = {
  label: '',
  href: '/',
  location: 'HEADER',
  position: 0,
  external: false,
  enabled: true,
};

const locationLabels: Record<NavigationItem['location'], string> = {
  HEADER: 'Header',
  FOOTER: 'Footer',
  UTILITY: 'Utility',
};

export default function NavigationManager() {
  const { user } = useAuth();
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState<'all' | NavigationItem['location']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NavigationItem | null>(null);
  const [form, setForm] = useState<NavigationForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canManageNavigation = hasMinimumRole(user?.role, 'EDITOR');

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.navigation
      .filter((item) => (location === 'all' ? true : item.location === location))
      .filter((item) => {
        if (!words.length) return true;
        const hay = `${item.label} ${item.href} ${item.location}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => a.location.localeCompare(b.location) || a.position - b.position);
  }, [state.navigation, q, location]);

  const openCreate = () => {
    if (!canManageNavigation) {
      toast.error('Editor access is required to create navigation links.');
      return;
    }
    setEditing(null);
    setForm({ ...emptyForm, position: state.navigation.length * 10 });
    setModalOpen(true);
  };

  const openEdit = (item: NavigationItem) => {
    if (!canManageNavigation) {
      toast.error('Editor access is required to edit navigation links.');
      return;
    }
    setEditing(item);
    setForm({
      label: item.label,
      href: item.href,
      location: item.location,
      position: item.position,
      external: item.external,
      enabled: item.enabled,
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (!canManageNavigation) {
      toast.error('Editor access is required to save navigation links.');
      setModalOpen(false);
      return;
    }
    if (!form.label.trim() || !form.href.trim()) {
      toast.error('Label and URL are required.');
      return;
    }
    dispatch({
      type: 'NAVIGATION_UPSERT',
      item: {
        id: editing?.id ?? makeId(),
        label: form.label.trim(),
        href: form.href.trim(),
        location: form.location,
        position: Number(form.position) || 0,
        external: form.external,
        enabled: form.enabled,
      },
    });
    toast.success(editing ? 'Navigation item updated.' : 'Navigation item created.');
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!canManageNavigation) {
      toast.error('Editor access is required to delete navigation links.');
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    dispatch({ type: 'NAVIGATION_DELETE', id: deleteId });
    toast.success('Navigation item deleted.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        {!canManageNavigation ? <p className="text-xs font-semibold text-[#92400E]">Read-only for your role</p> : null}
        <Button onClick={openCreate} disabled={!canManageNavigation} className="bg-[#194890] font-semibold hover:bg-[#2656A8] ml-auto">
          <Plus size={20} className="mr-2" />
          New Link
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['HEADER', 'FOOTER', 'UTILITY'] as const).map((key) => (
          <div key={key} className="rounded-lg border border-[#E5E7EB] bg-white p-5">
            <p className="text-sm text-[#6B7280]">{locationLabels[key]}</p>
            <p className="mt-2 text-3xl font-bold">{state.navigation.filter((item) => item.location === key).length}</p>
          </div>
        ))}
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
                placeholder="Search navigation..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select value={location} onChange={(event) => setLocation(event.target.value as typeof location)} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              <option value="all">All locations</option>
              <option value="HEADER">Header</option>
              <option value="FOOTER">Footer</option>
              <option value="UTILITY">Utility</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Label</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">URL</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
                        <Navigation size={18} aria-hidden />
                      </div>
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-xs text-[#6B7280]">{item.external ? 'External' : 'Internal'} link</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs px-6 py-4">
                    <code className="block truncate rounded bg-[#F3F4F6] px-2 py-1 text-xs">{item.href}</code>
                  </td>
                  <td className="px-6 py-4 text-sm">{locationLabels[item.location]}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{item.position}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.enabled ? 'bg-[#E8EEF8] text-[#194890]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined} className="rounded p-2 hover:bg-[#F3F4F6]" title="Open">
                        <ExternalLink size={16} />
                      </a>
                      {canManageNavigation ? (
                        <>
                          <button type="button" onClick={() => openEdit(item)} className="rounded p-2 hover:bg-[#F3F4F6]" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button type="button" onClick={() => setDeleteId(item.id)} className="rounded p-2 text-[#DC2626] hover:bg-[#FEE2E2]" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit navigation link' : 'Create navigation link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Label</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={16} />
                <input className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4" value={form.href} onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Location</label>
                <select className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value as NavigationItem['location'] }))}>
                  <option value="HEADER">Header</option>
                  <option value="FOOTER">Footer</option>
                  <option value="UTILITY">Utility</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Position</label>
                <input type="number" min={0} className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: Number(event.target.value) }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.external} onChange={(event) => setForm((current) => ({ ...current, external: event.target.checked }))} />
                External link
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
                Enabled
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit} disabled={!canManageNavigation}>
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete navigation link?</AlertDialogTitle>
            <AlertDialogDescription>This removes the link from any public location using it.</AlertDialogDescription>
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
