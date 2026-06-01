import { describe, expect, it } from 'vitest';
import {
  applyPendingAnonymizationMarkers,
  classifyAnonymizationTarget,
  findFirstTextCommand,
  formatAnonymizationMarkerText,
  formatBemMarkerText,
  formatCaseReferenceText,
  formatConfidentialityText,
  formatContactReferenceText,
  formatEqualizationMarkerText,
  formatLegalNormText,
  formatOpenTaskText,
  formatParticipationMarkerText,
  formatPreventionMarkerText,
  formatRiskText,
  formatTemplateMarkerText,
  formatTerminationMarkerText,
  formatWorkplaceAccommodationMarkerText,
  getTextCommandArgument,
  getTextCommandRangeLength,
  isTextCommandAt,
  isTextCommandKind,
  primaryTokenForTextCommandKind,
  removeCommandMarker,
  replaceCommandMarker,
  tokensForTextCommandKind,
} from '../services/textCommandPolicy';

const nl = String.fromCharCode(10);

describe('text command policy branch coverage 0.9.2', () => {
  it('erkennt Kommandogrenzen, deaktivierte Kommandos und bevorzugt laengere Treffer am gleichen Index', () => {
    expect(isTextCommandAt('/frist 2026-06-15', 0, '/frist')).toBe(true);
    expect(isTextCommandAt('abc/frist 2026-06-15', 3, '/frist')).toBe(false);
    expect(isTextCommandAt('/fristig ist kein Befehl', 0, '/frist')).toBe(false);
    expect(isTextCommandAt('Bitte §§ § 178 SGB IX pruefen', 6, '§§')).toBe(true);

    expect(findFirstTextCommand('Text /frist 2026 und @@ Kontakt')).toMatchObject({ token: '/frist', index: 5 });
    expect(findFirstTextCommand('Text /frist 2026 und @@ Kontakt', ['/frist'])).toMatchObject({ token: '@@' });
    expect(findFirstTextCommand('ohne Kommando')).toBeNull();
    expect(findFirstTextCommand('/frist und // am Anfang')).toMatchObject({ token: '/frist', index: 0 });
  });

  it('liest Argumente, Reichweiten und ersetzt oder entfernt Marker stabil', () => {
    const value = `Protokoll /frist 2026-06-15 Rueckmeldung${nl}Danach weiter`;
    const index = value.indexOf('/frist');

    expect(getTextCommandArgument(value, index, '/frist')).toBe('2026-06-15 Rueckmeldung');
    expect(getTextCommandArgument('kein Treffer', 0, '/frist')).toBe('');
    expect(getTextCommandRangeLength(value, index, '/frist')).toBe('/frist'.length + 1 + '2026-06-15 Rueckmeldung'.length);
    expect(getTextCommandRangeLength('Bitte /frist', 6, '/frist')).toBe('/frist'.length);
    expect(replaceCommandMarker(value, index, '/frist', '[Frist angelegt]', getTextCommandRangeLength(value, index, '/frist'))).toContain('[Frist angelegt]');
    expect(replaceCommandMarker('Bitte /frist pruefen', 99, '/frist', '[Frist]')).toContain('[Frist]');
    expect(removeCommandMarker('Bitte /frist 2026 pruefen', 6, '/frist')).toBe('Bitte 2026 pruefen');
  });

  it('formatiert Markertexte mit Fallbacks und allen Bewertungszweigen', () => {
    expect(formatCaseReferenceText('SBV-1')).toBe('Fallbezug SBV-1');
    expect(formatCaseReferenceText('SBV-1', 'Musterfall')).toBe('Fallbezug SBV-1 (Musterfall)');
    expect(formatLegalNormText({ paragraph: '§ 178 Abs. 2 SGB IX', title: 'Beteiligung' })).toContain('Beteiligung');
    expect(formatRiskText('critical', '')).toBe('[Risiko: kritisch] Risiko vermerkt');
    expect(formatRiskText('high', 'Frist laeuft')).toBe('[Risiko: hoch] Frist laeuft');
    expect(formatRiskText('medium', 'Pruefen')).toBe('[Risiko: mittel] Pruefen');
    expect(formatRiskText('low', 'Ok')).toBe('[Risiko: niedrig] Ok');
    expect(formatOpenTaskText('')).toBe('Aufgabe offen: Nächsten Schritt klären');
    expect(formatConfidentialityText('hoch_sensibel')).toBe('[Vertraulichkeit: hoch sensibel]');
    expect(formatConfidentialityText('sensibel')).toBe('[Vertraulichkeit: sensibel]');
    expect(formatAnonymizationMarkerText('')).toContain('Textstelle prüfen');
    expect(formatTemplateMarkerText('')).toContain('Vorlage auswählen');
    expect(formatParticipationMarkerText('')).toContain('§ 178 Abs. 2 SGB IX');
    expect(formatWorkplaceAccommodationMarkerText('')).toContain('§ 164 Abs. 4 SGB IX');
    expect(formatBemMarkerText('')).toContain('Betriebliches Eingliederungsmanagement');
    expect(formatPreventionMarkerText('')).toContain('§ 167 Abs. 1 SGB IX');
    expect(formatEqualizationMarkerText('')).toContain('Gleichstellung oder GdB-Beratung');
    expect(formatTerminationMarkerText('')).toContain('Kündigungsanhörung prüfen');
  });

  it('klassifiziert Anonymisierungsziele und wendet vorgemerkte Marker an', () => {
    expect(classifyAnonymizationTarget('')).toBe('text_segment');
    expect(classifyAnonymizationTarget('person@example.test')).toBe('email');
    expect(classifyAnonymizationTarget('Personalnummer PNR 12345')).toBe('personnel_number');
    expect(classifyAnonymizationTarget('Diagnose Depression')).toBe('health_detail');
    expect(classifyAnonymizationTarget('Team Support')).toBe('organizational_unit');
    expect(classifyAnonymizationTarget('Fallakte Beteiligung')).toBe('case_reference');
    expect(classifyAnonymizationTarget('Ada Lovelace')).toBe('name');
    expect(classifyAnonymizationTarget('beliebige Textstelle')).toBe('text_segment');
    expect(applyPendingAnonymizationMarkers(null)).toBeNull();
    expect(applyPendingAnonymizationMarkers(undefined)).toBeUndefined();
    expect(applyPendingAnonymizationMarkers('A [Anonymisierung vormerken: Name] B')).toBe('A [anonymisiert] B');
  });

  it('liefert Token-Informationen und Kontakttexte in allen Fallback-Varianten', () => {
    expect(tokensForTextCommandKind('deadline')).toContain('/frist');
    expect(primaryTokenForTextCommandKind('template')).toBe('/vl');
    expect(isTextCommandKind('/frist', 'deadline')).toBe(true);
    expect(formatContactReferenceText({ firstName: 'Ada', lastName: 'Lovelace', organization: 'Agentur', role: 'Beratung', email: 'ada@example.test' })).toBe('Ada Lovelace – Agentur · Beratung <ada@example.test>');
    expect(formatContactReferenceText({ organization: 'Inklusionsamt' })).toBe('Kontakt – Inklusionsamt');
    expect(formatContactReferenceText({})).toBe('Kontakt');
  });
});
