function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapTitle(value: string): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= 28) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return (lines.length ? lines : ['Untitled story']).slice(0, 3);
}

function seedNumber(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function generatedPostImageDataUrl(title: string, category: string, seed: string): string {
  const palettes = [
    ['#194890', '#DC2626', '#F8FAFC'],
    ['#0F766E', '#F59E0B', '#F8FAFC'],
    ['#111827', '#2563EB', '#F8FAFC'],
    ['#7C2D12', '#10B981', '#FFF7ED'],
    ['#4338CA', '#EC4899', '#F8FAFC'],
    ['#164E63', '#22C55E', '#ECFEFF'],
  ] as const;
  const [background, accent, foreground] = palettes[seedNumber(seed) % palettes.length]!;
  const titleLines = wrapTitle(title)
    .map((line, index) => `<tspan x="90" dy="${index === 0 ? 0 : 78}">${escapeSvgText(line)}</tspan>`)
    .join('');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">',
    `<rect width="1200" height="800" fill="${background}"/>`,
    `<rect x="64" y="64" width="1072" height="672" rx="34" fill="${foreground}" opacity="0.10"/>`,
    `<rect x="0" y="610" width="1200" height="190" fill="${accent}" opacity="0.94"/>`,
    `<circle cx="1010" cy="168" r="88" fill="${accent}" opacity="0.92"/>`,
    `<circle cx="1090" cy="250" r="42" fill="${foreground}" opacity="0.18"/>`,
    `<text x="90" y="150" fill="${foreground}" font-family="Georgia,serif" font-size="38" font-weight="700" letter-spacing="2">${escapeSvgText(category.toUpperCase())}</text>`,
    `<text x="90" y="320" fill="${foreground}" font-family="Georgia,serif" font-size="66" font-weight="700">${titleLines}</text>`,
    `<text x="90" y="685" fill="${foreground}" font-family="Arial,sans-serif" font-size="30" opacity="0.9">Generated editorial image</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
