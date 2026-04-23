import { useMemo } from 'react';
import { Link } from 'react-router';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { useCms } from '../../context/cms-context';

type UsefulLink =
  | { kind: 'route'; to: string; label: string }
  | { kind: 'external'; href: string; label: string };

const usefulLinks: UsefulLink[] = [
  { kind: 'route', to: '/about', label: 'About Us' },
  { kind: 'route', to: '/contact', label: 'Contact' },
  { kind: 'route', to: '/search', label: 'Search' },
  { kind: 'route', to: '/contact', label: 'Advertise' },
  { kind: 'route', to: '/privacy#editorial', label: 'Editorial standards' },
];

const linkClass =
  'block py-1.5 text-sm text-neutral-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] rounded-sm';

export default function Footer() {
  const { state } = useCms();
  const { settings, categories } = state;

  const categoryLinks = useMemo(
    () => categories.map((c) => ({ to: `/category/${c.slug}`, label: c.name })),
    [categories],
  );

  const footerLinks = useMemo<UsefulLink[]>(() => {
    const rows = settings
      ? state.navigation
          .filter((item) => item.enabled && (item.location === 'FOOTER' || item.location === 'UTILITY'))
          .sort((a, b) => a.position - b.position)
          .map((item) =>
            item.external
              ? ({ kind: 'external', href: item.href, label: item.label } as UsefulLink)
              : ({ kind: 'route', to: item.href, label: item.label } as UsefulLink),
          )
      : [];
    return rows.length ? rows : usefulLinks;
  }, [settings, state.navigation]);

  const social = useMemo(() => {
    const items: { Icon: typeof Facebook; label: string; href: string }[] = [];
    if (settings.facebook) items.push({ Icon: Facebook, label: 'Facebook', href: settings.facebook });
    if (settings.twitter) items.push({ Icon: Twitter, label: 'X (Twitter)', href: settings.twitter });
    if (settings.instagram) items.push({ Icon: Instagram, label: 'Instagram', href: settings.instagram });
    if (settings.linkedin) items.push({ Icon: Linkedin, label: 'LinkedIn', href: settings.linkedin });
    return items;
  }, [settings.facebook, settings.twitter, settings.instagram, settings.linkedin]);

  const brand = settings.siteTitle || settings.organizationName || 'Publication';
  const logoUrl = settings.logoUrl;
  const showFooterLogo = settings.showFooterLogo && Boolean(logoUrl);
  const showFooterTitle = settings.showFooterSiteTitle || !showFooterLogo;
  const year = new Date().getFullYear();
  const copyrightLine = settings.copyright?.includes(String(year)) ? settings.copyright : `(c) ${year} ${brand}. All rights reserved.`;

  return (
    <footer className="border-t text-white" style={{ borderColor: `${settings.primaryColor}66`, backgroundColor: settings.footerBackground }} role="contentinfo">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-14">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3">
              {showFooterLogo && (
                <img
                  src={logoUrl}
                  alt={settings.logoAlt || brand}
                  className="max-w-[180px] object-contain"
                  style={{ height: `${Math.min(settings.logoHeight, 56)}px` }}
                />
              )}
              {showFooterTitle && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{brand}</span>}
            </Link>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Independent journalism</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-300 sm:text-[15px]">
              {settings.footerAbout || settings.tagline || 'Your trusted source for breaking news and analysis.'}
            </p>
          </div>

          <nav className="sm:col-span-1 lg:col-span-3" aria-labelledby="footer-categories-heading">
            <h3 id="footer-categories-heading" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Categories
            </h3>
            <ul className="mt-4 space-y-0.5">
              {categoryLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="sm:col-span-1 lg:col-span-2" aria-labelledby="footer-useful-heading">
            <h3 id="footer-useful-heading" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Useful links
            </h3>
            <ul className="mt-4 space-y-0.5">
              {footerLinks.map((item) =>
                item.kind === 'route' ? (
                  <li key={item.label}>
                    <Link to={item.to} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {item.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {social.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Follow us</h3>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">
                Join the conversation on configured social channels for live updates and newsroom coverage.
              </p>
              <ul className="mt-6 flex flex-wrap gap-3" aria-label="Social media">
                {social.map(({ Icon, label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[#194890] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2656A8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                    >
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 text-sm text-neutral-400 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:mt-16">
          <p className="text-center sm:text-left">{copyrightLine}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link
              to="/privacy"
              className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy#cookies"
              className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm"
            >
              Cookie settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
