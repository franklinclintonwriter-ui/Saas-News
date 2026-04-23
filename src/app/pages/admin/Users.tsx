import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Mail, Shield, UserCheck, Upload } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { formatShortDate, makeId, userPostCount, type AdminUser, type UserRole, type UserStatus } from '../../lib/admin/cms-state';
import { toast } from '../../lib/notify';
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
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

const PAGE = 8;

const roleColors: Record<string, string> = {
  Admin: 'bg-[#DC2626] text-white',
  Editor: 'bg-[#2563EB] text-white',
  Author: 'bg-[#194890] text-white',
  Contributor: 'bg-[#6B7280] text-white',
};

type UserForm = Omit<AdminUser, 'id' | 'joinedAt'> & { password: string };

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Author',
  status: 'pending',
  title: '',
  bio: '',
  avatarUrl: '',
  location: '',
  websiteUrl: '',
  twitterUrl: '',
  linkedinUrl: '',
  facebookUrl: '',
};

const fieldClass = 'w-full px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white';
const labelClass = 'block text-sm font-semibold mb-2';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function formFromUser(user: AdminUser): UserForm {
  return {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status,
    title: user.title,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    location: user.location,
    websiteUrl: user.websiteUrl,
    twitterUrl: user.twitterUrl,
    linkedinUrl: user.linkedinUrl,
    facebookUrl: user.facebookUrl,
  };
}

