import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useCms } from '../../context/cms-context';

type AdSlotProps = {
  placement: string;
  className?: string;
  fallbackSize?: string;
};

const AD_SANITIZE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'meta', 'link'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
};

export default function AdSlot({ placement, className = '' }: AdSlotProps) {
  const { state } = useCms();
  const ad = useMemo(() => state.ads.find((item) => item.enabled && item.placement === placement), [state.ads, placement]);
  const safeHtml = useMemo(() => (ad?.html ? DOMPurify.sanitize(ad.html, AD_SANITIZE_CONFIG) : ''), [ad?.html]);

  if (!ad) {
    return null;
  }

  const body = safeHtml ? (
    <div className="min-h-56" dangerouslySetInnerHTML={{ __html: safeHtml }} />
  ) : ad.imageUrl ? (
    <img src={ad.imageUrl} alt={ad.name || 'Advertisement'} loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
