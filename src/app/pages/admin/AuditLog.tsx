import { useMemo, useState } from 'react';
import { Activity, Search, ShieldCheck } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatRelative } from '../../lib/admin/cms-state';

export default function AuditLog() {
  const { state } = useCms();
  const [q, setQ] = useState('');
  const [resource, setResource] = useState('all');

  const resources = useMemo(() => ['all', ...Array.from(new Set(state.auditLog.map((entry) => entry.resource))).sort()], [state.auditLog]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.auditLog
      .filter((entry) => (resource === 'all' ? true : entry.resource === resource))
      .filter((entry) => {
        if (!words.length) return true;
        const hay = `${entry.actor} ${entry.action} ${entry.resource} ${entry.detail ?? ''}`.toLowerCase();
        return words.every((word) => hay.includes(word));
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [state.auditLog, q, resource]);

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Events</p>
          <p className="mt-2 text-3xl font-bold">{state.auditLog.length}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Resources</p>
          <p className="mt-2 text-3xl font-bold">{Math.max(resources.length - 1, 0)}</p>
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <p className="text-sm text-[#6B7280]">Latest event</p>
          <p className="mt-2 text-xl font-bold">{state.auditLog[0] ? formatRelative(state.auditLog[0].at) : 'None'}</p>
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
                placeholder="Search audit events..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <select value={resource} onChange={(event) => setResource(event.target.value)} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              {resources.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All resources' : item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6B7280]">No audit events match the current filters.</div>
          ) : (
            filtered.map((entry) => (
              <article key={entry.id} className="flex gap-4 p-4 hover:bg-[#F9FAFB] md:p-6">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#194890]/10 text-[#194890]">
                  {entry.resource === 'Auth' ? <ShieldCheck size={18} aria-hidden /> : <Activity size={18} aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{entry.action}</h2>
                    <span className="rounded bg-[#F3F4F6] px-2 py-1 text-xs font-semibold text-[#6B7280]">{entry.resource}</span>
                    <span className="text-xs text-[#9CA3AF]">{formatRelative(entry.at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#6B7280]">{entry.actor}</p>
                  {entry.detail && <p className="mt-2 text-sm text-[#374151]">{entry.detail}</p>}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
