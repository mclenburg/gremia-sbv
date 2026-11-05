import { describe, expect, it } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createPdfDocument, externalReportDocument, paragraph } from '../../../services/documents/pdfDocumentRenderer';

describe('PDF-Kopf mit langem Titel', () => {
  it('hält alle Titelzeilen im Titelkasten und beginnt den Inhalt darunter', async () => {
    const title = 'Information zur Verarbeitung personenbezogener Daten durch die Schwerbehindertenvertretung';
    const body = 'Erster Absatz nach Titel';
    const buffer = await createPdfDocument(externalReportDocument(title, '', [paragraph(body)]));
    const task = getDocument({ data: new Uint8Array(buffer) });
    try {
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      const operations = await page.getOperatorList();
      const headerPathIndex = operations.fnArray.findIndex((operator) => operator === OPS.constructPath);
      expect(headerPathIndex).toBeGreaterThanOrEqual(0);
      const headerBounds = operations.argsArray[headerPathIndex][2] as Float32Array;
      const boxBottom = page.view[3] - headerBounds[3];
      const content = await page.getTextContent();
      const lines = content.items.filter((item): item is typeof item & { str: string; transform: number[] } => 'str' in item && 'transform' in item && Boolean(item.str));
      const titleLines = lines.filter((item) => item.str !== body && item.str !== 'Seite 1 von 1');
      const firstBodyLine = lines.find((item) => item.str === body);
      expect(titleLines.length).toBeGreaterThan(1);
      expect(firstBodyLine).toBeDefined();
      expect(Math.min(...titleLines.map((item) => item.transform[5]))).toBeGreaterThan(boxBottom + 4);
      expect(firstBodyLine!.transform[5]).toBeLessThan(boxBottom - 8);
    } finally {
      await task.destroy();
    }
  });
});
