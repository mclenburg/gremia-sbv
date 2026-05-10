import { describe, expect, it } from 'vitest';
import { applyPendingAnonymizationMarkers, classifyAnonymizationTarget, findFirstTextCommand, formatAnonymizationMarkerText, formatCaseReferenceText, formatLegalNormText, formatOpenTaskText, formatRiskText, getTextCommandArgument, getTextCommandRangeLength, replaceCommandMarker } from '../services/textCommandPolicy';

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

  it('merkt den mit ~~ markierten Freitext bis zur späteren Fallanonymisierung vor', () => {
    const text = 'Gespräch mit ~~ Max Mustermann\nNächste Zeile bleibt';
    const index = text.indexOf('~~');
    const argument = getTextCommandArgument(text, index, '~~');

    expect(argument).toBe('Max Mustermann');
    expect(getTextCommandRangeLength(text, index, '~~')).toBe('~~ Max Mustermann'.length);
    expect(classifyAnonymizationTarget(argument)).toBe('name');
    expect(formatAnonymizationMarkerText(argument)).toBe('[Anonymisierung vormerken: Max Mustermann]');
    expect(replaceCommandMarker(text, index, '~~', formatAnonymizationMarkerText(argument), getTextCommandRangeLength(text, index, '~~'))).toBe('Gespräch mit [Anonymisierung vormerken: Max Mustermann]\nNächste Zeile bleibt');
  });

  it('ersetzt vorgemerkte Anonymisierungsstellen erst beim späteren Lifecycle-Ereignis', () => {
    const text = 'Gespräch mit [Anonymisierung vormerken: Max Mustermann] und [Anonymisierung vormerken: P-12345].';
    expect(applyPendingAnonymizationMarkers(text)).toBe('Gespräch mit [anonymisiert] und [anonymisiert].');
    expect(applyPendingAnonymizationMarkers(null)).toBeNull();
  });

  it('klassifiziert typische zu anonymisierende Textarten als Zusatzinformation ohne Sofort-Anonymisierung', () => {
    expect(classifyAnonymizationTarget('max.mustermann@example.test')).toBe('email');
    expect(classifyAnonymizationTarget('Personalnummer P-12345')).toBe('personnel_number');
    expect(classifyAnonymizationTarget('Diagnose Depression')).toBe('health_detail');
    expect(classifyAnonymizationTarget('Team Personalservice')).toBe('organizational_unit');
    expect(formatAnonymizationMarkerText('max.mustermann@example.test')).toBe('[Anonymisierung vormerken: max.mustermann@example.test]');
    expect(formatAnonymizationMarkerText('Diagnose Depression')).toBe('[Anonymisierung vormerken: Diagnose Depression]');
  });
});
