export type MarkdownHeading = {
  id: string;
  label: string;
  level: number;
};

export function markdownHeadingId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function extractHeadingsFromMarkdown(content: string, levels: number[] = [2]): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const allowed = new Set(levels);
  const re = /^(#{1,6})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const level = match[1]!.length;
    if (!allowed.has(level)) continue;
    const label = match[2]!.replace(/#+$/, '').trim();
    const id = markdownHeadingId(label);
    if (id) headings.push({ id, label, level });
  }
  return headings;
}
