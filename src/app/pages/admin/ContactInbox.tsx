import { useMemo, useState } from 'react';
import { CheckCircle2, Mail, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatRelative, type ContactMessage } from '../../lib/admin/cms-state';
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

const statusLabels: Record<ContactMessage['status'], string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  SPAM: 'Spam',
};

const statusClass: Record<ContactMessage['status'], string> = {
  NEW: 'bg-[#FEF3C7] text-[#92400E]',
  IN_REVIEW: 'bg-[#DBEAFE] text-[#1E40AF]',
  RESOLVED: 'bg-[#E8EEF8] text-[#194890]',
  SPAM: 'bg-[#FEE2E2] text-[#B91C1C]',
};

export default function ContactInbox() {
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | ContactMessage['status']>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.contactMessages
      .filter((message) => (status === 'all' ? true : message.status === status))
      .filter((message) => {
        if (!words.length) return true;
        const hay = `${message.firstName} ${message.lastName} ${message.email} ${message.subject} ${message.message}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.contactMessages, q, status]);

  const counts = useMemo(
    () => ({
      new: state.contactMessages.filter((message) => message.status === 'NEW').length,
      review: state.contactMessages.filter((message) => message.status === 'IN_REVIEW').length,
      resolved: state.contactMessages.filter((message) => message.status === 'RESOLVED').length,
      spam: state.contactMessages.filter((message) => message.status === 'SPAM').length,
    }),
    [state.contactMessages],
  );

  const setMessageStatus = (id: string, nextStatus: ContactMessage['status']) => {
    dispatch({ type: 'CONTACT_MESSAGE_SET_STATUS', id, status: nextStatus });
    toast.success(`Message marked ${statusLabels[nextStatus].toLowerCase()}.`);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'CONTACT_MESSAGE_DELETE', id: deleteId });
    toast.success('Contact message deleted.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2 text-2xl font-bold md:text-3xl">Contact Inbox</h1>
        <p className="text-sm text-[#6B7280] md:text-base">Review visitor messages, support requests, advertising inquiries, and newsroom tips.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          ['New', counts.new],
          ['In review', counts.review],
          ['Resolved', counts.resolved],
          ['Spam', counts.spam],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white p-5">
            <p className="text-sm text-[#6B7280]">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
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
                placeholder="Search messages..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              <option value="all">All statuses</option>
              <option value="NEW">New</option>
              <option value="IN_REVIEW">In review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="SPAM">Spam</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6B7280]">No contact messages match the current filters.</div>
          ) : (
            filtered.map((message) => (
              <article key={message.id} className="p-4 hover:bg-[#F9FAFB] md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[message.status]}`}>{statusLabels[message.status]}</span>
                      <span className="text-xs text-[#6B7280]">{formatRelative(message.createdAt)}</span>
                    </div>
                    <h2 className="text-lg font-bold">{message.subject}</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {message.firstName} {message.lastName} ·{' '}
                      <a href={`mailto:${message.email}`} className="font-semibold text-[#194890] hover:underline">
                        {message.email}
                      </a>
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{message.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:w-56 lg:justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => setMessageStatus(message.id, 'IN_REVIEW')}>
                      <Mail size={16} className="mr-2" />
                      Review
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMessageStatus(message.id, 'RESOLVED')}>
                      <CheckCircle2 size={16} className="mr-2" />
                      Resolve
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMessageStatus(message.id, 'SPAM')}>
                      <ShieldAlert size={16} className="mr-2" />
                      Spam
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]" onClick={() => setDeleteId(message.id)}>
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact message?</AlertDialogTitle>
            <AlertDialogDescription>This removes the message permanently from the workspace inbox.</AlertDialogDescription>
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
