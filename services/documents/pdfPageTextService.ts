import { createCanvas } from '@napi-rs/canvas';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfPageText {
  pageNumber: number;
  text: string;
  needsOcr: boolean;
}

const MAX_PAGES = 500;
const MAX_PIXELS = 16_000_000;

/** Read the PDF text layer page by page. No page is rasterized here. */
export async function readPdfPages(buffer: Buffer): Promise<PdfPageText[]> {
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  try {
    const pdf = await task.promise;
    try {
      if (pdf.numPages > MAX_PAGES) throw new Error('PDF überschreitet die zulässige Seitenzahl.');
      const pages: PdfPageText[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        try {
          const content = await page.getTextContent();
          const text = content.items.flatMap((item) => 'str' in item ? [item.str] : [])
            .join(' ').replace(/\s+/g, ' ').trim();
          const hasUsableText = /[\p{L}\p{N}]{3}/u.test(text);
          const hasImageWithOnlySparseText = hasUsableText && text.length < 80
            && (await page.getOperatorList()).fnArray.some((operation) =>
              operation === OPS.paintImageXObject || operation === OPS.paintInlineImageXObject
              || operation === OPS.paintImageMaskXObject);
          pages.push({ pageNumber, text: text.slice(0, 300_000), needsOcr: !hasUsableText || hasImageWithOnlySparseText });
        } finally {
          page.cleanup();
        }
      }
      return pages;
    } finally {
      await pdf.cleanup();
    }
  } finally {
    await task.destroy();
  }
}

/** Render only the selected page for local OCR. */
export async function renderPdfPageForOcr(buffer: Buffer, pageNumber: number): Promise<Buffer> {
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  try {
    const pdf = await task.promise;
    try {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages || pdf.numPages > MAX_PAGES) {
        throw new Error('Ungültige PDF-Seite für OCR.');
      }
      const page = await pdf.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 2 });
        if (viewport.width * viewport.height > MAX_PIXELS) throw new Error('PDF-Seite ist für OCR zu groß.');
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvas: canvas as never, canvasContext: canvas.getContext('2d') as never, viewport }).promise;
        return canvas.toBuffer('image/png');
      } finally {
        page.cleanup();
      }
    } finally {
      await pdf.cleanup();
    }
  } finally {
    await task.destroy();
  }
}