export default function Users() {
  const { state, dispatch } = useCms();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('all');
  const [userStatus, setUserStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = state.users.length;
    const admins = state.users.filter((u) => u.role === 'Admin').length;
    const editors = state.users.filter((u) => u.role === 'Editor').length;
    const authors = state.users.filter((u) => u.role === 'Author' || u.role === 'Contributor').length;
    return [
      { label: 'Total Users', value: String(total), icon: UserCheck, color: 'bg-[#194890]' },
      { label: 'Admins', value: String(admins), icon: Shield, color: 'bg-[#DC2626]' },
      { label: 'Editors', value: String(editors), icon: Edit, color: 'bg-[#2563EB]' },
      { label: 'Authors + Contributors', value: String(authors), icon: Edit, color: 'bg-[#10B981]' },
    ];
  }, [state.users]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (userStatus !== 'all' && u.status !== userStatus) return false;
      if (!words.length) return true;
      const hay = `${u.name} ${u.email} ${u.title} ${u.location}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [state.users, q, role, userStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * PAGE, pageSafe * PAGE);

  const update = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm(formFromUser(u));
    setModalOpen(true);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 1_000_000) {
      toast.error('Use an avatar image under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update('avatarUrl', String(reader.result));
    reader.onerror = () => toast.error('Unable to read this avatar.');
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Enter a valid email.');
      return;
    }
    if (!editing && form.password.length < 10) {
      toast.error('Initial password must be at least 10 characters.');
      return;
    }
    if (editing && form.password && form.password.length < 10) {
      toast.error('New password must be at least 10 characters.');
      return;
    }

    const cleaned: UserForm = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      title: form.title.trim(),
      bio: form.bio.trim(),
      avatarUrl: form.avatarUrl.trim(),
      location: form.location.trim(),
      websiteUrl: form.websiteUrl.trim(),
      twitterUrl: form.twitterUrl.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      facebookUrl: form.facebookUrl.trim(),
    };
    const { password, ...cleanedProfile } = cleaned;

    if (editing) {
      dispatch({ type: 'USER_UPDATE', user: { ...editing, ...cleanedProfile }, password: password || undefined });
      toast.success('User profile updated.');
    } else {
      const dup = state.users.some((u) => u.email.toLowerCase() === cleaned.email);
      if (dup) {
        toast.error('A user with this email already exists.');
        return;
      }
      dispatch({
        type: 'USER_ADD',
        user: {
          id: makeId(),
          ...cleanedProfile,
          joinedAt: new Date().toISOString(),
        },
        password,
      });
      toast.success('User invited and profile created.');
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    dispatch({ type: 'USER_DELETE', id: deleteId });
    toast.success('User removed from workspace.');
    setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4 md:mb-8">
        <Button onClick={openAdd} className="bg-[#194890] hover:bg-[#2656A8] font-semibold">
          <Plus size={20} className="mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg p-4 md:p-6 border border-[#E5E7EB]">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="text-white" size={24} />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-[#6B7280]">{stat.label}</p>
            </div>
          );
        })}
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
                placeholder="Search users, titles, locations..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={fieldClass}>
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Author">Author</option>
              <option value="Contributor">Contributor</option>
            </select>
            <select value={userStatus} onChange={(e) => { setUserStatus(e.target.value); setPage(1); }} className={fieldClass}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="hidden md:flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition">
                  <Filter size={18} />
                  Filters
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setUserStatus('pending'); setPage(1); }}>Pending invites</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setQ(''); setRole('all'); setUserStatus('all'); setPage(1); }}>Reset filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F3F4F6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Posts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {slice.map((user) => (
                <tr key={user.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#E8EEF8] text-[#194890] rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-[#6B7280]">{user.email}</p>
                        <p className="text-xs text-[#194890] truncate max-w-[260px]">{user.title || 'No public title set'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${roleColors[user.role] ?? 'bg-[#E5E7EB] text-[#6B7280]'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">{userPostCount(state.posts, user.name)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-[#E8EEF8] text-[#194890]' : user.status === 'inactive' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6B7280]">{formatShortDate(user.joinedAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${user.email}`} className="p-2 hover:bg-[#F3F4F6] rounded transition inline-flex" title="Email">
                        <Mail size={16} />
                      </a>
                      <button type="button" onClick={() => openEdit(user)} className="p-2 hover:bg-[#F3F4F6] rounded transition" title="Edit profile">
                        <Edit size={16} />
                      </button>
                      <button type="button" onClick={() => setDeleteId(user.id)} className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded transition" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 md:px-6 py-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#6B7280]">
            Page {pageSafe} of {totalPages} - {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition text-sm disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit user profile' : 'Invite user'}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[72vh] grid-cols-1 gap-5 overflow-y-auto pr-1 lg:grid-cols-[220px_1fr]">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#E8EEF8] text-2xl font-bold text-[#194890]">
                {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(form.name)}
              </div>
              <label className="mb-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F3F4F6]">
                <Upload size={16} />
                Upload avatar
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
              </label>
              <label className={labelClass}>Avatar URL</label>
              <input type="text" value={form.avatarUrl} onChange={(e) => update('avatarUrl', e.target.value)} className={fieldClass} placeholder="https:// or data:image" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Full name</label>
                <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} disabled={!!editing} className={`${fieldClass} disabled:bg-[#F3F4F6]`} />
              </div>
              <div>
                <label className={labelClass}>{editing ? 'New Password' : 'Initial Password'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className={fieldClass}
                  placeholder={editing ? 'Leave blank to keep current password' : 'At least 10 characters'}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select className={fieldClass} value={form.role} onChange={(e) => update('role', e.target.value as UserRole)}>
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Author">Author</option>
                  <option value="Contributor">Contributor</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={fieldClass} value={form.status} onChange={(e) => update('status', e.target.value as UserStatus)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Public title</label>
                <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} className={fieldClass} placeholder="Local news editor" />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} className={fieldClass} placeholder="Phulpur, Mymensingh" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Public bio</label>
                <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} className={`${fieldClass} min-h-28 resize-y`} placeholder="Short biography shown on article pages." />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="url" value={form.websiteUrl} onChange={(e) => update('websiteUrl', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>X / Twitter</label>
                <input type="url" value={form.twitterUrl} onChange={(e) => update('twitterUrl', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input type="url" value={form.linkedinUrl} onChange={(e) => update('linkedinUrl', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Facebook</label>
                <input type="url" value={form.facebookUrl} onChange={(e) => update('facebookUrl', e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#194890] hover:bg-[#2656A8]" onClick={submit}>
              {editing ? 'Save Profile' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>They will lose admin access. Posts they authored remain attached to the existing byline.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#DC2626] hover:bg-[#B91C1C]" onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
