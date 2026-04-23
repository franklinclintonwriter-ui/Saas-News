import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tags,
  Image,
  MessageSquare,
  Inbox,
  MailCheck,
  Megaphone,
  Navigation,
  ClipboardList,
  KeyRound,
  Settings,
  Users,
  BarChart,
  X,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import { hasMinimumRole, type AdminRole } from '../../lib/admin/role-access';

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  minRole?: AdminRole;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Command Center',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BarChart, label: 'Analytics', path: '/admin/analytics' },
    ],
  },
  {
    title: 'Publishing',
    items: [
      { icon: FileText, label: 'Posts', path: '/admin/posts' },
      { icon: FileText, label: 'Pages', path: '/admin/pages' },
      { icon: Image, label: 'Media', path: '/admin/media' },
      { icon: FolderOpen, label: 'Categories', path: '/admin/categories' },
      { icon: Tags, label: 'Tags', path: '/admin/tags' },
    ],
  },
  {
    title: 'Audience',
    items: [
      { icon: MessageSquare, label: 'Comments', path: '/admin/comments' },
      { icon: Inbox, label: 'Contact Inbox', path: '/admin/contact' },
      { icon: MailCheck, label: 'Newsletter', path: '/admin/newsletter', minRole: 'EDITOR' },
      { icon: Megaphone, label: 'Ads', path: '/admin/ads' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { icon: Navigation, label: 'Navigation', path: '/admin/navigation' },
      { icon: Users, label: 'Users', path: '/admin/users', minRole: 'ADMIN' },
      { icon: Settings, label: 'Settings', path: '/admin/settings', minRole: 'ADMIN' },
      { icon: KeyRound, label: 'API Config', path: '/admin/api-config', minRole: 'ADMIN' },
      { icon: ClipboardList, label: 'Audit Log', path: '/admin/audit-log', minRole: 'ADMIN' },
    ],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state } = useCms();
  const title = state.settings.siteTitle || state.settings.organizationName || 'Publication';
  const initials = (user?.email?.[0] || title[0] || 'P').toUpperCase();
  const canUseApiConfig = hasMinimumRole(user?.role, 'ADMIN');

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-white/10 bg-[#0B1220] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-5">
          <Link to="/admin/dashboard" onClick={onClose} className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#194890] shadow-lg shadow-black/20">
                <ShieldCheck size={23} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Enterprise CMS</p>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-lg border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
              <p className="mt-1 text-sm font-semibold text-white">Production Ready</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Live
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-black/20 px-2 py-2">
              <p className="text-sm font-bold">{state.posts.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Posts</p>
            </div>
            <div className="rounded-md bg-black/20 px-2 py-2">
              <p className="text-sm font-bold">{state.media.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Media</p>
            </div>
            <div className="rounded-md bg-black/20 px-2 py-2">
              <p className="text-sm font-bold">{state.users.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Users</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {menuSections.map((section) => {
            const sectionItems = section.items.filter((item: MenuItem) =>
              item.minRole ? hasMinimumRole(user?.role, item.minRole) : true,
            );
            if (sectionItems.length === 0) return null;
            return (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
              <ul className="space-y-1">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path + '/'));

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-white text-[#0F172A] shadow-lg shadow-black/20'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                            isActive ? 'bg-[#194890] text-white' : 'bg-white/[0.06] text-slate-300 group-hover:bg-white/10 group-hover:text-white'
                          }`}
                        >
                          <Icon size={17} aria-hidden />
                        </span>
                        <span className="truncate">{item.label}</span>
                        {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            );
          })}
          <div className="mt-5 border-t border-white/10 pt-4">
            <Link
              to="/"
              onClick={onClose}
              className="group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-slate-300 group-hover:bg-white/10 group-hover:text-white">
                <ExternalLink size={17} aria-hidden />
              </span>
              <span>View public site</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4D35E] text-sm font-bold text-[#0F172A]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.email?.split('@')[0] || 'Editor'}</p>
                <p className="truncate text-xs text-slate-400">{user?.email || 'Signed in'}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {canUseApiConfig ? (
              <Link
                to="/admin/api-config"
                onClick={onClose}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Sparkles size={15} aria-hidden />
                AI Keys
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate('/login', { replace: true });
              }}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10 ${
                canUseApiConfig ? '' : 'col-span-2'
              }`}
            >
              <LogOut size={15} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
