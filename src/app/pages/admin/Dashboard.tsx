import { useMemo } from 'react';
import { Link } from 'react-router';
import { FileText, Eye, Edit, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCms } from '../../context/cms-context';
import { categoryPostCount, formatRelative } from '../../lib/admin/cms-state';

export default function Dashboard() {
  const { state } = useCms();

  const stats = useMemo(() => {
    const total = state.posts.length;
    const views = state.posts.reduce((a, p) => a + p.views, 0);
    const drafts = state.posts.filter((p) => p.status === 'Draft').length;
    const pubToday = state.posts.filter((p) => {
      if (p.status !== 'Published' || !p.publishedAt) return false;
      const d = new Date(p.publishedAt).toDateString();
      return d === new Date().toDateString();
    }).length;
    const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
    return [
      { label: 'Total Posts', value: String(total), change: 'Workspace', icon: FileText, color: 'bg-[#2563EB]' },
      { label: 'Total Views', value: fmt(views), change: 'Published views', icon: Eye, color: 'bg-[#194890]' },
      { label: 'Drafts', value: String(drafts), change: 'Queue', icon: Edit, color: 'bg-[#F59E0B]' },
      { label: 'Published Today', value: String(pubToday), change: 'By date', icon: TrendingUp, color: 'bg-[#DC2626]' },
    ];
  }, [state.posts]);

  const dashboardTrafficData = useMemo(() => {
    if (!state.analyticsSnapshots.length) {
      return [{ month: 'Today', views: state.posts.reduce((sum, post) => sum + post.views, 0) }];
    }

    return state.analyticsSnapshots.slice(-12).map((snapshot) => ({
      month: new Date(snapshot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      views: snapshot.views,
    }));
  }, [state.analyticsSnapshots, state.posts]);

  const categoryData = useMemo(
    () =>
      state.categories
        .map((c) => ({ category: c.name, count: categoryPostCount(state.posts, c.slug) }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [state.categories, state.posts],
  );

  const recentPosts = useMemo(
    () =>
      [...state.posts]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          title: p.title,
          author: p.author,
          status: p.status,
          date: formatRelative(p.updatedAt),
          views: p.views,
        })),
    [state.posts],
  );

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm md:text-base text-[#6B7280]">Operational snapshot of your Phulpur24 workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-right">{stat.change}</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-[#6B7280]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-2">Traffic Overview</h2>
          <p className="text-xs text-[#6B7280] mb-3">Loaded from Prisma analytics snapshots when available.</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardTrafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#194890" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Top Categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData.length ? categoryData : [{ category: '-', count: 0 }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#194890" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
            <h2 className="text-lg md:text-xl font-bold">Recent Posts</h2>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-[#F3F4F6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recentPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-6 py-4">
                      <Link to={`/admin/posts/edit/${post.id}`} className="font-semibold text-sm text-[#194890] hover:underline">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{post.author}</td>
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
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{post.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{post.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
          <h2 className="text-lg md:text-xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {state.auditLog.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No activity yet. Publishing or saving content will populate this feed.</p>
            ) : (
              state.auditLog.slice(0, 8).map((a) => (
                <div key={a.id} className="flex gap-3 pb-4 border-b border-[#E5E7EB] last:border-0">
                  <div className="w-2 h-2 bg-[#194890] rounded-full mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.action}</p>
                    <p className="text-xs text-[#6B7280] truncate">
                      {a.resource}
                      {a.detail ? ` - ${a.detail}` : ''}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {a.actor} - {formatRelative(a.at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
