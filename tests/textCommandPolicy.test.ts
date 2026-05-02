import { describe, expect, it } from 'vitest';
import { findFirstTextCommand, formatCaseReferenceText, formatLegalNormText, formatOpenTaskText, formatRiskText, replaceCommandMarker } from '../services/textCommandPolicy';

describe('textCommandPolicy', () => {
  it('erkennt den ersten Inline-Befehl nach Position im Text', () => {
    expect(findFirstTextCommand('Text @@ Kontakt und // Frist')).toEqual({ token: '@@', index: 5 });
    expect(findFirstTextCommand('Text ## Fall und §§ Norm')).toEqual({ token: '##', index: 5 });
  });

  it('ersetzt nur den konkreten Befehlsmarker', () => {
    expect(replaceCommandMarker('Bitte ## prüfen', 6, '##', 'Fallbezug A-1')).toBe('Bitte Fallbezug A-1 prüfen');
  });

  it('formatiert strukturierte Textmarken lesbar', () => {
    expect(formatCaseReferenceText('SBV-17', 'Muster')).toBe('Fallbezug SBV-17 (Muster)');
    expect(formatLegalNormText({ paragraph: '§ 178 Abs. 2 SGB IX', title: 'SBV-Beteiligung' })).toBe('§ 178 Abs. 2 SGB IX – SBV-Beteiligung');
    expect(formatRiskText('critical', 'Kündigungsrisiko')).toBe('[Risiko: kritisch] Kündigungsrisiko');
    expect(formatOpenTaskText('Inklusionsamt nachfassen')).toBe('Aufgabe offen: Inklusionsamt nachfassen');
  });
});
