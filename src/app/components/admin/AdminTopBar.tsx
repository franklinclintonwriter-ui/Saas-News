import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  ClipboardList,
  ExternalLink,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  MailCheck,
  Megaphone,
  Menu,
  Navigation as NavigationIcon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ThemeModeButton } from '../ThemeModeButton';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatRelative } from '../../lib/admin/cms-state';

interface AdminTopBarProps {
  onMenuClick: () => void;
}

const navigationItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, description: 'Workspace command center' },
  { label: 'All posts', path: '/admin/posts', icon: FileText, description: 'Editorial queue and publishing' },
  { label: 'Pages', path: '/admin/pages', icon: FileText, description: 'Static pages and legal content' },
  { label: 'Contact inbox', path: '/admin/contact', icon: Inbox, description: 'Reader messages' },
  { label: 'Newsletter', path: '/admin/newsletter', icon: MailCheck, description: 'Subscribers and email audience' },
  { label: 'Ads', path: '/admin/ads', icon: Megaphone, description: 'Placements and campaigns' },
  { label: 'Navigation', path: '/admin/navigation', icon: NavigationIcon, description: 'Menus and route links' },
  { label: 'Audit log', path: '/admin/audit-log', icon: ClipboardList, description: 'Security activity stream' },
  { label: 'Users', path: '/admin/users', icon: Users, description: 'Roles, profiles, and staff' },
  { label: 'Settings', path: '/admin/settings', icon: Settings, description: 'Brand, SEO, and theme controls' },
  { label: 'API Config', path: '/admin/api-config', icon: KeyRound, description: 'AI and integration keys' },
];

