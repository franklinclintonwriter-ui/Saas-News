import { useState } from 'react';
import { Outlet } from 'react-router';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import { useCms } from '../context/cms-context';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status } = useCms();

  const workspaceBody =
    status === 'loading' ? (
      <div className="rounded-lg border border-[#D5DFEA] bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-[#0F172A]">Loading live workspace</p>
        <p className="mt-2 text-sm text-[#64748B]">Connecting to the Prisma API...</p>
      </div>
    ) : status === 'offline' ? (
      <div className="rounded-lg border border-[#FECACA] bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-[#991B1B]">API connection required</p>
        <p className="mt-2 text-sm text-[#64748B]">The admin console is configured to use live Prisma data only.</p>
      </div>
    ) : (
      <Outlet />
    );

  return (
    <div className="admin-shell min-h-screen flex bg-[#EEF2F8] text-[#0F172A]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-workspace min-w-0 flex-1 lg:ml-[280px]">
        <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="admin-main px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="admin-main-inner mx-auto w-full max-w-[1600px]">
            {workspaceBody}
          </div>
        </main>
      </div>
    </div>
  );
}
