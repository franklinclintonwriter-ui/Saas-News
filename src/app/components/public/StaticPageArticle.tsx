import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import type { StaticPage } from '../../lib/admin/cms-state';

function renderInline(text: string): string {
  return text.trim();
}

export default function StaticPageArticle({ page, fallbackTitle }: { page: StaticPage; fallbackTitle: string }) {
  const blocks = page.content.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[#6B7280]">
            <Link to="/" className="hover:text-[#194890]">
              Home
            </Link>
            <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />
            <span className="text-neutral-900">{fallbackTitle}</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">{page.title}</h1>
          {page.excerpt && <p className="mt-3 text-base leading-relaxed text-[#6B7280]">{page.excerpt}</p>}
          <p className="mt-3 text-sm text-[#6B7280]">Last updated: {new Date(page.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-6 text-[15px] leading-relaxed text-neutral-700">
          {blocks.map((block, index) => {
            if (block.startsWith('## ')) {
              return <h2 key={index} className="text-xl font-bold text-neutral-900">{renderInline(block.slice(3))}</h2>;
            }
            const lines = block.split('\n').filter(Boolean);
            if (lines.length && lines.every((line) => /^[-*]\s+/.test(line))) {
              return (
                <ul key={index} className="list-disc space-y-2 pl-5">
                  {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s+/, ''))}</li>)}
                </ul>
              );
            }
            return <p key={index}>{renderInline(block)}</p>;
          })}
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
