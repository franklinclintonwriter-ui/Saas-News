import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ShieldCheck,
  Lock,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ArrowUp,
  Globe2,
} from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { recordNewsletterSignup } from '../../lib/newsletter-storage';
import { toast } from '../../lib/notify';

type UsefulLink =
  | { kind: 'route'; to: string; label: string }
  | { kind: 'external'; href: string; label: string };

const defaultUsefulLinks: UsefulLink[] = [
  { kind: 'route', to: '/about', label: 'About Us' },
  { kind: 'route', to: '/contact', label: 'Contact' },
  { kind: 'route', to: '/search', label: 'Search' },
  { kind: 'route', to: '/contact', label: 'Advertise' },
  { kind: 'route', to: '/privacy#editorial', label: 'Editorial Standards' },
];

const linkClass =
  'group inline-flex items-center gap-1.5 py-1.5 text-sm text-neutral-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Footer() {
  const { state } = useCms();
  const { settings, categories } = state;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categoryLinks = useMemo(
    () => categories.slice(0, 8).map((c) => ({ to: `/category/${c.slug}`, label: c.name })),
    [categories],
  );

  const footerLinks = useMemo<UsefulLink[]>(() => {
    const rows = state.navigation
      .filter((item) => item.enabled && (item.location === 'FOOTER' || item.location === 'UTILITY'))
      .sort((a, b) => a.position - b.position)
      .map((item) =>
        item.external
          ? ({ kind: 'external', href: item.href, label: item.label } as UsefulLink)
          : ({ kind: 'route', to: item.href, label: item.label } as UsefulLink),
      );
    return rows.length ? rows : defaultUsefulLinks;
  }, [state.navigation]);

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
  const copyrightLine = settings.copyright?.includes(String(year))
    ? settings.copyright
    : `© ${year} ${brand}. All rights reserved.`;

  const contactEmail = settings.contactEmail;
  const phone = settings.phone;
  const address = settings.address;
  const siteUrl = settings.siteUrl;

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!emailPattern.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await recordNewsletterSignup(trimmed, 'footer');
      toast.success("You're subscribed. Check your inbox for confirmation.");
      setEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to subscribe right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer
      className="relative border-t text-white"
      style={{
        borderColor: `${settings.primaryColor}66`,
        backgroundColor: settings.footerBackground,
      }}
      role="contentinfo"
    >
      <div
        className="h-1 w-full"
        style={{
          backgroundImage: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.accentColor})`,
        }}
        aria-hidden
      />

      {settings.newsletterEnabled !== false && (
        <div className="border-b border-white/10 bg-white/[0.03]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-10">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                Newsletter
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                The morning briefing, delivered daily
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                Top stories, original analysis, and must-read interviews — curated by our editors.
                No spam. Unsubscribe anytime.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
              aria-label="Newsletter signup"
            >
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="relative flex-1">
                <Mail
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-neutral-400 shadow-sm transition focus:border-white/40 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white px-5 text-sm font-semibold text-[#0B1220] transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Subscribing…' : 'Subscribe'}
                {!submitting && <ArrowRight size={16} strokeWidth={2.25} aria-hidden />}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8 lg:pb-14 lg:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-12 lg:gap-x-10">
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
              {showFooterTitle && (
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  {brand}
                </span>
              )}
            </Link>
            <h2 className="mt-3 text-lg font-bold tracking-tight text-white sm:text-xl">
              Independent journalism, delivered with integrity
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
              {settings.footerAbout ||
                settings.tagline ||
                'Your trusted source for breaking news, investigative reporting, and thoughtful analysis from a newsroom committed to accuracy and independence.'}
            </p>

            {(contactEmail || phone || address) && (
              <ul className="mt-6 space-y-2.5 text-sm text-neutral-300">
                {contactEmail && (
                  <li className="flex items-start gap-2.5">
                    <Mail size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="break-all transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm"
                    >
                      {contactEmail}
                    </a>
                  </li>
                )}
                {phone && (
                  <li className="flex items-start gap-2.5">
                    <Phone size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden />
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] rounded-sm"
                    >
                      {phone}
                    </a>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden />
                    <span className="leading-relaxed">{address}</span>
                  </li>
                )}
              </ul>
            )}

            {social.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Follow
                </p>
                <ul className="mt-3 flex flex-wrap gap-2.5" aria-label="Social media">
                  {social.map(({ Icon, label, href }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                      >
                        <Icon size={16} strokeWidth={1.9} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <nav className="sm:col-span-1 lg:col-span-3" aria-labelledby="footer-categories-heading">
            <h3
              id="footer-categories-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400"
            >
              Sections
            </h3>
            <ul className="mt-4 space-y-0.5">
              {categoryLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="sm:col-span-1 lg:col-span-2" aria-labelledby="footer-useful-heading">
            <h3
              id="footer-useful-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400"
            >
              Company
            </h3>
            <ul className="mt-4 space-y-0.5">
              {footerLinks.map((item) =>
                item.kind === 'route' ? (
                  <li key={item.label}>
                    <Link to={item.to} className={linkClass}>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ) : (
                  <li key={item.label}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      <span>{item.label}</span>
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              Trusted &amp; Secure
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                  <Lock size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">SSL Secured</p>
                  <p className="text-xs leading-relaxed text-neutral-400">256-bit TLS encryption</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-400">
                  <ShieldCheck size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Privacy Protected</p>
                  <p className="text-xs leading-relaxed text-neutral-400">GDPR &amp; data-safety compliant</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                  <BadgeCheck size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Verified Publisher</p>
                  <p className="text-xs leading-relaxed text-neutral-400">Authenticated editorial source</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm lg:px-8">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-center sm:text-left">{copyrightLine}</p>
            {siteUrl && (
              <span className="hidden items-center gap-1 text-neutral-500 sm:inline-flex">
                <span aria-hidden>·</span>
                <Globe2 size={13} strokeWidth={2} aria-hidden />
                <span>{siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end">
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
              Cookie Settings
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
              aria-label="Back to top"
            >
              <ArrowUp size={13} strokeWidth={2.25} aria-hidden />
              Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
