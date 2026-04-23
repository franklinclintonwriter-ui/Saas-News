import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/auth-context';
import { CmsProvider } from './context/cms-context';
import { ThemeProvider } from './context/theme-context';
import { AppToaster } from './components/AppToaster';
import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const configuredSurface = ((import.meta.env.VITE_APP_SURFACE as string | undefined) || 'all').toLowerCase();

function normalizeConfiguredHost(value: string | undefined, fallback: string): string {
  const raw = (value || fallback).trim().replace(/\/+$/, '');
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.hostname.toLowerCase();
  } catch {
    return fallback;
  }
}

const adminHost = normalizeConfiguredHost(import.meta.env.VITE_ADMIN_HOST as string | undefined, 'admin.phulpur.org');
const publicHost = normalizeConfiguredHost(import.meta.env.VITE_PUBLIC_HOST as string | undefined, 'phulpur.net');

function currentHostname(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
}

function isLocalOrPreviewHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.pages.dev');
}

function runtimeSurface(): 'public' | 'admin' | 'all' {
  if (configuredSurface === 'public' || configuredSurface === 'admin') return configuredSurface;

  const hostname = currentHostname();
  if (!hostname || isLocalOrPreviewHost(hostname)) return 'all';
  if (hostname === adminHost || hostname.endsWith(`.${adminHost}`)) return 'admin';
  if (hostname === publicHost || hostname === `www.${publicHost}`) return 'public';
  return 'all';
}

const appSurface = runtimeSurface();
const publicEnabled = appSurface !== 'admin';
const adminEnabled = appSurface !== 'public';

const publicPages = publicEnabled
  ? {
      HomePage: lazy(() => import('./pages/public/HomePage')),
      ArticlePage: lazy(() => import('./pages/public/ArticlePage')),
      CategoryPage: lazy(() => import('./pages/public/CategoryPage')),
      SearchPage: lazy(() => import('./pages/public/SearchPage')),
      AboutPage: lazy(() => import('./pages/public/AboutPage')),
      ContactPage: lazy(() => import('./pages/public/ContactPage')),
      PrivacyPage: lazy(() => import('./pages/public/PrivacyPage')),
      TermsPage: lazy(() => import('./pages/public/TermsPage')),
      StaticContentPage: lazy(() => import('./pages/public/StaticContentPage')),
    }
  : null;

const adminPages = adminEnabled
  ? {
      LoginPage: lazy(() => import('./pages/public/LoginPage')),
      Dashboard: lazy(() => import('./pages/admin/Dashboard')),
      PostsManager: lazy(() => import('./pages/admin/PostsManager')),
      PostEditor: lazy(() => import('./pages/admin/PostEditor')),
      PostPreview: lazy(() => import('./pages/admin/PostPreview')),
      MediaLibrary: lazy(() => import('./pages/admin/MediaLibrary')),
      Settings: lazy(() => import('./pages/admin/Settings')),
      Categories: lazy(() => import('./pages/admin/Categories')),
      Tags: lazy(() => import('./pages/admin/Tags')),
      Comments: lazy(() => import('./pages/admin/Comments')),
      Analytics: lazy(() => import('./pages/admin/Analytics')),
      Users: lazy(() => import('./pages/admin/Users')),
      PagesManager: lazy(() => import('./pages/admin/PagesManager')),
      AdsManager: lazy(() => import('./pages/admin/AdsManager')),
      NavigationManager: lazy(() => import('./pages/admin/NavigationManager')),
      ContactInbox: lazy(() => import('./pages/admin/ContactInbox')),
      NewsletterManager: lazy(() => import('./pages/admin/NewsletterManager')),
      AuditLog: lazy(() => import('./pages/admin/AuditLog')),
      ApiConfig: lazy(() => import('./pages/admin/ApiConfig')),
    }
  : null;

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-16 text-center text-[#6B7280]">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-sm">
        <span className="h-8 w-8 rounded-full border-2 border-[#D1D5DB] border-t-[#194890] animate-spin" aria-hidden />
        <p className="text-sm font-semibold text-[#111827]">Loading newsroom modules</p>
        <p className="text-sm">Preparing the current section. This may take a moment after sign in.</p>
      </div>
    </div>
  );
}

