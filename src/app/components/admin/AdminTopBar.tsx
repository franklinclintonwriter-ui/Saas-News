import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
import { hasMinimumRole, type AdminRole } from '../../lib/admin/role-access';

interface AdminTopBarProps {
  onMenuClick: () => void;
}

type NavigationItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  description: string;
  minRole?: AdminRole;
};

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, description: 'Workspace command center' },
  { label: 'All posts', path: '/admin/posts', icon: FileText, description: 'Editorial queue and publishing' },
  { label: 'Pages', path: '/admin/pages', icon: FileText, description: 'Static pages and legal content' },
  { label: 'Contact inbox', path: '/admin/contact', icon: Inbox, description: 'Reader messages' },
  { label: 'Newsletter', path: '/admin/newsletter', icon: MailCheck, description: 'Subscribers and email audience', minRole: 'EDITOR' },
  { label: 'Ads', path: '/admin/ads', icon: Megaphone, description: 'Placements and campaigns' },
  { label: 'Navigation', path: '/admin/navigation', icon: NavigationIcon, description: 'Menus and route links' },
  { label: 'Audit log', path: '/admin/audit-log', icon: ClipboardList, description: 'Security activity stream', minRole: 'ADMIN' },
  { label: 'Users', path: '/admin/users', icon: Users, description: 'Roles, profiles, and staff', minRole: 'ADMIN' },
  { label: 'Settings', path: '/admin/settings', icon: Settings, description: 'Brand, SEO, and theme controls', minRole: 'ADMIN' },
  { label: 'API Config', path: '/admin/api-config', icon: KeyRound, description: 'AI and integration keys', minRole: 'ADMIN' },
];

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const { user } = useAuth();
  const { state } = useCms();
  const navigate = useNavigate();
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

  const availableNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) =>
        item.minRole ? hasMinimumRole(user?.role, item.minRole) : true,
      ),
    [user?.role],
  );

  const canCreatePosts = hasMinimumRole(user?.role, 'AUTHOR');
  const canEditAnyPost = hasMinimumRole(user?.role, 'EDITOR');
  const editablePosts = useMemo(
    () =>
      state.posts.filter((post) => {
        if (canEditAnyPost) return true;
        if (post.authorProfile?.id && user?.id && post.authorProfile.id === user.id) return true;
        if (post.authorProfile?.email && user?.email && post.authorProfile.email.toLowerCase() === user.email.toLowerCase()) return true;
        if (post.author && user?.name && post.author.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
        return false;
      }),
    [canEditAnyPost, state.posts, user?.email, user?.id, user?.name],
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
            {editablePosts.slice(0, 12).map((p) => (
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
            {availableNavigationItems.map((item) => {
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
            {canCreatePosts ? (
              <CommandItem
                onSelect={() => {
                  setPaletteOpen(false);
                  navigate('/admin/posts/new');
                }}
              >
                <Plus className="text-[#6B7280]" />
                New post
              </CommandItem>
            ) : null}
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

      <header className="admin-topbar sticky top-0 z-40 border-b px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[64px] items-center justify-between gap-3 sm:min-h-[72px] sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="shrink-0 rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-sm transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:border-[#194890]/35 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#194890]/25"
              aria-label="Open search and command palette"
            >
              <Search size={18} className="text-[#64748B]" aria-hidden />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-0.5 hidden select-none items-center rounded border border-[#D8DEE9] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#64748B] md:inline-flex" aria-hidden>
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {canCreatePosts ? (
              <Link
                to="/admin/posts/new"
                className="hidden min-h-10 items-center gap-2 rounded-lg bg-[#194890] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#143A73] md:inline-flex"
              >
                <Plus size={17} aria-hidden />
                New Post
              </Link>
            ) : null}
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
                  {recentAudit.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#DC2626] ring-2 ring-white dark:ring-[#0f172a]" />
                  )}
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
