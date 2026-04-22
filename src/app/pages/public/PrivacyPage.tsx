import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import StaticPageArticle from '../../components/public/StaticPageArticle';

export default function PrivacyPage() {
  const { state } = useCms();
  const brand = state.settings.siteTitle || state.settings.organizationName || 'Publication';
  const privacyEmail = state.settings.supportEmail || state.settings.contactEmail;
  const page = state.pages.find((item) => item.slug === 'privacy' && item.status === 'PUBLISHED');
  if (page) return <StaticPageArticle page={page} fallbackTitle="Privacy Policy" />;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[#6B7280]">
            <Link to="/" className="hover:text-[#194890]">
              Home
            </Link>
            <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />
            <span className="text-neutral-900">Privacy Policy</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-[#6B7280]">Last updated: April 21, 2026</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="prose prose-neutral max-w-none space-y-6 text-[15px] leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">1. Overview</h2>
            <p>
              {brand} explains in this policy how we collect, use, disclose, and safeguard information when you use our
              websites, newsletters, and related services.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">2. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Account and contact details you provide, such as name, email, and organization.</li>
              <li>Usage data such as pages viewed, approximate region, device type, and referral source.</li>
              <li>Communications you send through contact forms, newsletter forms, or support channels.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">3. How we use information</h2>
            <p>
              We use collected information to operate and improve the service, personalize content, send transactional
              messages, comply with law, and protect readers, contributors, and the publication.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">4. Sharing</h2>
            <p>
              We do not sell personal information. We may share data with contracted processors for hosting, analytics,
              email delivery, security, or when required by law.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">5. Retention &amp; security</h2>
            <p>
              We retain data only as long as needed for the purposes above and apply administrative, technical, and
              organizational safeguards appropriate to the risk.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">6. Your choices</h2>
            <p>
              You may access, correct, or delete certain information, or unsubscribe from marketing emails, using links
              in those messages or by contacting us.
            </p>
          </section>
          <section id="cookies">
            <h2 className="text-xl font-bold text-neutral-900">7. Cookies &amp; similar technologies</h2>
            <p>
              We use cookies and similar technologies to remember preferences, measure readership, and improve
              performance. You can control non-essential cookies through your browser.
            </p>
          </section>
          <section id="editorial">
            <h2 className="text-xl font-bold text-neutral-900">8. Editorial &amp; sourcing standards</h2>
            <p>
              {brand} maintains independence between commercial and editorial teams. Corrections are published promptly
              with clear attribution. Anonymous sourcing is used sparingly and only when the public interest justifies it
              and identity is verified internally.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">9. Contact</h2>
            <p>
              Questions about this policy:{' '}
              {privacyEmail ? (
                <a href={`mailto:${privacyEmail}`} className="font-semibold text-[#194890] hover:underline">
                  {privacyEmail}
                </a>
              ) : (
                'Use the contact page to reach the newsroom.'
              )}
            </p>
          </section>
        </div>
        <p className="mt-10 border-t border-[#E5E7EB] pt-8 text-center text-sm text-[#6B7280]">
          <Link to="/" className="font-semibold text-[#194890] hover:underline">
            Return to homepage
          </Link>
        </p>
      </article>
    </div>
  );
}
