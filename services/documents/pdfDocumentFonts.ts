import { createRequire } from 'node:module';
import path from 'node:path';
import type PDFKit from 'pdfkit';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';

export const PDF_FONT_REGULAR = 'DejaVuSans';
export const PDF_FONT_BOLD = 'DejaVuSans-Bold';

type PdfFontWeight = 'regular' | 'bold';
type PdfTextOptions = PDFKit.Mixins.TextOptions;

interface FontCoverage {
  hasGlyphForCodePoint(codePoint: number): boolean;
}

interface FontkitModule {
  openSync(filePath: string): FontCoverage;
}

let regularFontCoverage: FontCoverage | undefined;

function packageRequire(): NodeRequire {
  const base = typeof __filename === 'string'
    ? __filename
    : path.join(process.cwd(), 'services', 'documents', 'pdfDocumentFonts.js');
  return createRequire(base);
}

export function registerPdfFonts(document: PDFKit.PDFDocument): void {
  const resolve = packageRequire().resolve;
  document.registerFont(PDF_FONT_REGULAR, resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
  document.registerFont(PDF_FONT_BOLD, resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf'));
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

export function drawPdfUnicodeText(
  document: PDFKit.PDFDocument,
  text: string,
  weight: PdfFontWeight,
  options: PdfTextOptions,
  x?: number,
  y?: number,
): void {
  assertFontSupports(text);
  document.font(weight === 'bold' ? PDF_FONT_BOLD : PDF_FONT_REGULAR);
  if (x !== undefined && y !== undefined) document.text(text, x, y, options);
  else document.text(text, options);
}
