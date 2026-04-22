import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import StaticPageArticle from '../../components/public/StaticPageArticle';

export default function TermsPage() {
  const { state } = useCms();
  const brand = state.settings.siteTitle || state.settings.organizationName || 'Publication';
  const legalEmail = state.settings.supportEmail || state.settings.contactEmail;
  const page = state.pages.find((item) => item.slug === 'terms' && item.status === 'PUBLISHED');
  if (page) return <StaticPageArticle page={page} fallbackTitle="Terms of Service" />;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[#6B7280]">
            <Link to="/" className="hover:text-[#194890]">
              Home
            </Link>
            <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />
            <span className="text-neutral-900">Terms of Service</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-[#6B7280]">Last updated: April 21, 2026</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="prose prose-neutral max-w-none space-y-6 text-[15px] leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">1. Agreement</h2>
            <p>
              By accessing {brand}, you agree to these terms and to our Privacy Policy. If you disagree, do not use the
              service.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">2. Use of content</h2>
            <p>
              Editorial content is protected by copyright and applicable law. Limited quoting with attribution may be
              permitted; redistribution requires permission unless otherwise stated.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">3. Accounts</h2>
            <p>You are responsible for safeguarding credentials and for activity under your account.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">4. Prohibited conduct</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Attempting to disrupt, scrape, or overload systems.</li>
              <li>Posting unlawful, harassing, or deceptive material in interactive areas.</li>
              <li>Misrepresenting affiliation with {brand}.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">5. Disclaimers</h2>
            <p>
              The service is provided as available to the maximum extent permitted by law. News reporting may contain
              errors; we welcome corrections and updates.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">6. Limitation of liability</h2>
            <p>
              To the extent permitted by law, {brand} is not liable for indirect or consequential damages arising from
              use of the service.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">7. Changes</h2>
            <p>We may update these terms; material changes will be communicated through the site where appropriate.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-neutral-900">8. Contact</h2>
            <p>
              Legal inquiries:{' '}
              {legalEmail ? (
                <a href={`mailto:${legalEmail}`} className="font-semibold text-[#194890] hover:underline">
                  {legalEmail}
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
