import { useMemo, useState } from 'react';
import { Download, Mail, MailCheck, Search, Send, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { useAuth } from '../../context/auth-context';
import { formatShortDate, type NewsletterSubscriber } from '../../lib/admin/cms-state';
import { hasMinimumRole } from '../../lib/admin/role-access';
import { toast } from '../../lib/notify';
import { apiRequest } from '../../lib/api-client';
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
  const { user, accessToken } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | NewsletterSubscriber['status']>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignPreview, setCampaignPreview] = useState('');
  const [sending, setSending] = useState(false);
  const canSendCampaign = hasMinimumRole(user?.role, 'EDITOR');

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

  const sendCampaign = async () => {
    if (!campaignSubject.trim()) {
      toast.error('Subject line is required.');
      return;
    }
    if (!campaignBody.trim()) {
      toast.error('Campaign body is required.');
      return;
    }
    setSending(true);
    try {
      await apiRequest('/admin/newsletter/broadcast', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          subject: campaignSubject.trim(),
          body: campaignBody.trim(),
          previewEmail: campaignPreview.trim() || undefined,
        }),
      });
      toast.success('Campaign sent successfully!');
      setComposeOpen(false);
      setCampaignSubject('');
      setCampaignBody('');
      setCampaignPreview('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign.');
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'NEWSLETTER_SUBSCRIBER_DELETE', id: deleteId });
    toast.success('Subscriber deleted.');
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-end gap-2">
          <span className="inline-flex rounded-lg bg-[#F3F4F6] px-3 py-2 text-xs font-semibold text-[#374151]">{state.newsletterSubscribers.length} subscribers</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {canSendCampaign && (
          <Button type="button" onClick={() => setComposeOpen(true)}>
            <Mail size={18} className="mr-2" />
            Compose Campaign
          </Button>
        )}
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

      {/* Campaign compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Newsletter Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">Subject line</label>
              <input
                type="text"
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="e.g., Weekly digest — top stories this week"
                className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Campaign body
              </label>
              <textarea
                value={campaignBody}
                onChange={(e) => setCampaignBody(e.target.value)}
                placeholder="Write your newsletter content here. Markdown is rendered in the email."
                rows={10}
                className="w-full resize-y rounded-lg border border-[#E5E7EB] px-4 py-3 font-mono text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Preview email <span className="font-normal text-[#6B7280]">(optional — send a test copy first)</span>
              </label>
              <input
                type="email"
                value={campaignPreview}
                onChange={(e) => setCampaignPreview(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
              />
            </div>
            <div className="rounded-lg bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
              This will send to <strong>{active}</strong> active subscriber{active !== 1 ? 's' : ''}. This action cannot be undone.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={sendCampaign} disabled={sending || !campaignSubject.trim() || !campaignBody.trim()}>
              <Send size={16} className="mr-2" />
              {sending ? 'Sending…' : 'Send to all active subscribers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
