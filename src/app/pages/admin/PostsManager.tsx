import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { computeSeoScore, formatShortDate, type AdminPost, type PostStatus } from '../../lib/admin/cms-state';
import { toast } from '../../lib/notify';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Checkbox } from '../../components/ui/checkbox';

const PAGE_SIZE = 8;

export default function PostsManager() {
  const { user } = useAuth();
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canCreatePosts = hasMinimumRole(user?.role, 'AUTHOR');
  const canBulkManagePosts = hasMinimumRole(user?.role, 'EDITOR');

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(state.categories.map((c) => c.slug)))],
    [state.categories],
  );

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.posts.filter((p) => {
      if (category !== 'all' && p.categorySlug !== category) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (!words.length) return true;
      const hay = `${p.title} ${p.author} ${p.slug} ${p.excerpt}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [state.posts, q, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const canEditPost = (post: AdminPost) => {
    if (canBulkManagePosts) return true;
    if (post.authorProfile?.id && user?.id && post.authorProfile.id === user.id) return true;
    if (post.authorProfile?.email && user?.email && post.authorProfile.email.toLowerCase() === user.email.toLowerCase()) return true;
    if (post.author && user?.name && post.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    return false;
  };

  const bulkDelete = () => {
    if (!canBulkManagePosts) {
      toast.error('Editor access is required to delete posts.');
      return;
    }
    const ids = [...selected];
    if (!ids.length) return;
    dispatch({ type: 'POSTS_BULK_DELETE', ids });
    setSelected(new Set());
    toast.success(`${ids.length} post(s) removed.`);
  };

  const bulkStatus = (nextStatus: PostStatus) => {
    if (!canBulkManagePosts) {
      toast.error('Editor access is required to update post status in bulk.');
      return;
    }
    const ids = [...selected];
    if (!ids.length) return;
    dispatch({ type: 'POSTS_BULK_SET_STATUS', ids, status: nextStatus });
    setSelected(new Set());
    toast.success(`Updated ${ids.length} post(s) to ${nextStatus}.`);
  };

  const confirmDelete = () => {
    if (!canBulkManagePosts) {
      toast.error('Editor access is required to delete posts.');
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    dispatch({ type: 'POST_DELETE', id: deleteId });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(deleteId);
      return next;
    });
    toast.success('Post deleted.');
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {canCreatePosts ? (
            <Link
              to="/admin/posts/new"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#194890] px-6 py-3 font-semibold text-white transition hover:bg-[#2656A8]"
            >
              <Plus size={20} />
              New Post
            </Link>
          ) : null}
          {!canBulkManagePosts ? <span className="inline-flex rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">Read-only actions</span> : null}
        </div>
      </div>

      {canBulkManagePosts && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm dark:border-border dark:bg-card">
          <span className="font-semibold text-[#111827]">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => bulkStatus('Published')}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 hover:bg-[#F3F4F6] dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => bulkStatus('Draft')}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 hover:bg-[#F3F4F6] dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
            >
              Mark draft
            </button>
            <button
              type="button"
              onClick={() => bulkStatus('Scheduled')}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 hover:bg-[#F3F4F6] dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[#B91C1C] hover:bg-[#FEE2E2] dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[#6B7280] hover:text-[#111827] dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="border-b border-[#E5E7EB] p-4 md:p-6 dark:border-border">
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Search posts..."
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 dark:border-border dark:bg-[#0b1220]"
                aria-label="Search posts"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="min-w-[140px] flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm md:flex-initial dark:border-border dark:bg-[#0b1220]"
                aria-label="Filter by category"
              >
                {categories.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug === 'all' ? 'All Categories' : state.categories.find((item) => item.slug === slug)?.name ?? slug}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="min-w-[120px] flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm md:flex-initial dark:border-border dark:bg-[#0b1220]"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 transition hover:bg-[#F3F4F6] md:flex dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
                  >
                    <Filter size={18} />
                    Filters
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      setStatus('Draft');
                      setPage(1);
                    }}
                  >
                    Drafts only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setStatus('Published');
                      setPage(1);
                    }}
                  >
                    Published only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setQ('');
                      setCategory('all');
                      setStatus('all');
                      setPage(1);
                    }}
                  >
                    Reset filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F3F4F6] dark:bg-[#0f172a]">
              <tr>
                {canBulkManagePosts ? (
                  <th className="w-10 px-6 py-3 text-left">
                    <Checkbox
                      checked={slice.length > 0 && slice.every((post) => selected.has(post.id))}
                      onCheckedChange={(checked) => {
                        const ids = slice.map((post) => post.id);
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked === true) ids.forEach((id) => next.add(id));
                          else ids.forEach((id) => next.delete(id));
                          return next;
                        });
                      }}
                      aria-label="Select all on page"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Author</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">SEO</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Views</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-border">
              {slice.map((post) => {
                const catLabel = state.categories.find((c) => c.slug === post.categorySlug)?.name ?? post.categorySlug;
                const seo = computeSeoScore(post);
                const canEdit = canEditPost(post);
                return (
                  <tr key={post.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#0f172a]">
                    {canBulkManagePosts ? (
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selected.has(post.id)}
                          onCheckedChange={(checked) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked === true) next.add(post.id);
                              else next.delete(post.id);
                              return next;
                            });
                          }}
                          aria-label={`Select ${post.title}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-6 py-4">
                      {canEdit ? (
                        <Link to={`/admin/posts/edit/${post.id}`} className="max-w-md text-sm font-semibold text-[#111827] hover:text-[#194890]">
                          {post.title}
                        </Link>
                      ) : (
                        <span className="max-w-md text-sm font-semibold text-[#111827]">{post.title}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{post.author}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-[#F3F4F6] px-2 py-1 text-xs">{catLabel}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          post.status === 'Published'
                            ? 'bg-[#E8EEF8] text-[#194890]'
                            : post.status === 'Draft'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#DBEAFE] text-[#1E40AF]'
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{formatShortDate(post.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-[#E5E7EB]">
                          <div
                            className={`h-full ${seo >= 90 ? 'bg-[#194890]' : seo >= 70 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                            style={{ width: `${seo}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{seo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">{post.views.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <Link
                            to={`/admin/posts/edit/${post.id}`}
                            className="rounded p-2 text-[#64748B] transition hover:bg-[#F3F4F6] hover:text-[#194890] dark:text-slate-400 dark:hover:bg-[#1e293b] dark:hover:text-[#93c5fd]"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                        ) : null}
                        <Link
                          to={`/admin/preview/post/${post.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-2 text-[#64748B] transition hover:bg-[#F3F4F6] hover:text-[#194890] dark:text-slate-400 dark:hover:bg-[#1e293b] dark:hover:text-[#93c5fd]"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </Link>
                        {canBulkManagePosts ? (
                          <button
                            type="button"
                            onClick={() => setDeleteId(post.id)}
                            className="rounded p-2 text-[#DC2626] transition hover:bg-[#FEE2E2] dark:hover:bg-[#450a0a]/40"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E7EB] bg-[#fafbfc] px-6 py-4 sm:flex-row dark:border-border dark:bg-[#0b1220]/60">
          <p className="text-sm text-[#6B7280] dark:text-slate-400">
            Showing {filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length} posts
            {filtered.length !== state.posts.length ? ` (filtered from ${state.posts.length})` : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm transition hover:bg-[#F3F4F6] disabled:opacity-40 dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - pageSafe) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-[#9CA3AF]">...</span>}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    className={`rounded-lg px-4 py-2 text-sm ${n === pageSafe ? 'bg-[#194890] text-white' : 'border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]'}`}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm transition hover:bg-[#F3F4F6] disabled:opacity-40 dark:border-border dark:bg-[#0b1220] dark:hover:bg-[#1e293b]"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post and its linked comments from the workspace dataset.
            </AlertDialogDescription>
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
