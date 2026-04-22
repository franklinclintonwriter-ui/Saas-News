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
  const { settings } = state;

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 text-center">
        <div>
          <p className="text-sm font-semibold text-[#194890]">Loading publication</p>
          <p className="mt-2 text-sm text-[#6B7280]">Connecting to the live Prisma API...</p>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 text-center">
        <div className="max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <p className="text-lg font-bold text-[#111827]">API connection required</p>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            The public site is configured to show live Prisma content only. Start the API and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoManager />
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
