import { describe, expect, it } from 'vitest';
import PDFDocument from 'pdfkit';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { extractDocumentTextBestEffort } from '../../../../services/documents/documentTextExtractionService';
import { LocalTesseractOcrRunner } from '../../../../services/documents/documentOcrService';

async function mixedPdf(): Promise<Buffer> {
  const document = new PDFDocument({ autoFirstPage: false, compress: true });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => document.on('end', resolve));
  document.addPage().fontSize(20).text('Originaltext der Fallakte');
  GlobalFonts.registerFromPath('node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf', 'OCR Test');
  const canvas = createCanvas(700, 120);
  const context = canvas.getContext('2d');
  context.fillStyle = 'white';
  context.fillRect(0, 0, 700, 120);
  context.fillStyle = 'black';
  context.font = '44px OCR Test';
  context.fillText('Gescannter Bescheid', 15, 75);
  document.addPage().text('Seite 2').image(canvas.toBuffer('image/png'), 35, 60, { width: 500 });
  document.end();
  await finished;
  return Buffer.concat(chunks);
}

describe('Offline-PDF-Extraktion', () => {
  it('liest Textseiten nativ und OCRt nur Bildseiten mit gebündelten Sprachdaten', async () => {
    const buffer = await mixedPdf();
    const result = await extractDocumentTextBestEffort('gemischt.pdf', 'gemischt.pdf', buffer);
    expect(result.extractorId).toBe('pdf-text-layer');
    expect(result.text).toContain('Originaltext der Fallakte');
    expect(result.pdfPages?.map((page) => page.needsOcr)).toEqual([false, true]);

    const runner = new LocalTesseractOcrRunner();
    const ocr = await runner.run({ filename: 'gemischt.pdf', mime_type: 'application/pdf' } as never, buffer);
    expect(ocr.status).toBe('completed');
    expect(ocr.text).toMatch(/Gescannter Bescheid/i);
    expect(ocr.text).not.toContain('Originaltext');
  }, 60_000);

  it('rendert ein reines Text-PDF für OCR nicht', async () => {
    const document = new PDFDocument();
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve) => document.on('end', resolve));
    document.text('Vollständig lesbarer PDF Inhalt');
    document.end();
    await finished;
    const buffer = Buffer.concat(chunks);
    const extraction = await extractDocumentTextBestEffort('text.pdf', 'text.pdf', buffer);
    expect(extraction.pdfPages?.every((page) => !page.needsOcr)).toBe(true);
    const ocr = await new LocalTesseractOcrRunner().run({ filename: 'text.pdf', mime_type: 'application/pdf' } as never, buffer);
    expect(ocr.status).toBe('unsupported');
    expect(ocr.error).toMatch(/bereits Text/);
  });
});
