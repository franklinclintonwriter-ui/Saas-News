import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp, Users, Eye, Clock, ArrowUp, ArrowDown, Edit, Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCms } from '../../context/cms-context';
import { makeId, type AnalyticsSnapshot } from '../../lib/admin/cms-state';
import { toast } from '../../lib/notify';
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

const trafficData = [
  { date: 'Jan 1', views: 45000, visitors: 32000, sessions: 28000 },
  { date: 'Jan 8', views: 52000, visitors: 38000, sessions: 33000 },
  { date: 'Jan 15', views: 61000, visitors: 45000, sessions: 39000 },
  { date: 'Jan 22', views: 58000, visitors: 42000, sessions: 37000 },
  { date: 'Jan 29', views: 70000, visitors: 51000, sessions: 44000 },
  { date: 'Feb 5', views: 82000, visitors: 59000, sessions: 51000 },
  { date: 'Feb 12', views: 78000, visitors: 56000, sessions: 48000 },
];

const trafficSources = [
  { name: 'Direct', value: 35, color: '#194890' },
  { name: 'Search', value: 28, color: '#2563EB' },
  { name: 'Social', value: 22, color: '#EC4899' },
  { name: 'Referral', value: 15, color: '#F59E0B' },
];

const deviceData = [
  { device: 'Desktop', users: 52000 },
  { device: 'Mobile', users: 38000 },
  { device: 'Tablet', users: 12000 },
];

type SnapshotForm = Omit<AnalyticsSnapshot, 'id' | 'date'> & { date: string };

function blankSnapshotForm(): SnapshotForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    views: 0,
    visitors: 0,
    sessions: 0,
    activeUsers: 0,
    avgLoadMs: 1200,
    direct: 35,
    search: 30,
    social: 20,
    referral: 15,
    desktopUsers: 0,
    mobileUsers: 0,
    tabletUsers: 0,
  };
}

function snapshotToForm(snapshot: AnalyticsSnapshot): SnapshotForm {
  return {
    ...snapshot,
    date: new Date(snapshot.date).toISOString().slice(0, 10),
  };
}

