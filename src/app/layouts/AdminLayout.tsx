import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import { SkipToContent } from '../components/SkipToContent';
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
      <div className="rounded-lg border border-[#FECACA] bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-card">
        <p className="font-semibold text-[#991B1B] dark:text-red-300">{offlineTitle}</p>
        <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">{offlineMessage}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetWorkspace}
            className="inline-flex rounded-lg bg-[#194890] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#143A73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#194890]/45 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]"
          >
            Retry connection
          </button>
          {error?.kind === 'auth' && (
            <Link
              to="/login"
              className="inline-flex rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold hover:bg-[#F3F4F6] dark:border-border dark:hover:bg-[#1e293b]"
            >
              Go to sign in
            </Link>
          )}
        </div>
      </div>
    ) : (
      <>
        {status === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 overflow-hidden rounded-xl border border-[#D5DFEA] bg-white px-5 py-4 text-sm shadow-sm dark:border-border dark:bg-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#0F172A] dark:text-slate-100">Loading live workspace</p>
                <p className="mt-1 text-[#64748B] dark:text-slate-400">
                  Preparing the newsroom dashboard and syncing your latest content, settings, and media.
                </p>
              </div>
              <span
                className="mt-1 inline-flex h-8 w-8 shrink-0 rounded-full border-2 border-[#CBD5E1] border-t-[#194890] animate-spin dark:border-slate-600"
                aria-hidden
              />
            </div>
            <div className="mt-4 grid gap-2 text-xs text-[#64748B] sm:grid-cols-3 dark:text-slate-400">
              <p className="rounded-lg border border-[#D5DFEA] bg-[#F8FAFC] px-2.5 py-2 dark:border-border dark:bg-[#0f172a]">
                Checking authentication and permissions
              </p>
              <p className="rounded-lg border border-[#D5DFEA] bg-[#F8FAFC] px-2.5 py-2 dark:border-border dark:bg-[#0f172a]">Loading posts, pages, and tags</p>
              <p className="rounded-lg border border-[#D5DFEA] bg-[#F8FAFC] px-2.5 py-2 dark:border-border dark:bg-[#0f172a]">
                Applying your latest workspace cache
              </p>
            </div>
          </div>
        )}
        <Outlet />
      </>
    );

  return (
    <div className="admin-shell min-h-screen flex">
      <SkipToContent />
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-workspace min-w-0 flex-1 lg:ml-[280px]">
        <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main id="main" className="admin-main px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="admin-main-inner mx-auto w-full max-w-[1600px]">
            {workspaceBody}
          </div>
        </main>
      </div>
    </div>
  );
}
