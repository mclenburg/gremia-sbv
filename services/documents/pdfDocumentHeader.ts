import type { PdfDocumentDefinition } from './pdfDocumentDefinition.js';
import {
  drawPdfUnicodeText as drawUnicodeText,
  PDF_FONT_BOLD as FONT_BOLD,
  PDF_FONT_REGULAR as FONT_REGULAR,
} from './pdfDocumentFonts.js';
import { addStructuredText } from './pdfDocumentStructure.js';

interface HeaderStyle {
  readonly surface: string;
  readonly border: string;
  readonly accentBorder: string;
  readonly muted: string;
  readonly accent: string;
}

export function drawPdfHeader(
  document: PDFKit.PDFDocument,
  root: PDFKit.PDFStructureElement,
  definition: PdfDocumentDefinition,
  style: HeaderStyle,
  contentWidth: number,
): void {
  const textWidth = contentWidth - 40;
  const titleHeight = document.font(FONT_BOLD).fontSize(21)
    .heightOfString(`${definition.title} `, { width: textWidth, lineGap: 1 });
  const subtitleHeight = definition.subtitle
    ? document.font(FONT_REGULAR).fontSize(10).heightOfString(`${definition.subtitle} `, { width: textWidth }) + 4
    : 0;
  const classificationHeight = definition.classification
    ? document.font(FONT_BOLD).fontSize(9).heightOfString(`${definition.classification} `, { width: textWidth }) + 4
    : 0;
  const headerHeight = Math.max(
    definition.subtitle || definition.classification ? 116 : 74,
    16 + titleHeight + subtitleHeight + classificationHeight + 16,
  );
  document.markContent('Artifact', { type: 'Layout' });
  document.roundedRect(50, 48, contentWidth, headerHeight, 3).fillAndStroke(style.surface, style.border);
  document.rect(50, 48, 7, headerHeight).fill(style.accentBorder);
  document.endMarkedContent();
  document.x = 70;
  document.y = 64;

  addStructuredText(document, root, 'H1', definition.title, () => {
    document.fontSize(21).fillColor('#111827');
    drawUnicodeText(document, `${definition.title} `, 'bold', { width: textWidth, lineGap: 1 });
  });
  if (definition.subtitle) {
    addStructuredText(document, root, 'P', definition.subtitle, () => {
      document.fontSize(10).fillColor(style.muted);
      drawUnicodeText(document, `${definition.subtitle} `, 'regular', { width: textWidth, paragraphGap: 4 });
    });
  }
  if (definition.classification) {
    addStructuredText(document, root, 'P', definition.classification, () => {
      document.fontSize(9).fillColor(style.accent);
      drawUnicodeText(document, `${definition.classification} `, 'bold', { width: textWidth, paragraphGap: 4 });
    });
  }
  document.x = 50;
  document.y = 48 + headerHeight + 16;
}
