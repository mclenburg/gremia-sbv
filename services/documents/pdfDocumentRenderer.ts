import { createRequire } from 'node:module';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  paragraph,
  section,
  spacer,
  type PdfBlock,
  type PdfDocumentDefinition,
  type PdfScalar,
} from './pdfDocumentDefinition';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';

export {
  list,
  metricCards,
  paragraph,
  reportDocument,
  section,
  spacer,
  table,
  type PdfBlock,
  type PdfDocumentDefinition,
  type PdfScalar,
} from './pdfDocumentDefinition';

const COLORS = {
  ink: '#1f2933',
  muted: '#4b5c6d',
  accent: '#7c5700',
  accentBorder: '#b58500',
  surface: '#f8fafc',
  border: '#c7ced6',
  warningBackground: '#fff7d6',
  warningInk: '#5c4300',
  successBackground: '#eef8ec',
  successInk: '#234b22',
} as const;

const FONT_REGULAR = 'DejaVuSans';
const FONT_BOLD = 'DejaVuSans-Bold';
const CONTENT_WIDTH = 495;

type PdfFontWeight = 'regular' | 'bold';
type PdfTextOptions = PDFKit.Mixins.TextOptions;

interface FontCoverage {
  hasGlyphForCodePoint(codePoint: number): boolean;
}

interface FontkitModule {
  openSync(filePath: string): FontCoverage;
}

let regularFontCoverage: FontCoverage | undefined;

type AccessiblePdfDocumentOptions = Omit<PDFKit.PDFDocumentOptions, 'subset'> & {
  subset: PDFKit.Mixins.PDFSubsets | 'PDF/UA';
};

function packageRequire(): NodeRequire {
  const base = typeof __filename === 'string'
    ? __filename
    : path.join(process.cwd(), 'services', 'documents', 'pdfDocumentRenderer.js');
  return createRequire(base);
}

