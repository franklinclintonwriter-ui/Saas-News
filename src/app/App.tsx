import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/auth-context';
import { CmsProvider } from './context/cms-context';
import { ThemeProvider } from './context/theme-context';
import { AppToaster } from './components/AppToaster';
import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

const HomePage = lazy(() => import('./pages/public/HomePage'));
const ArticlePage = lazy(() => import('./pages/public/ArticlePage'));
const CategoryPage = lazy(() => import('./pages/public/CategoryPage'));
const SearchPage = lazy(() => import('./pages/public/SearchPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const StaticContentPage = lazy(() => import('./pages/public/StaticContentPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const PostsManager = lazy(() => import('./pages/admin/PostsManager'));
const PostEditor = lazy(() => import('./pages/admin/PostEditor'));
const PostPreview = lazy(() => import('./pages/admin/PostPreview'));
const MediaLibrary = lazy(() => import('./pages/admin/MediaLibrary'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const Tags = lazy(() => import('./pages/admin/Tags'));
const Comments = lazy(() => import('./pages/admin/Comments'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Users = lazy(() => import('./pages/admin/Users'));
const PagesManager = lazy(() => import('./pages/admin/PagesManager'));
const AdsManager = lazy(() => import('./pages/admin/AdsManager'));
const NavigationManager = lazy(() => import('./pages/admin/NavigationManager'));
const ContactInbox = lazy(() => import('./pages/admin/ContactInbox'));
const NewsletterManager = lazy(() => import('./pages/admin/NewsletterManager'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const ApiConfig = lazy(() => import('./pages/admin/ApiConfig'));

function RouteFallback() {
  return <div className="min-h-[40vh] bg-white px-4 py-12 text-center text-sm text-[#6B7280]">Loading...</div>;
}

const appSurface = (import.meta.env.VITE_APP_SURFACE as string | undefined) || 'all';
const publicEnabled = appSurface !== 'admin';
const adminEnabled = appSurface !== 'public';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CmsProvider>
            <AppToaster />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {adminEnabled ? <Route path="/login" element={<LoginPage />} /> : null}

              {publicEnabled ? (
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
              ) : (
                <Route path="/" element={<Navigate to="/admin" replace />} />
              )}

              {adminEnabled ? (
                <Route
                  path="/admin/preview/post/:id"
                  element={
                    <RequireAdminAuth>
                      <PostPreview />
                    </RequireAdminAuth>
                  }
                />
              ) : null}

              {adminEnabled ? (
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
                  <Route path="newsletter" element={<NewsletterManager />} />
                  <Route path="ads" element={<AdsManager />} />
                  <Route path="navigation" element={<NavigationManager />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="audit-log" element={<AuditLog />} />
                  <Route path="users" element={<Users />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="api-config" element={<ApiConfig />} />
                </Route>
              ) : null}

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </CmsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
