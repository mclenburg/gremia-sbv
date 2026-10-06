import { describe, expect, it } from 'vitest';
import { CASE_SEARCH_PROVIDERS, caseSearchSourceLabels } from '../../../../services/search/searchProviders';

describe('Case search provider registry 0.9.1', () => {
  it('registriert strukturierte Fallaktenmodule und Dokumentquellen explizit', () => {
    const sourceTypes = CASE_SEARCH_PROVIDERS.map((provider) => provider.sourceType);

    expect(sourceTypes).toEqual(expect.arrayContaining([
      'case',
      'note',
      'document',
      'document_ocr',
      'measure_note',
      'bem',
      'prevention',
      'termination',
      'equalization',
      'participation',
      'measure',
      'measure_event',
      'workplace_accommodation',
    ]));
  });

  it('macht Suchtreffer fachlich benennbar', () => {
    const labels = caseSearchSourceLabels();

    expect(labels.document).toBe('Dokument');
    expect(labels.document_ocr).toBe('OCR-Text');
    expect(labels.measure_note).toBe('Maßnahmennotiz');
    expect(labels.workplace_accommodation).toBe('Arbeitsplatzgestaltung');
  });

  it('definiert jeden Provider ohne anonyme Seiteneffekt-Registrierung vollständig', () => {
    for (const provider of CASE_SEARCH_PROVIDERS) {
      expect(provider.sourceType).toBeTruthy();
      expect(provider.label).toBeTruthy();
      expect(Array.isArray(provider.requiredTables)).toBe(true);
      expect(typeof provider.collectAll).toBe('function');
      expect(typeof provider.collectForCase).toBe('function');
      expect(typeof provider.latestUpdatedAtAll).toBe('function');
      expect(typeof provider.latestUpdatedAtForCase).toBe('function');
    }
  });


});
