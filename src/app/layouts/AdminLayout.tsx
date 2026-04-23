import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import { useCms } from '../context/cms-context';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status, error, resetWorkspace } = useCms();

  const offlineTitle =
    error?.kind === 'forbidden'
      ? 'Access restricted'
      : error?.kind === 'auth'
        ? 'Session required'
        : 'API connection required';
  const offlineMessage =
    error?.kind === 'forbidden'
      ? 'Your role does not have permission to open this admin workspace.'
      : error?.kind === 'auth'
        ? 'Sign in again to reconnect to the live workspace.'
        : 'The admin console is configured to use live newsroom data only.';

  const workspaceBody =
    status === 'offline' ? (
      <div className="rounded-lg border border-[#FECACA] bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-[#991B1B]">{offlineTitle}</p>
        <p className="mt-2 text-sm text-[#64748B]">{offlineMessage}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetWorkspace}
            className="inline-flex rounded-lg bg-[#194890] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#143A73]"
          >
            Retry connection
          </button>
          {error?.kind === 'auth' && (
            <Link to="/login" className="inline-flex rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold hover:bg-[#F3F4F6]">
              Go to sign in
            </Link>
          )}
        </div>
      </div>
    ) : (
      <>
        {status === 'loading' && (
          <div className="mb-4 rounded-lg border border-[#D5DFEA] bg-white px-4 py-3 text-sm text-[#334155] shadow-sm">
            <p className="font-semibold text-[#0F172A]">Loading live workspace</p>
            <p className="mt-0.5 text-[#64748B]">Preparing the newsroom dashboard in the background...</p>
          </div>
        )}
        <Outlet />
      </>
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
