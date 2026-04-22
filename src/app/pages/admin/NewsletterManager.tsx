import { useMemo, useState } from 'react';
import { Download, MailCheck, Search, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatShortDate, type NewsletterSubscriber } from '../../lib/admin/cms-state';
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

function downloadCsv(rows: NewsletterSubscriber[]) {
  const header = ['email', 'source', 'status', 'createdAt', 'updatedAt'];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [header.join(','), ...rows.map((row) => header.map((key) => escape(String(row[key as keyof NewsletterSubscriber] ?? ''))).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function NewsletterManager() {
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | NewsletterSubscriber['status']>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.newsletterSubscribers
      .filter((subscriber) => (status === 'all' ? true : subscriber.status === status))
      .filter((subscriber) => {
        if (!words.length) return true;
        const hay = `${subscriber.email} ${subscriber.source} ${subscriber.status}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.newsletterSubscribers, q, status]);

  const active = state.newsletterSubscribers.filter((subscriber) => subscriber.status === 'ACTIVE').length;
  const unsubscribed = state.newsletterSubscribers.filter((subscriber) => subscriber.status === 'UNSUBSCRIBED').length;

  const setSubscriberStatus = (id: string, nextStatus: NewsletterSubscriber['status']) => {
    dispatch({ type: 'NEWSLETTER_SUBSCRIBER_SET_STATUS', id, status: nextStatus });
    toast.success(nextStatus === 'ACTIVE' ? 'Subscriber reactivated.' : 'Subscriber unsubscribed.');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'NEWSLETTER_SUBSCRIBER_DELETE', id: deleteId });
    toast.success('Subscriber deleted.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center md:mb-8">
        <div>
          <h1 className="mb-2 text-2xl font-bold md:text-3xl">Newsletter</h1>
          <p className="text-sm text-[#6B7280] md:text-base">Manage subscribers collected from header, homepage, and sidebar signups.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => downloadCsv(filtered)}>
          <Download size={18} className="mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Total subscribers</p>
          <p className="mt-2 text-3xl font-bold">{state.newsletterSubscribers.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Active</p>
          <p className="mt-2 text-3xl font-bold">{active}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Unsubscribed</p>
          <p className="mt-2 text-3xl font-bold">{unsubscribed}</p>
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
                placeholder="Search subscribers..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNSUBSCRIBED">Unsubscribed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8EEF8] text-[#194890]">
                        <MailCheck size={18} aria-hidden />
                      </div>
                      <a href={`mailto:${subscriber.email}`} className="font-semibold text-[#194890] hover:underline">
                        {subscriber.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6B7280]">{subscriber.source}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${subscriber.status === 'ACTIVE' ? 'bg-[#E8EEF8] text-[#194890]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                      {subscriber.status === 'ACTIVE' ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6B7280]">{formatShortDate(subscriber.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {subscriber.status === 'ACTIVE' ? (
                        <button type="button" onClick={() => setSubscriberStatus(subscriber.id, 'UNSUBSCRIBED')} className="rounded p-2 hover:bg-[#F3F4F6]" title="Unsubscribe">
                          <UserMinus size={16} />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setSubscriberStatus(subscriber.id, 'ACTIVE')} className="rounded p-2 hover:bg-[#F3F4F6]" title="Reactivate">
                          <UserPlus size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => setDeleteId(subscriber.id)} className="rounded p-2 text-[#DC2626] hover:bg-[#FEE2E2]" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#6B7280]">
                    No subscribers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscriber?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the subscriber from the newsletter list.</AlertDialogDescription>
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
