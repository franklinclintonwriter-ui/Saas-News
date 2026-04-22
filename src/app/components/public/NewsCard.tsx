import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import { generatedPostImageDataUrl } from '../../lib/generated-post-image';

interface NewsCardProps {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl?: string;
  excerpt?: string;
  featured?: boolean;
}

export default function NewsCard({ id, title, category, date, imageUrl, excerpt, featured }: NewsCardProps) {
  const resolvedImageUrl = imageUrl || generatedPostImageDataUrl(title, category, id);

  if (featured) {
    return (
      <Link to={`/article/${id}`} className="block group">
        <div className="relative h-[400px] rounded-lg overflow-hidden mb-4">
          <img
            src={resolvedImageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <div className="absolute top-4 left-4">
            <span className="bg-[#194890] text-white px-3 py-1 text-sm rounded">{category}</span>
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-3 group-hover:text-[#194890] transition">{title}</h2>
        {excerpt && <p className="text-[#6B7280] mb-3">{excerpt}</p>}
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Clock size={14} />
          <span>{date}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/article/${id}`} className="block group">
      <div className="bg-white rounded-lg overflow-hidden border border-[#E5E7EB] hover:shadow-lg transition">
        <div className="relative h-48 overflow-hidden">
          <img
            src={resolvedImageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className="bg-[#194890] text-white px-2 py-1 text-xs rounded">{category}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 group-hover:text-[#194890] transition line-clamp-2">{title}</h3>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Clock size={12} />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