function buildCanonicalUrl(hostname: string) {
  if (typeof window === 'undefined') return `https://${hostname}/`;

  const url = new URL(window.location.href);
  url.protocol = 'https:';
  url.hostname = hostname;
  return url.toString();
}

function SurfaceHostGuard() {
  useEffect(() => {
    const { hostname, pathname } = window.location;
    const isLocalOrPreview = isLocalOrPreviewHost(hostname.toLowerCase());

    if (isLocalOrPreview) return;

    if (appSurface === 'admin' && hostname !== adminHost) {
      window.location.replace(buildCanonicalUrl(adminHost));
      return;
    }

    if (appSurface === 'public' && (pathname === '/login' || pathname.startsWith('/admin'))) {
      window.location.replace(buildCanonicalUrl(adminHost));
      return;
    }

    if (appSurface === 'public' && hostname === adminHost) {
      window.location.replace(buildCanonicalUrl(publicHost));
    }
  }, []);

  return null;
}

function PublicAdminRedirect() {
  useEffect(() => {
    window.location.replace(buildCanonicalUrl(adminHost));
  }, []);

  return (
    <div className="min-h-screen bg-white px-4 py-16 text-center text-sm text-[#6B7280]">
      Redirecting to the admin console...
    </div>
  );
}

function renderPublicRoutes() {
  if (!publicPages) {
    return <Route path="/" element={<Navigate to="/admin" replace />} />;
  }

  const {
    HomePage,
    ArticlePage,
    CategoryPage,
    SearchPage,
    AboutPage,
    ContactPage,
    PrivacyPage,
    TermsPage,
    StaticContentPage,
  } = publicPages;

  return (
    <Route path="/" element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="article/:id" element={<ArticlePage />} />
      <Route path="category/:slug" element={<CategoryPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="terms" element={<TermsPage />} />
      <Route path="page/:slug" element={<StaticContentPage />} />
    </Route>
  );
}

function renderAdminRoutes() {
  if (!adminPages) {
    return (
      <>
        <Route path="/login" element={<PublicAdminRedirect />} />
        <Route path="/admin/*" element={<PublicAdminRedirect />} />
      </>
    );
  }

  const {
    LoginPage,
    Dashboard,
    PostsManager,
    PostEditor,
    PostPreview,
    MediaLibrary,
    Settings,
    Categories,
    Tags,
    Comments,
    Analytics,
    Users,
    PagesManager,
    AdsManager,
    NavigationManager,
    ContactInbox,
    NewsletterManager,
    AuditLog,
    ApiConfig,
  } = adminPages;

  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin/preview/post/:id"
        element={
          <RequireAdminAuth>
            <PostPreview />
          </RequireAdminAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdminAuth>
            <AdminLayout />
          </RequireAdminAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="posts" element={<PostsManager />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/edit/:id" element={<PostEditor />} />
        <Route path="pages" element={<PagesManager />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tags" element={<Tags />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="comments" element={<Comments />} />
        <Route path="contact" element={<ContactInbox />} />
        <Route
          path="newsletter"
          element={
            <RequireAdminAuth roles={["ADMIN", "EDITOR"]}>
              <NewsletterManager />
            </RequireAdminAuth>
          }
        />
        <Route path="ads" element={<AdsManager />} />
        <Route path="navigation" element={<NavigationManager />} />
        <Route path="analytics" element={<Analytics />} />
        <Route
          path="audit-log"
          element={
            <RequireAdminAuth roles={["ADMIN"]}>
              <AuditLog />
            </RequireAdminAuth>
          }
        />
        <Route
          path="users"
          element={
            <RequireAdminAuth roles={["ADMIN"]}>
              <Users />
            </RequireAdminAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAdminAuth roles={["ADMIN"]}>
              <Settings />
            </RequireAdminAuth>
          }
        />
        <Route
          path="api-config"
          element={
            <RequireAdminAuth roles={["ADMIN"]}>
              <ApiConfig />
            </RequireAdminAuth>
          }
        />
      </Route>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CmsProvider>
            <AppToaster />
            <SurfaceHostGuard />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {renderPublicRoutes()}
                {renderAdminRoutes()}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </CmsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
