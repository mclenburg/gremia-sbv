const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 54;
const LINE_HEIGHT = 15;
const FONT_SIZE = 10;
const MAX_CHARS = 88;
const MAX_LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - (2 * MARGIN)) / LINE_HEIGHT);

function transliterateGerman(value: string): string {
  return value
    .replace(/Ä(?=[A-ZÄÖÜ])/g, 'AE')
    .replace(/Ö(?=[A-ZÄÖÜ])/g, 'OE')
    .replace(/Ü(?=[A-ZÄÖÜ])/g, 'UE')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

function pdfText(value: string): string {
  return transliterateGerman(value)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(value: string): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_CHARS) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pageStream(lines: readonly string[]): string {
  const chunks = ['BT', `/F1 ${FONT_SIZE} Tf`, `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`];
  lines.forEach((line, index) => {
    if (index) chunks.push(`0 -${LINE_HEIGHT} Td`);
    chunks.push(`(${pdfText(line)}) Tj`);
  });
  chunks.push('ET');
  return chunks.join('\n');
}

function paginate(title: string, lines: readonly string[]): string[][] {
  const wrapped = [title, '', ...lines].flatMap(wrap);
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += MAX_LINES_PER_PAGE) {
    pages.push(wrapped.slice(index, index + MAX_LINES_PER_PAGE));
  }
  return pages.length ? pages : [[title]];
}

export function createSimpleTextPdf(title: string, lines: readonly string[]): Buffer {
  const pages = paginate(title, lines);
  const pageObjectIds = pages.map((_, index) => 3 + (index * 2));
  const contentObjectIds = pages.map((_, index) => 4 + (index * 2));
  const fontObjectId = 3 + (pages.length * 2);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ];

  pages.forEach((pageLines, index) => {
    const content = pageStream(pageLines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`,
      `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
    );
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}
