import { describe, expect, it } from 'vitest';
import { CASE_SEARCH_PROVIDERS, caseSearchSourceLabels } from '../services/search/searchProviders';
import { getCasePrivacyEntities } from '../services/privacyEntityRegistry';

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

  it('koppelt privacy-relevante Falltabellen an einen Suchprovider oder markiert sie bewusst als Strukturträger', () => {
    const providerTables = new Set<string>(CASE_SEARCH_PROVIDERS.flatMap((provider) => provider.requiredTables));
    const consciouslyIndirectTables = new Set<string>([
      // Ereignistabellen hängen fachlich an ihrem Prozess und werden über Join-Provider indexiert.
      // Sie müssen trotzdem in requiredTables der jeweiligen Provider auftauchen.
    ]);

    const missing = getCasePrivacyEntities()
      .filter((entity) => entity.pendingMarkerFields.length > 0)
      .filter((entity) => !providerTables.has(entity.table) && !consciouslyIndirectTables.has(entity.table))
      .map((entity) => entity.table);

    expect(missing).toEqual([]);
  });


  it('hält für jede suchrelevante Privacy-Entität konkrete Anonymisierungsfelder vor', () => {
    const unprotected = getCasePrivacyEntities()
      .filter((entity) => entity.pendingMarkerFields.length > 0)
      .filter((entity) => Object.keys(entity.anonymizeFields).length === 0)
      .map((entity) => entity.table);

    expect(unprotected).toEqual([]);
  });

});
