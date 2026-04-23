import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Edit, Eye, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { useAuth } from '../../context/auth-context';
import { makeId, slugify, type StaticPage } from '../../lib/admin/cms-state';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { toast } from '../../lib/notify';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

type PageForm = Pick<StaticPage, 'slug' | 'title' | 'excerpt' | 'content' | 'status' | 'seoTitle' | 'metaDescription'>;

const emptyForm: PageForm = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  status: 'PUBLISHED',
  seoTitle: '',
  metaDescription: '',
};

function pageHref(slug: string): string {
  return ['about', 'privacy', 'terms'].includes(slug) ? `/${slug}` : `/page/${slug}`;
}

function seoScore(page: PageForm): number {
  let score = 35;
  const title = page.seoTitle || page.title;
  if (title.length >= 30 && title.length <= 65) score += 25;
  else if (title.length >= 12) score += 12;
  if (page.metaDescription.length >= 100 && page.metaDescription.length <= 170) score += 25;
  else if (page.metaDescription.length >= 50) score += 12;
  if (page.excerpt.length >= 40) score += 10;
  if (page.content.length >= 300) score += 5;
  return Math.min(100, score);
}

export default function PagesManager() {
  const { state, dispatch } = useCms();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | StaticPage['status']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaticPage | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canManagePages = hasMinimumRole(user?.role, 'EDITOR');

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.pages
      .filter((page) => (status === 'all' ? true : page.status === status))
      .filter((page) => {
        if (!words.length) return true;
        const hay = `${page.title} ${page.slug} ${page.excerpt} ${page.content}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [state.pages, q, status]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (page: StaticPage) => {
    setEditing(page);
    setForm({
      slug: page.slug,
      title: page.title,
      excerpt: page.excerpt,
      content: page.content,
      status: page.status,
      seoTitle: page.seoTitle,
      metaDescription: page.metaDescription,
    });
    setModalOpen(true);
  };

  const submit = () => {
    if (!canManagePages) {
      toast.error('Editor access is required to modify pages.');
      return;
    }
    const title = form.title.trim();
    if (!title || !form.content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    const slug = slugify(form.slug || title);
    const duplicate = state.pages.some((page) => page.slug === slug && page.id !== editing?.id);
    if (duplicate) {
      toast.error('This page slug is already in use.');
      return;
    }
    const now = new Date().toISOString();
    dispatch({
      type: 'PAGE_UPSERT',
      page: {
        id: editing?.id ?? makeId(),
        slug,
        title,
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        status: form.status,
        seoTitle: form.seoTitle.trim(),
        metaDescription: form.metaDescription.trim(),
        createdAt: editing?.createdAt ?? now,
        updatedAt: now,
      },
    });
    toast.success(editing ? 'Page updated.' : 'Page created.');
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!canManagePages) {
      toast.error('Editor access is required to delete pages.');
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    dispatch({ type: 'PAGE_DELETE', id: deleteId });
    toast.success('Page deleted.');
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!canManagePages ? <span className="inline-flex rounded-full border border-[#FEF3C7] bg-[#FEF9C3] px-3 py-1.5 text-xs font-semibold text-[#92400E]">Read-only mode</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={openCreate} disabled={!canManagePages} className="bg-[#194890] font-semibold hover:bg-[#2656A8] disabled:opacity-50 ml-auto">
          <Plus size={20} className="mr-2" />
          New Page
        </Button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="border-b border-[#E5E7EB] p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search pages..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2"
            >
              <option value="all">All statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
          {filtered.map((page) => (
            <article key={page.id} className="rounded-lg border border-[#E5E7EB] p-5 transition hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
                  <FileText size={20} aria-hidden />
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${page.status === 'PUBLISHED' ? 'bg-[#E8EEF8] text-[#194890]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                  {page.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
              </div>
              <h2 className="line-clamp-2 text-lg font-bold">{page.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-[#6B7280]">{page.excerpt || page.content}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B7280]">Slug</span>
                  <code className="truncate rounded bg-[#F3F4F6] px-2 py-0.5 text-xs">/{page.slug}</code>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#6B7280]">SEO</span>
                  <span className="font-semibold">{seoScore(page)}/100</span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {canManagePages ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(page)}>
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                ) : null}
                <Link
                  to={pageHref(page.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-md border border-[#E5E7EB] px-3 text-sm font-medium hover:bg-[#F3F4F6]"
                >
                  <Eye size={16} className="mr-2" />
                  View
                </Link>
                {canManagePages ? (
                  <Button type="button" variant="outline" size="sm" className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]" onClick={() => setDeleteId(page.id)}>
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit page' : 'Create page'}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">Title</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Slug</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 font-mono text-sm" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Status</label>
              <select className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as StaticPage['status'] }))}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">SEO Title</label>
              <input className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.seoTitle} onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Excerpt</label>
              <textarea className="min-h-20 w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Meta Description</label>
              <textarea className="min-h-20 w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.metaDescription} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Content</label>
              <textarea className="min-h-64 w-full rounded-lg border border-[#E5E7EB] px-4 py-2 font-mono text-sm" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit} disabled={!canManagePages}>
              Save Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page?</AlertDialogTitle>
            <AlertDialogDescription>This removes the page from Prisma and any navigation links to it should be reviewed.</AlertDialogDescription>
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
