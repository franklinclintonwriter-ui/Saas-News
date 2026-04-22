import { useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, FolderOpen } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { categoryPostCount, slugify, type AdminCategory } from '../../lib/admin/cms-state';
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

export default function Categories() {
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: '#2563EB' });
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return state.categories;
    return state.categories.filter(
      (c) => c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s) || c.description.toLowerCase().includes(s),
    );
  }, [state.categories, q]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', color: '#2563EB' });
    setModalOpen(true);
  };

  const openEdit = (c: AdminCategory) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description, color: c.color });
    setModalOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name);
    const dup = state.categories.some((c) => c.slug === slug && c.id !== editing?.id);
    if (dup) {
      toast.error('Slug already in use.');
      return;
    }
    if (editing) {
      dispatch({
        type: 'CATEGORY_UPDATE',
        category: { ...editing, name: form.name.trim(), slug, description: form.description.trim(), color: form.color },
      });
      toast.success('Category updated.');
    } else {
      dispatch({
        type: 'CATEGORY_ADD',
        category: {
          id: slug,
          name: form.name.trim(),
          slug,
          description: form.description.trim(),
          color: form.color,
        },
      });
      toast.success('Category created.');
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const count = categoryPostCount(state.posts, deleteTarget.slug);
    if (count > 0) {
      toast.error(`Reassign or delete ${count} post(s) using this category first.`);
      setDeleteTarget(null);
      return;
    }
    dispatch({ type: 'CATEGORY_DELETE', id: deleteTarget.id });
    toast.success('Category deleted.');
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Categories</h1>
          <p className="text-sm md:text-base text-[#6B7280]">Organize your content into categories</p>
        </div>
        <Button onClick={openCreate} className="bg-[#194890] hover:bg-[#2656A8] font-semibold">
          <Plus size={20} className="mr-2" />
          New Category
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
              aria-label="Search categories"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
          {filtered.map((category) => {
            const posts = categoryPostCount(state.posts, category.slug);
            return (
              <div
                key={category.id}
                className="bg-white border border-[#E5E7EB] rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.color }}>
                    <FolderOpen className="text-white" size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(category)}
                      className="p-2 hover:bg-[#F3F4F6] rounded-lg transition"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg transition"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                <p className="text-sm text-[#6B7280] mb-4">{category.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Slug:</span>
                  <code className="bg-[#F3F4F6] px-2 py-1 rounded text-xs">/{category.slug}</code>
                </div>

                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Total Posts</span>
                    <span className="text-lg font-bold" style={{ color: category.color }}>
                      {posts}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'Create category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Category Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
                placeholder="e.g., Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg font-mono text-sm"
                placeholder="auto from name if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg min-h-24"
                placeholder="Brief description..."
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && categoryPostCount(state.posts, deleteTarget.slug) > 0
                ? `This category has ${categoryPostCount(state.posts, deleteTarget.slug)} posts. Reassign them before deleting.`
                : 'This permanently removes the category from the taxonomy.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              onClick={confirmDelete}
              disabled={deleteTarget ? categoryPostCount(state.posts, deleteTarget.slug) > 0 : false}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
