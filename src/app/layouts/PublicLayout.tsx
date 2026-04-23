import { Outlet, Link } from 'react-router';
import Header from '../components/public/Header';
import Footer from '../components/public/Footer';
import BreakingNews from '../components/public/BreakingNews';
import SeoManager from '../components/public/SeoManager';
import { useCms } from '../context/cms-context';

function formatToday(): string {
  try {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function PublicLayout() {
  const { state, status } = useCms();
  const { settings, posts } = state;
  const isBootLoading = status === 'loading' && posts.length === 0;

  if (status === 'offline' && posts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 text-center">
        <div className="max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <p className="text-lg font-bold text-[#111827]">API connection required</p>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            The public site is configured to show live newsroom content only. Start the API and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoManager />
      {isBootLoading ? (
        <div className="bg-[#DBEAFE] px-4 py-2 text-xs font-semibold text-[#1E40AF]">
          <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-[#93C5FD] border-t-[#1D4ED8] animate-spin" aria-hidden />
            <span>Loading latest newsroom content and preparing your page...</span>
          </div>
        </div>
      ) : null}
      <div className="px-4 py-2 text-white" style={{ backgroundColor: settings.primaryColor }}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <span className="text-xs md:text-sm">{formatToday()}</span>
            <span className="text-xs md:text-sm px-2 md:px-3 py-1 rounded" style={{ backgroundColor: settings.accentColor }}>
              Live
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/about" className="hover:underline">
              About
            </Link>
            <Link to="/contact" className="hover:underline">
              Contact
            </Link>
            <Link to="/contact" className="hover:underline">
              Advertise
            </Link>
          </div>
        </div>
      </div>
      <Header />
      <BreakingNews />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
