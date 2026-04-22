import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Mail, Search, Menu, X } from 'lucide-react';
import { ThemeModeButton } from '../ThemeModeButton';
import { useCms } from '../../context/cms-context';
import { useTheme } from '../../context/theme-context';
import { recordNewsletterSignup } from '../../lib/newsletter-storage';
import { toast } from '../../lib/notify';

const MAX_NAV = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getHexLuminance(value: string) {
  const normalized = value.trim().replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) return null;

  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getThemeAwareHeaderBackground(headerBackground: string, isDark: boolean) {
  if (!isDark) return headerBackground;

  const trimmed = headerBackground.trim().toLowerCase();
  if (trimmed === 'white' || trimmed === 'transparent') return 'var(--phulpur24-surface-elevated)';

  const luminance = getHexLuminance(trimmed);
  return luminance !== null && luminance > 0.82 ? 'var(--phulpur24-surface-elevated)' : headerBackground;
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [email, setEmail] = useState('');
  const { state } = useCms();
  const { resolvedTheme } = useTheme();

  const navCategories = useMemo(() => state.categories.slice(0, MAX_NAV), [state.categories]);
  const managedHeaderLinks = useMemo(
    () =>
      state.navigation
        .filter((item) => item.enabled && item.location === 'HEADER')
        .sort((a, b) => a.position - b.position)
        .slice(0, MAX_NAV),
    [state.navigation],
  );
  const headerLinks = useMemo(() => {
    if (managedHeaderLinks.length > 1) {
      return managedHeaderLinks.map((item) => ({
        key: item.id,
        label: item.label,
        href: item.href,
        external: item.external,
      }));
    }
    return [
      { key: 'home', label: 'Home', href: '/', external: false },
      ...navCategories.map((category) => ({
        key: category.id,
        label: category.name,
        href: `/category/${category.slug}`,
        external: false,
      })),
    ];
  }, [managedHeaderLinks, navCategories]);
  const { settings } = state;
  const brand = settings.siteTitle || settings.organizationName || 'Publication';
  const logoUrl = settings.logoUrl || settings.faviconUrl;
  const showLogo = settings.showHeaderLogo && Boolean(logoUrl);
  const showTitle = settings.showSiteTitle || !showLogo;
  const subscriptionsEnabled = settings.newsletterEnabled;
  const headerBackground = getThemeAwareHeaderBackground(settings.headerBackground, resolvedTheme === 'dark');

  const closeMobile = () => setMobileMenuOpen(false);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>, source: 'header' | 'mobile-header') => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!emailPattern.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      await recordNewsletterSignup(trimmed, source);
      toast.success("You're subscribed. A confirmation has been queued to your inbox.");
      setEmail('');
      setSubscribeOpen(false);
      closeMobile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to subscribe right now.');
    }
  };

  return (
    <header className="border-b border-[#E5E7EB] sticky top-0 z-50" style={{ backgroundColor: headerBackground }}>
      <div className="max-w-[1440px] mx-auto px-4 h-[70px] md:h-[90px] flex items-center justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          {showLogo && (
            <img
              src={logoUrl}
              alt={settings.logoAlt || brand}
              className="max-w-[180px] object-contain"
              style={{ height: `${settings.logoHeight}px` }}
            />
          )}
          {showTitle && (
            <span className="truncate text-xl font-bold md:text-2xl" style={{ color: settings.primaryColor }}>
              {brand}
            </span>
          )}
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {headerLinks.map((item) =>
            item.external ? (
              <a key={item.key} href={item.href} target="_blank" rel="noreferrer" className="hover:text-[#194890] transition">
                {item.label}
              </a>
            ) : (
              <Link key={item.key} to={item.href} className="hover:text-[#194890] transition">
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeModeButton compact className="hidden sm:inline-flex" />
          <Link to="/search" className="p-2 hover:bg-[#F3F4F6] rounded-full transition" aria-label="Search">
            <Search size={20} />
          </Link>
          {subscriptionsEnabled && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setSubscribeOpen((open) => !open)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition hover:brightness-110"
                style={{ backgroundColor: settings.primaryColor }}
                aria-expanded={subscribeOpen}
                aria-controls="header-subscribe-form"
              >
                <Mail size={18} aria-hidden />
                <span>Subscribe</span>
              </button>
              {subscribeOpen && (
                <form
                  id="header-subscribe-form"
                  onSubmit={(e) => handleSubscribe(e, 'header')}
                  className="absolute right-0 top-[calc(100%+12px)] w-[320px] rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-lg"
                  aria-label="Header newsletter signup"
                >
                  <label htmlFor="header-newsletter-email" className="block text-sm font-semibold text-[#111827]">
                    Get the daily briefing
                  </label>
                  <div className="mt-3 flex gap-2">
                    <input
                      id="header-newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#194890]"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      Join
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-[#F3F4F6] rounded-lg transition"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#E5E7EB]">
          <nav className="px-4 py-4 space-y-1">
            <div className="mb-3 flex justify-end">
              <ThemeModeButton />
            </div>
            {headerLinks.map((item) =>
              item.external ? (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobile}
                  className="block px-4 py-3 hover:bg-[#F3F4F6] rounded-lg transition"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={closeMobile}
                  className="block px-4 py-3 hover:bg-[#F3F4F6] rounded-lg transition"
                >
                  {item.label}
                </Link>
              ),
            )}
            {subscriptionsEnabled && (
              <form
                onSubmit={(e) => handleSubscribe(e, 'mobile-header')}
                className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                aria-label="Mobile newsletter signup"
              >
                <label htmlFor="mobile-header-newsletter-email" className="block text-sm font-semibold text-[#111827]">
                  Subscribe to the daily briefing
                </label>
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    id="mobile-header-newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-3 text-sm outline-none focus:border-[#194890]"
                    required
                  />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition hover:brightness-110"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Mail size={18} aria-hidden />
                    Subscribe
                  </button>
                </div>
              </form>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
