import { Link } from 'react-router';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-[#194890] mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Page Not Found</h2>
          <p className="text-[#6B7280] mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition font-semibold"
          >
            <Home size={20} />
            Go to Homepage
          </Link>
          <Link
            to="/search"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-[#E5E7EB] bg-white rounded-lg hover:bg-[#F3F4F6] transition font-semibold"
          >
            <Search size={20} />
            Search Articles
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-[#E5E7EB] bg-white rounded-lg hover:bg-[#F3F4F6] transition font-semibold"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 md:p-8">
          <h3 className="font-bold mb-4">Popular Sections</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'World', path: '/category/world' },
              { name: 'Politics', path: '/category/politics' },
              { name: 'Business', path: '/category/business' },
              { name: 'Technology', path: '/category/technology' },
              { name: 'Sports', path: '/category/sports' },
              { name: 'Entertainment', path: '/category/entertainment' },
            ].map((category) => (
              <Link
                key={category.name}
                to={category.path}
                className="px-4 py-2 border border-[#E5E7EB] rounded-lg hover:border-[#194890] hover:bg-[#194890] hover:text-white transition text-sm font-semibold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
