import React from 'react';
import { markdownHeadingId } from '../../lib/markdown';

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'image'; alt: string; src: string; caption?: string }
  | { type: 'code'; language?: string; code: string }
  | { type: 'divider' };

type Props = {
  content: string;
  className?: string;
  variant?: 'public' | 'admin';
};

function safeUrl(raw: string): string {
  const value = raw.trim();
  if (/^(https?:|data:image\/|\/)/i.test(value)) return value;
  return '';
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];

    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-bold text-[#0F172A]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={`${match.index}-code`} className="rounded bg-[#EEF2F7] px-1.5 py-0.5 text-[0.9em] font-semibold text-[#194890]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)]\(([^)]+)\)$/.exec(token);
      const href = safeUrl(link?.[2] ?? '');
      nodes.push(
        href ? (
          <a key={`${match.index}-link`} href={href} className="font-semibold text-[#194890] underline decoration-[#194890]/25 underline-offset-4" target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
            {link?.[1]}
          </a>
        ) : (
          token
        ),
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function cleanHeading(text: string): string {
  return text.replace(/#+$/, '').trim();
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph.length = 0;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      const language = trimmed.replace(/^```/, '').trim() || undefined;
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({ type: 'code', language, code: code.join('\n') });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = Math.min(6, heading[1]!.length);
      const text = cleanHeading(heading[2]!);
      blocks.push({ type: 'heading', level, text, id: markdownHeadingId(text) });
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    const image = /^!\[([^\]]*)]\(([^)]+)\)(?:\s+(.+))?$/.exec(trimmed);
    if (image) {
      flushParagraph();
      blocks.push({
        type: 'image',
        alt: image[1]?.trim() || 'Article image',
        src: safeUrl(image[2] ?? ''),
        caption: image[3]?.trim(),
      });
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quote.push((lines[i] ?? '').trim().replace(/^>\s?/, '').trim());
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'quote', text: quote.join(' ').replace(/\s+/g, ' ').trim() });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*]\s+/, '').trim());
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+[.)]\s+/, '').trim());
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'ol', items });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function headingClass(level: number, variant: Props['variant']): string {
  if (level === 1) return variant === 'admin' ? 'mt-8 text-4xl font-black tracking-tight text-[#0F172A]' : 'mt-8 text-4xl font-black tracking-tight text-[#111827]';
  if (level === 2) return 'mt-10 border-l-4 border-[#194890] pl-4 text-2xl font-black tracking-tight text-[#0F172A] md:text-3xl';
  if (level === 3) return 'mt-8 text-xl font-bold text-[#111827] md:text-2xl';
  return 'mt-6 text-lg font-bold text-[#111827]';
}

export function ArticleMarkdown({ content, className = '', variant = 'public' }: Props) {
  const blocks = React.useMemo(() => parseMarkdown(content), [content]);

  return (
    <article className={`max-w-none text-[#1F2937] ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = `h${block.level}` as React.ElementType;
          return (
            <Tag key={`${block.id}-${index}`} id={block.id} className={`${headingClass(block.level, variant)} scroll-mt-28`}>
              {parseInline(block.text)}
            </Tag>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote key={index} className="my-8 rounded-lg border-l-4 border-[#194890] bg-[#F8FAFC] px-6 py-5 shadow-sm">
              <p className="text-lg font-medium italic leading-relaxed text-[#334155]">{parseInline(block.text)}</p>
            </blockquote>
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type === 'ul' ? 'ul' : 'ol';
          return (
            <ListTag key={index} className={`my-6 space-y-3 rounded-lg border border-[#E5E7EB] bg-white px-6 py-5 text-lg leading-relaxed shadow-sm ${block.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-10`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1 marker:text-[#194890]">
                  {parseInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === 'image') {
          return block.src ? (
            <figure key={index} className="my-8 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
              <img src={block.src} alt={block.alt} className="aspect-[16/9] w-full object-cover" />
              {(block.caption || block.alt) && <figcaption className="px-4 py-3 text-sm text-[#64748B]">{block.caption || block.alt}</figcaption>}
            </figure>
          ) : null;
        }

        if (block.type === 'code') {
          return (
            <pre key={index} className="my-8 overflow-x-auto rounded-lg bg-[#0F172A] p-5 text-sm leading-relaxed text-[#E2E8F0]">
              {block.language && <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-[#93C5FD]">{block.language}</span>}
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'divider') {
          return <hr key={index} className="my-10 border-[#E5E7EB]" />;
        }

        return (
          <p key={index} className="my-5 text-lg leading-8 text-[#334155]">
            {parseInline(block.text)}
          </p>
        );
      })}
    </article>
  );
}
