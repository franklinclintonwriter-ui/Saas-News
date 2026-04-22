import { useMemo } from 'react';
import { Link } from 'react-router';
import { useCms } from '../../context/cms-context';
import { publishedPosts } from '../../lib/public-content';

export default function BreakingNews() {
  const { state } = useCms();

  const breaking = useMemo(() => publishedPosts(state.posts).find((p) => p.breaking), [state.posts]);

  if (!breaking) return null;

  const dek = breaking.excerpt || breaking.title;

  return (
    <div className="bg-[#111827] text-white">
      <Link
        to={`/article/${breaking.id}`}
        className="max-w-[1440px] mx-auto px-4 py-3 flex items-start md:items-center gap-3 md:gap-4 transition hover:bg-white/5"
      >
        <span className="bg-[#DC2626] px-2 md:px-3 py-1 text-xs md:text-sm font-semibold rounded flex-shrink-0">BREAKING</span>
        <p className="text-xs md:text-sm line-clamp-2 md:line-clamp-1 text-left">
          <span className="font-semibold text-white/95">{breaking.title}</span>
          {dek !== breaking.title ? <span className="text-white/80"> — {dek}</span> : null}
        </p>
      </Link>
    </div>
  );
}
