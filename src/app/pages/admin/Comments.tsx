import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, Check, X, Trash2, Filter } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatRelative, type CommentStatus } from '../../lib/admin/cms-state';
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

const PAGE = 6;

export default function Comments() {
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | CommentStatus>('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pendingCount = state.comments.filter((c) => c.status === 'pending').length;

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.comments.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (!words.length) return true;
      const post = state.posts.find((p) => p.id === c.postId);
      const hay = `${c.author} ${c.email} ${c.content} ${post?.title ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [state.comments, state.posts, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * PAGE, pageSafe * PAGE);

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'COMMENT_DELETE', id: deleteId });
    toast.success('Comment removed.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Comments</h1>
          <p className="text-sm md:text-base text-[#6B7280]">Moderate and manage user comments</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-2 bg-[#FEF3C7] text-[#92400E] rounded-lg text-sm font-semibold">{pendingCount} Pending</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search comments..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white"
            >
              <option value="all">All Comments</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="spam">Spam</option>
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition"
                >
                  <Filter size={18} />
                  <span className="hidden sm:inline">Quick</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setStatus('pending');
                    setPage(1);
                  }}
                >
                  Pending only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatus('spam');
                    setPage(1);
                  }}
                >
                  Spam only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setQ('');
                    setStatus('all');
                    setPage(1);
                  }}
                >
                  Reset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {slice.map((comment) => {
            const post = state.posts.find((p) => p.id === comment.postId);
            return (
              <div key={comment.id} className="p-4 md:p-6 hover:bg-[#F9FAFB] transition">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-12 h-12 bg-[#E5E7EB] rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-[#6B7280]" aria-hidden>
                    {comment.author[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold">{comment.author}</h3>
                        <p className="text-sm text-[#6B7280]">{comment.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            comment.status === 'approved'
                              ? 'bg-[#E8EEF8] text-[#194890]'
                              : comment.status === 'pending'
                                ? 'bg-[#FEF3C7] text-[#92400E]'
                                : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}
                        >
                          {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
                        </span>
                        <span className="text-xs text-[#6B7280]">{formatRelative(comment.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#6B7280] mb-2">
                      On:{' '}
                      {post ? (
                        <Link to={`/admin/posts/edit/${post.id}`} className="text-[#194890] font-semibold hover:underline">
                          {post.title}
                        </Link>
                      ) : (
                        <span className="font-semibold">(deleted post)</span>
                      )}
                    </p>

                    <p className="text-sm mb-4">{comment.content}</p>

                    <div className="flex flex-wrap gap-2">
                      {comment.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'COMMENT_SET_STATUS', id: comment.id, status: 'approved' });
                              toast.success('Comment approved.');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#E8EEF8] text-[#194890] rounded-lg hover:bg-[#C7D7F0] transition text-sm font-semibold"
                          >
                            <Check size={16} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'COMMENT_SET_STATUS', id: comment.id, status: 'spam' });
                              toast.message('Marked as spam.');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#FEE2E2] text-[#DC2626] rounded-lg hover:bg-[#FECACA] transition text-sm font-semibold"
                          >
                            <X size={16} />
                            Spam
                          </button>
                        </>
                      )}
                      <a href={`mailto:${comment.email}`} className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm">
                        Reply
                      </a>
                      <button
                        type="button"
                        onClick={() => setDeleteId(comment.id)}
                        className="flex items-center gap-2 px-3 py-1.5 border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition text-sm"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 md:px-6 py-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#6B7280]">
            Page {pageSafe} of {totalPages} · {filtered.length} comment{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm disabled:opacity-40"
            >
              Previous
            </button>
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
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the comment.</AlertDialogDescription>
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