export default function Analytics() {
  const { state, dispatch } = useCms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnalyticsSnapshot | null>(null);
  const [form, setForm] = useState<SnapshotForm>(blankSnapshotForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const topArticles = useMemo(
    () =>
      [...state.posts]
        .filter((p) => p.status === 'Published')
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map((p, i) => ({
          id: p.id,
          title: p.title,
          views: p.views,
          growth: 15 - i * 3.2,
        })),
    [state.posts],
  );

  const totals = useMemo(() => {
    const views = state.posts.reduce((a, p) => a + p.views, 0);
    const published = state.posts.filter((p) => p.status === 'Published').length;
    const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
    return { views, published, fmt };
  }, [state.posts]);

  const liveTrafficData = useMemo(() => {
    if (!state.analyticsSnapshots.length) return trafficData;
    return state.analyticsSnapshots.map((row) => ({
      date: new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      views: row.views,
      visitors: row.visitors,
      sessions: row.sessions,
    }));
  }, [state.analyticsSnapshots]);

  const liveTrafficSources = useMemo(() => {
    const latest = state.analyticsSnapshots.at(-1);
    if (!latest) return trafficSources;
    return [
      { name: 'Direct', value: latest.direct, color: '#194890' },
      { name: 'Search', value: latest.search, color: '#2563EB' },
      { name: 'Social', value: latest.social, color: '#EC4899' },
      { name: 'Referral', value: latest.referral, color: '#F59E0B' },
    ];
  }, [state.analyticsSnapshots]);

  const liveDeviceData = useMemo(() => {
    const latest = state.analyticsSnapshots.at(-1);
    if (!latest) return deviceData;
    return [
      { device: 'Desktop', users: latest.desktopUsers },
      { device: 'Mobile', users: latest.mobileUsers },
      { device: 'Tablet', users: latest.tabletUsers },
    ];
  }, [state.analyticsSnapshots]);

  const latestSnapshot = state.analyticsSnapshots.at(-1);
  const previousSnapshot = state.analyticsSnapshots.at(-2);
  const avgLoadLabel = latestSnapshot ? `${(latestSnapshot.avgLoadMs / 1000).toFixed(2)}s` : 'No data';
  const growthRate =
    latestSnapshot && previousSnapshot && previousSnapshot.views > 0
      ? ((latestSnapshot.views - previousSnapshot.views) / previousSnapshot.views) * 100
      : null;
  const growthLabel = growthRate === null ? 'No baseline' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`;

  const openCreate = () => {
    const latest = state.analyticsSnapshots.at(-1);
    setEditing(null);
    setForm(latest ? { ...snapshotToForm(latest), date: new Date().toISOString().slice(0, 10) } : blankSnapshotForm());
    setModalOpen(true);
  };

  const openEdit = (snapshot: AnalyticsSnapshot) => {
    setEditing(snapshot);
    setForm(snapshotToForm(snapshot));
    setModalOpen(true);
  };

  const updateNumber = (key: keyof Omit<SnapshotForm, 'date'>, value: string) => {
    setForm((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  };

  const submitSnapshot = () => {
    const date = new Date(`${form.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      toast.error('Choose a valid snapshot date.');
      return;
    }
    dispatch({
      type: 'ANALYTICS_SNAPSHOT_UPSERT',
      snapshot: {
        ...form,
        id: editing?.id ?? makeId(),
        date: date.toISOString(),
      },
    });
    toast.success(editing ? 'Analytics snapshot updated.' : 'Analytics snapshot created.');
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'ANALYTICS_SNAPSHOT_DELETE', id: deleteId });
    toast.success('Analytics snapshot deleted.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-sm md:text-base text-[#6B7280]">Track your site performance and audience insights</p>
        <p className="mt-2 text-xs text-[#6B7280] max-w-3xl rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
          Live workspace totals: <strong>{totals.fmt(totals.views)}</strong> views across <strong>{totals.published}</strong> published posts. Charts below are loaded from Prisma analytics snapshots when available.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {[
          { label: 'Total Views (workspace)', value: totals.fmt(totals.views), change: 'Σ posts', icon: Eye, positive: true },
          { label: 'Published posts', value: String(totals.published), change: 'catalog', icon: Users, positive: true },
          { label: 'Avg. Load', value: avgLoadLabel, change: latestSnapshot ? 'latest snapshot' : 'no snapshot', icon: Clock, positive: Boolean(latestSnapshot && latestSnapshot.avgLoadMs <= 1600) },
          { label: 'Growth Rate', value: growthLabel, change: previousSnapshot ? 'vs previous' : 'needs 2 snapshots', icon: TrendingUp, positive: growthRate === null || growthRate >= 0 },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#194890] rounded-lg flex items-center justify-center">
                  <Icon className="text-white" size={24} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-semibold ${stat.positive ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                  {stat.positive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-[#6B7280]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Traffic Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={liveTrafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#194890" strokeWidth={2} name="Page Views" />
              <Line type="monotone" dataKey="visitors" stroke="#2563EB" strokeWidth={2} name="Visitors" />
              <Line type="monotone" dataKey="sessions" stroke="#F59E0B" strokeWidth={2} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Traffic Sources</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={liveTrafficSources}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {liveTrafficSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Device Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={liveDeviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="device" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#194890" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Top Performing Articles</h2>
          <div className="space-y-4">
            {topArticles.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Publish posts to populate this list.</p>
            ) : (
              topArticles.map((article) => (
                <div key={article.id} className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] last:border-0">
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/posts/edit/${article.id}`} className="font-semibold text-sm truncate text-[#194890] hover:underline block">
                      {article.title}
                    </Link>
                    <p className="text-xs text-[#6B7280] mt-1">{article.views.toLocaleString()} views</p>
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-semibold ml-3 ${article.growth > 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                    {article.growth > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(article.growth).toFixed(1)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
        <h2 className="text-lg md:text-xl font-bold mb-4">Real-Time Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-[#F3F4F6] rounded-lg">
            <p className="text-sm text-[#6B7280] mb-2">Active Users Now</p>
            <p className="text-4xl font-bold text-[#194890]">{latestSnapshot?.activeUsers.toLocaleString() ?? '0'}</p>
          </div>
          <div className="text-center p-6 bg-[#F3F4F6] rounded-lg">
            <p className="text-sm text-[#6B7280] mb-2">Page Views (Last Hour)</p>
            <p className="text-4xl font-bold text-[#2563EB]">{latestSnapshot ? Math.round(latestSnapshot.views / 24).toLocaleString() : '0'}</p>
          </div>
          <div className="text-center p-6 bg-[#F3F4F6] rounded-lg">
            <p className="text-sm text-[#6B7280] mb-2">Avg. Load Time</p>
            <p className="text-4xl font-bold text-[#10B981]">
              {latestSnapshot ? `${(latestSnapshot.avgLoadMs / 1000).toFixed(1)}s` : '0.0s'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white p-4 md:p-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold md:text-xl">Analytics Snapshots</h2>
            <p className="text-sm text-[#6B7280]">Maintain the Prisma data series used by dashboard and analytics charts.</p>
          </div>
          <Button type="button" onClick={openCreate} className="bg-[#194890] hover:bg-[#2656A8]">
            <Plus size={18} className="mr-2" />
            Add Snapshot
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Views</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Visitors</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Sessions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {state.analyticsSnapshots.map((snapshot) => (
                <tr key={snapshot.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3 text-sm font-semibold">{new Date(snapshot.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{snapshot.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{snapshot.visitors.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{snapshot.sessions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{snapshot.activeUsers.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(snapshot)} className="rounded p-2 hover:bg-[#F3F4F6]" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button type="button" onClick={() => setDeleteId(snapshot.id)} className="rounded p-2 text-[#DC2626] hover:bg-[#FEE2E2]" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {state.analyticsSnapshots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                    No snapshots yet. Add one to populate analytics charts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit analytics snapshot' : 'Add analytics snapshot'}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">Date</label>
              <input type="date" className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            {([
              ['views', 'Views'],
              ['visitors', 'Visitors'],
              ['sessions', 'Sessions'],
              ['activeUsers', 'Active users'],
              ['avgLoadMs', 'Avg load ms'],
              ['direct', 'Direct %'],
              ['search', 'Search %'],
              ['social', 'Social %'],
              ['referral', 'Referral %'],
              ['desktopUsers', 'Desktop users'],
              ['mobileUsers', 'Mobile users'],
              ['tabletUsers', 'Tablet users'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold">{label}</label>
                <input type="number" min={0} className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2" value={form[key]} onChange={(event) => updateNumber(key, event.target.value)} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={submitSnapshot}>
              Save Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete analytics snapshot?</AlertDialogTitle>
            <AlertDialogDescription>This removes the data point from analytics charts and cannot be undone.</AlertDialogDescription>
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
