import { describe, expect, it } from 'vitest';
import { buildFallbackTemplateContext, extractPlaceholders, normalizeTemplateKey, renderTemplateText } from '../services/templatePolicy';

describe('templatePolicy', () => {
  it('ersetzt bekannte Platzhalter und lässt unbekannte Platzhalter sichtbar', () => {
    const result = renderTemplateText('Aktenzeichen {{fall.aktenzeichen}}, offen {{unbekannt}}.', {
      'fall.aktenzeichen': 'SBV-2026-17'
    });

    expect(result.text).toBe('Aktenzeichen SBV-2026-17, offen {{unbekannt}}.');
    expect(result.unresolvedPlaceholders).toEqual(['unbekannt']);
  });

  it('extrahiert Platzhalter eindeutig und sortiert', () => {
    expect(extractPlaceholders('{{frist.datum}} und {{fall.aktenzeichen}} und {{frist.datum}}')).toEqual([
      'fall.aktenzeichen',
      'frist.datum'
    ]);
  });

  it('normalisiert Vorlagenschlüssel robust', () => {
    expect(normalizeTemplateKey('SBV-Beteiligung / Unterlagen nachfordern!')).toBe('sbv-beteiligung-unterlagen-nachfordern');
  });

  it('liefert deutsche Standardkontexte für Durchweg-wirksam-Vorlagen', () => {
    const context = buildFallbackTemplateContext(new Date('2026-05-02T12:00:00.000Z'));
    expect(context['sbv.bezeichnung']).toBe('Schwerbehindertenvertretung');
    expect(context['arbeitgeber.ansprechpartner']).toBe('Personalabteilung');
    expect(context.heute).toMatch(/2\.5\.2026|02\.05\.2026/);
  });
});
