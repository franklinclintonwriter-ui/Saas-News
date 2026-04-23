import { useMemo, useState, type MouseEvent } from 'react';
import { Plus, Search, Edit, Trash2, Hash } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { useAuth } from '../../context/auth-context';
import { slugify, tagUsageCount, type AdminTag } from '../../lib/admin/cms-state';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { toast } from '../../lib/notify';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
import { Button } from '../../components/ui/button';

export default function Tags() {
  const { state, dispatch } = useCms();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'name' | 'usage'>('usage');
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', color: '#2563EB' });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canDeleteOrMerge = hasMinimumRole(user?.role, 'EDITOR');

  const usage = (slug: string) => tagUsageCount(state.posts, slug);

  const sorted = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = state.tags.filter((t) => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
    list = [...list].sort((a, b) => {
      if (sort === 'usage') return usage(b.slug) - usage(a.slug);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [state.tags, state.posts, q, sort]);

  const toggleTag = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', color: '#2563EB' });
    setModalOpen(true);
  };

  const openEdit = (e: MouseEvent, tag: AdminTag) => {
    e.stopPropagation();
    setEditing(tag);
    setForm({ name: tag.name, slug: tag.slug, color: tag.color });
    setModalOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Tag name is required.');
      return;
    }
    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name);
    const dup = state.tags.some((t) => t.slug === slug && t.id !== editing?.id);
    if (dup) {
      toast.error('Slug already in use.');
      return;
    }
    if (editing) {
      dispatch({
        type: 'TAG_UPDATE',
        tag: { ...editing, name: form.name.trim(), slug, color: form.color },
      });
      toast.success('Tag updated.');
    } else {
      dispatch({
        type: 'TAG_ADD',
        tag: { id: slug, name: form.name.trim(), slug, color: form.color },
      });
      toast.success('Tag created.');
    }
    setModalOpen(false);
  };

  const runMerge = () => {
    if (!canDeleteOrMerge) {
      toast.error('Editor access is required to merge tags.');
      return;
    }
    if (selected.length < 2 || !mergeTarget) {
      toast.error('Pick at least two tags and a merge target.');
      return;
    }
    if (!selected.includes(mergeTarget)) {
      toast.error('Merge target must be one of the selected tags.');
      return;
    }
    dispatch({ type: 'TAGS_MERGE', sourceIds: selected, targetId: mergeTarget });
    setSelected([]);
    setMergeOpen(false);
    setMergeTarget('');
    toast.success('Tags merged.');
  };

  const confirmDelete = () => {
    if (!canDeleteOrMerge) {
      toast.error('Editor access is required to delete tags.');
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    dispatch({ type: 'TAG_DELETE', id: deleteId });
    setSelected((s) => s.filter((id) => id !== deleteId));
    toast.success('Tag deleted.');
    setDeleteId(null);
  };

  const totalTagged = state.posts.reduce((acc, p) => acc + p.tags.length, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-semibold text-[#374151]">{state.tags.length} total</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {!canDeleteOrMerge ? <p className="text-xs font-semibold text-[#92400E]">Delete and merge actions are editor-only</p> : null}
        <Button onClick={openCreate} className="bg-[#194890] hover:bg-[#2656A8] font-semibold ml-auto">
          <Plus size={20} className="mr-2" />
          New Tag
        </Button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
        <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'usage')}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="usage">Most used</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {selected.length > 0 && (
            <div className="mb-4 p-4 bg-[#F3F4F6] rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-sm font-medium">
                {selected.length} tag{selected.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex flex-wrap gap-2">
                {canDeleteOrMerge ? (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
                      Merge...
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                      onClick={() => {
                        selected.forEach((id) => dispatch({ type: 'TAG_DELETE', id }));
                        toast.success(`Deleted ${selected.length} tag(s).`);
                        setSelected([]);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {sorted.map((tag) => (
              <div
                key={tag.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleTag(tag.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleTag(tag.id)}
                className={`group relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition cursor-pointer ${
                  selected.includes(tag.id) ? 'border-[#194890] bg-[#194890]/5' : 'border-[#E5E7EB] hover:border-[#194890]/30'
                }`}
              >
                <Hash size={16} style={{ color: tag.color }} />
                <span className="font-semibold">{tag.name}</span>
                <span className="text-xs text-[#6B7280] ml-1">({usage(tag.slug)})</span>
                <div className="hidden group-hover:flex absolute -top-2 -right-2 gap-1">
                  <button
                    type="button"
                    onClick={(e) => openEdit(e, tag)}
                    className="p-1 bg-white border border-[#E5E7EB] rounded-full hover:bg-[#F3F4F6] transition"
                    aria-label={`Edit ${tag.name}`}
                  >
                    <Edit size={12} />
                  </button>
                  {canDeleteOrMerge ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(tag.id);
                      }}
                      className="p-1 bg-white border border-[#DC2626] text-[#DC2626] rounded-full hover:bg-[#FEE2E2] transition"
                      aria-label={`Delete ${tag.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Total: {state.tags.length} tags</span>
            <span className="text-[#6B7280]">Tag assignments across posts: {totalTagged}</span>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit tag' : 'Create tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Tag Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full h-12 border border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge tags</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B7280]">
            All posts using the selected tags will point to the target tag. Other selected tags will be removed.
          </p>
          <div>
            <label className="block text-sm font-semibold mb-2">Keep (target)</label>
            <select
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
            >
              <option value="">Select...</option>
              {selected.map((id) => {
                const t = state.tags.find((x) => x.id === id);
                return t ? (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ) : null;
              })}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#194890] hover:bg-[#2656A8]" onClick={runMerge}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>Posts will have this tag removed from their tag list.</AlertDialogDescription>
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
