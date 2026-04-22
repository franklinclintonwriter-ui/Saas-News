import { useMemo } from 'react';
import { useCms } from '../../context/cms-context';

type AdSlotProps = {
  placement: string;
  className?: string;
  fallbackSize?: string;
};

export default function AdSlot({ placement, className = '' }: AdSlotProps) {
  const { state } = useCms();
  const ad = useMemo(() => state.ads.find((item) => item.enabled && item.placement === placement), [state.ads, placement]);

  if (!ad) {
    return null;
  }

  const body = ad.html ? (
    <div className="min-h-56" dangerouslySetInnerHTML={{ __html: ad.html }} />
  ) : ad.imageUrl ? (
    <img src={ad.imageUrl} alt={ad.name} className="h-full w-full object-cover" />
  ) : (
    null
  );

  if (!body) return null;

  const content = (
    <div className={`overflow-hidden rounded-lg border border-[#E5E7EB] bg-white text-center ${className}`}>
      <p className="border-b border-[#E5E7EB] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{ad.label}</p>
      <div className="bg-[#F3F4F6]">{body}</div>
    </div>
  );

  if (ad.targetUrl) {
    return (
      <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" aria-label={ad.name}>
        {content}
      </a>
    );
  }

  return content;
}
