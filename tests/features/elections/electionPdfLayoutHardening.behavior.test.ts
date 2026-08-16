import { describe, expect, it } from 'vitest';
import { createSimpleTextPdf } from '../../../services/documents/simpleTextPdf';

describe('0.9.7-E PDF layout hardening', () => {
  it('paginates long election records instead of writing text below the physical page', () => {
    const lines = Array.from({ length: 140 }, (_, index) => `Wahlaktenzeile ${index + 1}: dokumentierter Verfahrensstand`);
    const pdf = createSimpleTextPdf('Gesamt-Wahlakte', lines).toString('ascii');

    expect(pdf).toMatch(/^%PDF-1\.4/);
    expect(pdf).toContain('/Count 3');
    expect(pdf).toContain('Wahlaktenzeile 1');
    expect(pdf).toContain('Wahlaktenzeile 140');
    expect(pdf).toMatch(/\/Type \/Page \/Parent 2 0 R/g);
    expect(pdf).toMatch(/%%EOF\n$/);
  });
});
