import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { computeSeoScore, formatShortDate, type PostStatus } from '../../lib/admin/cms-state';
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
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const bulkDelete = () => {
    const ids = [...selected];
    if (!ids.length) return;
    dispatch({ type: 'POSTS_BULK_DELETE', ids });
    setSelected(new Set());
    toast.success(`${ids.length} post(s) removed.`);
  };

  const bulkStatus = (s: PostStatus) => {
    const ids = [...selected];
    if (!ids.length) return;
    dispatch({ type: 'POSTS_BULK_SET_STATUS', ids, status: s });
    setSelected(new Set());
    toast.success(`Updated ${ids.length} post(s) to ${s}.`);
  };

  const confirmDelete = () => {
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
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Posts</h1>
          <p className="text-sm md:text-base text-[#6B7280]">Manage all your articles and content</p>
        </div>
        <Link
          to="/admin/posts/new"
          className="flex items-center gap-2 px-6 py-3 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition font-semibold whitespace-nowrap"
        >
          <Plus size={20} />
          New Post
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm">
          <span className="font-semibold text-[#111827]">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => bulkStatus('Published')}
              className="rounded-md border border-[#E5E7EB] px-3 py-1.5 hover:bg-[#F3F4F6]"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => bulkStatus('Draft')}
              className="rounded-md border border-[#E5E7EB] px-3 py-1.5 hover:bg-[#F3F4F6]"
            >
              Mark draft
            </button>
            <button
              type="button"
              onClick={() => bulkStatus('Scheduled')}
              className="rounded-md border border-[#E5E7EB] px-3 py-1.5 hover:bg-[#F3F4F6]"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[#B91C1C] hover:bg-[#FEE2E2]"
            >
              Delete
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[#6B7280] hover:text-[#111827]">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
                aria-label="Search posts"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="flex-1 md:flex-initial px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm min-w-[140px]"
                aria-label="Filter by category"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : state.categories.find((x) => x.slug === c)?.name ?? c}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="flex-1 md:flex-initial px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm min-w-[120px]"
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
                    className="hidden md:flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition"
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
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="px-6 py-3 text-left w-10">
                  <Checkbox
                    checked={slice.length > 0 && slice.every((p) => selected.has(p.id))}
                    onCheckedChange={(checked) => {
                      const ids = slice.map((p) => p.id);
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">SEO</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {slice.map((post) => {
                const catLabel = state.categories.find((c) => c.slug === post.categorySlug)?.name ?? post.categorySlug;
                const seo = computeSeoScore(post);
                return (
                  <tr key={post.id} className="hover:bg-[#F9FAFB]">
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
                    <td className="px-6 py-4">
                      <Link to={`/admin/posts/edit/${post.id}`} className="font-semibold text-sm max-w-md text-[#111827] hover:text-[#194890]">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{post.author}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-[#F3F4F6] text-xs rounded">{catLabel}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
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
                        <div className="w-12 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
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
                        <Link
                          to={`/admin/posts/edit/${post.id}`}
                          className="p-2 hover:bg-[#F3F4F6] rounded transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <Link
                          to={`/admin/preview/post/${post.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 hover:bg-[#F3F4F6] rounded transition"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(post.id)}
                          className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[#6B7280]">
            Showing {filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length} posts
            {filtered.length !== state.posts.length ? ` (filtered from ${state.posts.length})` : ''}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - pageSafe) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-[#9CA3AF]">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    className={`px-4 py-2 rounded-lg text-sm ${n === pageSafe ? 'bg-[#194890] text-white' : 'border border-[#E5E7EB] hover:bg-[#F3F4F6]'}`}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post and its linked comments from the workspace dataset. You can reset the demo from Settings.
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
