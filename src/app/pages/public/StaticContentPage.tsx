import { Link, useParams } from 'react-router';
import StaticPageArticle from '../../components/public/StaticPageArticle';
import { useCms } from '../../context/cms-context';

export default function StaticContentPage() {
  const { slug } = useParams();
  const { state } = useCms();
  const page = state.pages.find((item) => item.slug === slug && item.status === 'PUBLISHED');

  if (page) return <StaticPageArticle page={page} fallbackTitle={page.title} />;

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#111827]">Page not found</h1>
        <p className="mt-3 text-sm text-[#6B7280]">This page is unpublished or does not exist in the CMS.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-[#194890] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2656A8]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
