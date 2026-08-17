import { describe, expect, it } from 'vitest';
import { createAccessibleTextPdf } from '../../../services/documents/pdfDocumentRenderer';
import { inspectPdf } from '../../helpers/pdf';

describe('0.9.7-E PDF layout hardening', () => {
  it('paginates long election records and exposes a German logical reading structure', async () => {
    const lines = Array.from({ length: 140 }, (_, index) => `Wahlaktenzeile ${index + 1}: dokumentierter Verfahrensstand`);
    const pdf = await createAccessibleTextPdf('Gesamt-Wahlakte', lines);
    const inspected = await inspectPdf(pdf);

    expect(inspected.pageCount).toBeGreaterThan(1);
    expect(inspected.textByPage[0]).toContain('Wahlaktenzeile 1: dokumentierter Verfahrensstand');
    expect(inspected.textByPage.at(-1)).toContain('Wahlaktenzeile 140: dokumentierter Verfahrensstand');
    expect(inspected.title).toBe('Gesamt-Wahlakte');
    expect(inspected.language).toBe('de-DE');
    expect(inspected.hasStructureTree).toBe(true);
  });
});