function registerFonts(document: PDFKit.PDFDocument): void {
  const resolve = packageRequire().resolve;
  document.registerFont(FONT_REGULAR, resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
  document.registerFont(FONT_BOLD, resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf'));
}

function assertFontSupports(text: string): void {
  const require = packageRequire();
  regularFontCoverage ??= (require('fontkit') as FontkitModule)
    .openSync(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
  for (const character of text) {
    if (character === '\n' || character === '\r' || character === '\t') continue;
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (!regularFontCoverage.hasGlyphForCodePoint(codePoint)) {
      throw new ApplicationError(
        'EXPORT_FAILED',
        `PDF-Dokument enthält ein nicht unterstütztes Unicode-Zeichen U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}.`,
      );
    }
  }
}

function drawUnicodeText(
  document: PDFKit.PDFDocument,
  text: string,
  weight: PdfFontWeight,
  options: PdfTextOptions,
  x?: number,
  y?: number,
): void {
  assertFontSupports(text);
  document.font(weight === 'bold' ? FONT_BOLD : FONT_REGULAR);
  if (x !== undefined && y !== undefined) document.text(text, x, y, options);
  else document.text(text, options);
}

function addStructuredText(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  tag: string,
  text: string,
  draw: () => void,
): void {
  parent.add(document.struct(tag, { actual: `${text} ` }, draw));
}

function drawParagraph(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  text: string,
): void {
  addStructuredText(document, parent, 'P', text, () => {
    document
      .fontSize(10)
      .fillColor(COLORS.ink);
    drawUnicodeText(document, `${text} `, 'regular', { width: CONTENT_WIDTH, lineGap: 2, paragraphGap: 6 });
  });
}

function drawTable(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  block: Extract<PdfBlock, { type: 'table' }>,
): void {
  if (!block.rows.length) {
    drawParagraph(document, parent, block.empty);
    return;
  }

  const tableStructure = document.struct('Table');
  parent.add(tableStructure);
  const columnCount = block.headers.length;
  const columnWidth = CONTENT_WIDTH / columnCount;
  const padding = 6;

  const rowHeight = (cells: readonly PdfScalar[], bold: boolean): number => {
    document.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(bold ? 8 : 8.5);
    return Math.max(
      ...cells.map((cell) => document.heightOfString(String(cell), {
        width: columnWidth - (2 * padding),
        lineGap: 1,
      })),
      10,
    ) + (2 * padding);
  };

  const drawRow = (cells: readonly PdfScalar[], header: boolean): void => {
    const height = rowHeight(cells, header);
    const maximumY = document.page.height - document.page.margins.bottom;
    if (document.y + height > maximumY) {
      document.addPage();
      if (!header) drawRow(block.headers, true);
    }
    const rowY = document.y;
    const rowStructure = document.struct('TR');
    tableStructure.add(rowStructure);

    document.markContent('Artifact', { type: 'Layout' });
    cells.forEach((_cell, columnIndex) => {
      const x = document.page.margins.left + (columnIndex * columnWidth);
      document
        .rect(x, rowY, columnWidth, height)
        .fillAndStroke(header ? '#e9edf2' : '#ffffff', COLORS.border);
    });
    document.endMarkedContent();

    cells.forEach((cell, columnIndex) => {
      const text = String(cell);
      const x = document.page.margins.left + (columnIndex * columnWidth);
      const cellStructure = document.struct(header ? 'TH' : 'TD', { actual: `${text} ` }, () => {
        document
          .fontSize(header ? 8 : 8.5)
          .fillColor(header ? COLORS.accent : COLORS.ink);
        drawUnicodeText(document, `${text} `, header ? 'bold' : 'regular', {
          width: columnWidth - (2 * padding),
          height: height - (2 * padding),
          lineGap: 1,
        }, x + padding, rowY + padding);
      });
      rowStructure.add(cellStructure);
    });
    rowStructure.end();
    document.x = document.page.margins.left;
    document.y = rowY + height;
  };

  drawRow(block.headers, true);
  for (const row of block.rows) drawRow(row, false);
  tableStructure.end();
  document.moveDown(0.8);
}

function drawMetrics(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  entries: Array<[string, PdfScalar]>,
): void {
  const rows: PdfScalar[][] = [];
  for (let index = 0; index < entries.length; index += 2) {
    const first = entries[index];
    const second = entries[index + 1];
    rows.push(second ? [first[0], first[1], second[0], second[1]] : [first[0], first[1], '', '']);
  }
  drawTable(document, parent, {
    type: 'table',
    headers: ['Kennzahl', 'Wert', 'Kennzahl', 'Wert'],
    rows,
    empty: 'Keine Kennzahlen vorhanden.',
  });
}

function drawBlock(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  block: PdfBlock,
): void {
  switch (block.type) {
    case 'paragraph':
      drawParagraph(document, parent, block.text);
      return;
    case 'list': {
      const listStructure = document.struct('L');
      parent.add(listStructure);
      for (const item of block.items) {
        const itemStructure = document.struct('LI');
        listStructure.add(itemStructure);
        drawParagraph(document, itemStructure, `• ${item}`);
      }
      listStructure.end();
      return;
    }
    case 'table':
      drawTable(document, parent, block);
      return;
    case 'metrics':
      drawMetrics(document, parent, block.entries);
      return;
    case 'section': {
      document.moveDown(0.35);
      const sectionStructure = document.struct('Sect', { title: block.title });
      parent.add(sectionStructure);
      addStructuredText(document, sectionStructure, 'H2', block.title, () => {
        document
          .fontSize(13)
          .fillColor(COLORS.accent);
        drawUnicodeText(document, `${block.title} `, 'bold', { width: CONTENT_WIDTH, paragraphGap: 6 });
      });
      for (const child of block.blocks) drawBlock(document, sectionStructure, child);
      sectionStructure.end();
      return;
    }
    case 'spacer':
      document.y += block.height;
  }
}

function drawHeader(
  document: PDFKit.PDFDocument,
  root: PDFKit.PDFStructureElement,
  definition: PdfDocumentDefinition,
): void {
  document.markContent('Artifact', { type: 'Layout' });
  document
    .roundedRect(50, 48, CONTENT_WIDTH, definition.subtitle || definition.classification ? 116 : 74, 3)
    .fillAndStroke(COLORS.surface, COLORS.border);
  document.rect(50, 48, 7, definition.subtitle || definition.classification ? 116 : 74).fill(COLORS.accentBorder);
  document.endMarkedContent();
  document.x = 70;
  document.y = 64;

  addStructuredText(document, root, 'H1', definition.title, () => {
    document
      .fontSize(21)
      .fillColor('#111827');
    drawUnicodeText(document, `${definition.title} `, 'bold', { width: 455, lineGap: 1 });
  });
  if (definition.subtitle) {
    addStructuredText(document, root, 'P', definition.subtitle, () => {
      document
        .fontSize(10)
        .fillColor(COLORS.muted);
      drawUnicodeText(document, `${definition.subtitle} `, 'regular', { width: 455, paragraphGap: 4 });
    });
  }
  if (definition.classification) {
    addStructuredText(document, root, 'P', definition.classification, () => {
      document
        .fontSize(9)
        .fillColor(COLORS.accent);
      drawUnicodeText(document, `${definition.classification} `, 'bold', { width: 455, paragraphGap: 4 });
    });
  }
  document.x = 50;
  document.y = definition.subtitle || definition.classification ? 180 : 138;
}

function drawWarnings(
  document: PDFKit.PDFDocument,
  root: PDFKit.PDFStructureElement,
  warnings: readonly string[],
): void {
  const title = warnings.length ? 'Prüfhinweise' : 'Prüfstatus';
  const messages = warnings.length
    ? [...warnings]
    : ['Keine Auffälligkeiten in dieser Prüfung.'];
  const warningSection = document.struct('Sect', { title });
  root.add(warningSection);
  addStructuredText(document, warningSection, 'H2', title, () => {
    document
      .fontSize(12)
      .fillColor(warnings.length ? COLORS.warningInk : COLORS.successInk);
    drawUnicodeText(document, `${title} `, 'bold', { width: CONTENT_WIDTH, paragraphGap: 5 });
  });
  for (const message of messages) {
    addStructuredText(document, warningSection, 'P', message, () => {
      document
        .fontSize(9.5)
        .fillColor(warnings.length ? COLORS.warningInk : COLORS.successInk);
      drawUnicodeText(document, `${warnings.length ? 'Hinweis: ' : 'Status: '}${message} `, 'regular', {
        width: CONTENT_WIDTH,
        paragraphGap: 5,
      });
    });
  }
  warningSection.end();
}

function addPageFooters(document: PDFKit.PDFDocument, footer: string): void {
  const range = document.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    const originalBottomMargin = document.page.margins.bottom;
    document.page.margins.bottom = 0;
    document.markContent('Artifact', { type: 'Pagination', attached: ['Bottom'] });
    document
      .font(FONT_REGULAR)
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        `${footer} · Seite ${index - range.start + 1} von ${range.count}`,
        50,
        812,
        { width: CONTENT_WIDTH, align: 'center', lineBreak: false },
      );
    document.endMarkedContent();
    document.page.margins.bottom = originalBottomMargin;
  }
}

export function createPdfDocument(definition: PdfDocumentDefinition): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const options: AccessiblePdfDocumentOptions = {
      size: 'A4',
      margins: { top: 50, right: 50, bottom: 64, left: 50 },
      bufferPages: true,
      compress: true,
      pdfVersion: '1.7',
      tagged: true,
      subset: 'PDF/UA',
      lang: 'de-DE',
      displayTitle: true,
      info: {
        Title: definition.title,
        Author: 'Gremia.SBV',
        Subject: definition.classification ?? 'SBV-Dokument',
        Creator: 'Gremia.SBV mit PDFKit',
      },
    };
    // PDFKit 0.19 unterstützt PDF/UA; die separat veröffentlichten Typen führen
    // diesen Wert noch nicht in PDFSubsets. Die Anpassung bleibt an der Bibliotheksgrenze.
    const document = new PDFDocument(options as PDFKit.PDFDocumentOptions);

    document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    registerFonts(document);
    const root = document.struct('Document', { lang: 'de-DE', title: definition.title });
    document.addStructure(root);
    drawHeader(document, root, definition);
    for (const block of definition.blocks) drawBlock(document, root, block);
    if (definition.warnings) drawWarnings(document, root, definition.warnings);
    root.end();
    addPageFooters(document, definition.footer ?? 'Offline erzeugt durch Gremia.SBV.');
    document.end();
  });
}

function isSectionHeading(line: string): boolean {
  const letters = line.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
  return letters.length > 2 && line.length <= 90 && line === line.toLocaleUpperCase('de-DE');
}

export function createAccessibleTextPdf(title: string, lines: readonly string[]): Promise<Buffer> {
  const blocks: PdfBlock[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      blocks.push(spacer());
    } else if (isSectionHeading(line)) {
      blocks.push(section(line, []));
    } else {
      blocks.push(paragraph(line));
    }
  }
  return createPdfDocument({
    title,
    subtitle: 'Gremia.SBV Wahldokument',
    classification: 'Intern vertraulich',
    blocks,
    footer: 'Offline erzeugt durch Gremia.SBV. Vertraulich behandeln.',
  });
}