const pageMeta = [
  { match: '/admin/dashboard', title: 'Dashboard', eyebrow: 'Command Center', description: 'Live editorial and operating snapshot' },
  { match: '/admin/posts/new', title: 'Create Post', eyebrow: 'Publishing', description: 'Draft, optimize, preview, and publish' },
  { match: '/admin/posts/edit', title: 'Edit Post', eyebrow: 'Publishing', description: 'Production editor with SEO and media controls' },
  { match: '/admin/posts', title: 'Posts', eyebrow: 'Publishing', description: 'Manage article workflow and status' },
  { match: '/admin/pages', title: 'Pages', eyebrow: 'Publishing', description: 'Maintain evergreen and legal pages' },
  { match: '/admin/categories', title: 'Categories', eyebrow: 'Taxonomy', description: 'Organize coverage verticals' },
  { match: '/admin/tags', title: 'Tags', eyebrow: 'Taxonomy', description: 'Control discoverability and topic labels' },
  { match: '/admin/media', title: 'Media Library', eyebrow: 'Assets', description: 'Images and files for every channel' },
  { match: '/admin/comments', title: 'Comments', eyebrow: 'Moderation', description: 'Review reader discussion' },
  { match: '/admin/contact', title: 'Contact Inbox', eyebrow: 'Audience', description: 'Manage reader messages' },
  { match: '/admin/newsletter', title: 'Newsletter', eyebrow: 'Audience', description: 'Subscriber lifecycle controls' },
  { match: '/admin/ads', title: 'Ads', eyebrow: 'Revenue', description: 'Campaign and placement management' },
  { match: '/admin/navigation', title: 'Navigation', eyebrow: 'Platform', description: 'Header, footer, and utility links' },
  { match: '/admin/analytics', title: 'Analytics', eyebrow: 'Intelligence', description: 'Traffic and audience performance' },
  { match: '/admin/audit-log', title: 'Audit Log', eyebrow: 'Security', description: 'Trace admin actions and changes' },
  { match: '/admin/users', title: 'Users', eyebrow: 'Access', description: 'Staff roles and profiles' },
  { match: '/admin/settings', title: 'Settings', eyebrow: 'Brand System', description: 'Logo, SEO, schema, and theme controls' },
  { match: '/admin/api-config', title: 'API Config', eyebrow: 'Integrations', description: 'AI models, keys, and endpoints' },
];

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const { user } = useAuth();
  const { state } = useCms();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayName = useMemo(() => {
    if (!user?.email) return 'Signed out';
    const local = user.email.split('@')[0];
    return local ? local.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : user.email;
  }, [user?.email]);

  const meta = useMemo(
    () => pageMeta.find((item) => location.pathname === item.match || location.pathname.startsWith(`${item.match}/`)) ?? pageMeta[0]!,
    [location.pathname],
  );

  const recentAudit = state.auditLog.slice(0, 8);
  const draftCount = state.posts.filter((post) => post.status === 'Draft').length;
  const pendingComments = state.comments.filter((comment) => comment.status === 'pending').length;

  return (
    <>
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Command palette" description="Navigate or jump to content">
        <CommandInput placeholder="Search posts, pages, actions..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Posts">
            {state.posts.slice(0, 12).map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.title} ${p.slug}`}
                onSelect={() => {
                  setPaletteOpen(false);
                  navigate(`/admin/posts/edit/${p.id}`);
                }}
              >
                <FileText className="text-[#6B7280]" />
                <span className="truncate">{p.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.description}`}
                  onSelect={() => {
                    setPaletteOpen(false);
                    navigate(item.path);
                  }}
                >
                  <Icon className="text-[#6B7280]" />
                  <div className="flex min-w-0 flex-col">
                    <span>{item.label}</span>
                    <span className="truncate text-xs text-[#6B7280]">{item.description}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setPaletteOpen(false);
                navigate('/admin/posts/new');
              }}
            >
              <Plus className="text-[#6B7280]" />
              New post
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setPaletteOpen(false);
                navigate('/');
              }}
            >
              <ExternalLink className="text-[#6B7280]" />
              View public site
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <header className="admin-topbar sticky top-0 z-40 border-b border-white/70 bg-white/82 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-h-[82px] items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <button
              type="button"
              onClick={onMenuClick}
              className="shrink-0 rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-sm transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                <ShieldCheck size={14} aria-hidden />
                {meta.eyebrow}
              </div>
              <div className="mt-1 flex items-end gap-3">
                <h1 className="truncate text-2xl font-bold tracking-tight text-[#0F172A]">{meta.title}</h1>
                <p className="hidden pb-1 text-sm text-[#64748B] xl:block">{meta.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="relative hidden w-full max-w-xl text-left sm:block"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} aria-hidden />
              <div className="min-h-11 w-full rounded-lg border border-[#D8DEE9] bg-[#F8FAFC] py-2.5 pl-10 pr-16 text-sm text-[#64748B] shadow-inner transition hover:border-[#194890]/45 hover:bg-white">
                Search workspace, content, or actions...
              </div>
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-6 -translate-y-1/2 select-none items-center gap-1 rounded-md border border-[#D8DEE9] bg-white px-2 font-mono text-[10px] font-semibold text-[#64748B] shadow-sm md:inline-flex">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-sm transition hover:bg-[#F3F4F6] sm:hidden"
              aria-label="Open command palette"
            >
              <Search size={20} />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <Link
              to="/admin/posts/new"
              className="hidden min-h-10 items-center gap-2 rounded-lg bg-[#194890] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143A73] md:inline-flex"
            >
              <Plus size={17} aria-hidden />
              New Post
            </Link>
            <div className="hidden items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#475569] shadow-sm xl:flex">
              <span>{draftCount} drafts</span>
              <span className="h-4 w-px bg-[#E5E7EB]" />
              <span>{pendingComments} pending</span>
            </div>
            <ThemeModeButton compact />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="relative rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-sm transition hover:bg-[#F3F4F6]" aria-label="Notifications">
                  <Bell size={20} />
                  {recentAudit.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#DC2626] ring-2 ring-white" />}
                </button>
              </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[60] w-[21rem]">
                <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentAudit.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-[#6B7280]">No events yet. Edits and publishes appear here.</div>
                ) : (
                  recentAudit.map((a) => (
                    <DropdownMenuItem key={a.id} className="flex cursor-default flex-col items-start gap-0.5 focus:bg-[#F3F4F6]">
                      <span className="text-sm font-medium text-[#111827]">{a.action}</span>
                      <span className="text-xs text-[#6B7280]">
                        {a.resource}
                        {a.detail ? ` - ${a.detail}` : ''}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {a.actor} - {formatRelative(a.at)}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden items-center gap-3 border-l border-[#E5E7EB] pl-3 md:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8EEF8] text-sm font-bold text-[#194890]" aria-hidden>
                {(displayName[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="max-w-[150px] truncate text-sm font-semibold text-[#111827]">{displayName}</p>
                <p className="max-w-[150px] truncate text-xs text-[#6B7280]">{user?.email ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
