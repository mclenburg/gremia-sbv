import { describe, expect, it } from 'vitest';
import { SearchIndexService } from '../services/search/searchIndexService';
import type { DatabaseAdapter } from '../services/databaseService';
import type { CaseSearchSourceType } from '../src/app/core/models/case-note.model';
import type { CaseSearchDocument, CaseSearchProvider } from '../services/search/searchTypes';

function searchDocument(overrides: Partial<CaseSearchDocument> & Pick<CaseSearchDocument, 'sourceType' | 'sourceId' | 'sourceLabel' | 'title' | 'content'>): CaseSearchDocument {
  return {
    caseId: 'case-1',
    caseNumber: 'SBV-2026-001',
    keywords: '',
    occurredAt: '2026-05-14T08:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
    confidentiality: 'sensibel',
    containsHealthData: true,
    extractionQuality: 'structured',
    navigationTarget: { kind: 'process', id: overrides.sourceId },
    ...overrides,
  };
}

function providerFor(sourceType: CaseSearchSourceType, label: string, documents: CaseSearchDocument[]): CaseSearchProvider {
  return {
    sourceType,
    label,
    requiredTables: [],
    collectAll: () => [...documents],
    collectForCase: (_db, caseId) => documents.filter((document) => document.caseId === caseId),
    latestUpdatedAtForCase: (_db, caseId) => documents
      .filter((document) => document.caseId === caseId)
      .map((document) => document.updatedAt)
      .sort()
      .slice(-1)[0],
    latestUpdatedAtAll: () => documents.map((document) => document.updatedAt).sort().slice(-1)[0],
  };
}

class SearchBehaviorDb implements DatabaseAdapter {
  readonly index = new Map<string, Record<string, unknown>>();
  readonly fts = new Map<string, Record<string, unknown>>();
  readonly state = new Map<string, Record<string, unknown>>();

  prepare<T = unknown>(sql: string) {
    const db = this;
    return {
      all(...params: unknown[]): T[] {
        if (sql.includes('FROM case_search_index_fts f')) {
          // Der Testadapter erzwingt den LIKE-Fallback, damit keine Plattform-/SQLite-FTS-
          // Eigenheiten über das Verhalten der Suchlogik entscheiden.
          throw new Error('FTS is intentionally unavailable in this behavior test');
        }

        if (sql.includes('SELECT id, case_id FROM case_search_index WHERE source_type = ? AND source_id = ?')) {
          return [...db.index.values()]
            .filter((row) => row.source_type === params[0] && row.source_id === params[1])
            .map((row) => ({ id: row.id, case_id: row.case_id })) as T[];
        }

        if (sql.includes('SELECT id FROM case_search_index WHERE case_id = ?')) {
          return [...db.index.values()]
            .filter((row) => row.case_id === params[0])
            .map((row) => ({ id: row.id })) as T[];
        }

        if (sql.includes('FROM case_search_index') && sql.includes('WHERE case_id = ?')) {
          const caseId = String(params[0]);
          const patterns = params.slice(1, 5).map((value) => String(value).replace(/^%|%$/g, '').replace(/\\([%_])/g, '$1').toLowerCase());
          const sourceTypes = params.slice(5, -1).map(String);
          return this.filterRows(patterns, sourceTypes)
            .filter((row) => row.case_id === caseId)
            .map((row) => this.toSearchRow(row)) as T[];
        }

        if (sql.includes('FROM case_search_index') && sql.includes('WHERE (title LIKE ?')) {
          const patterns = params.slice(0, 4).map((value) => String(value).replace(/^%|%$/g, '').replace(/\\([%_])/g, '$1').toLowerCase());
          const sourceTypes = params.slice(4, -1).map(String);
          return this.filterRows(patterns, sourceTypes).map((row) => this.toSearchRow(row)) as T[];
        }

        return [] as T[];
      },

      get(...params: unknown[]): T | undefined {
        if (sql.includes('SELECT indexed_at, last_source_updated_at, source_count FROM case_search_index_state')) {
          return db.state.get(String(params[0])) as T | undefined;
        }
        if (sql.includes('SELECT COUNT(*) AS count FROM case_search_index')) {
          if (sql.includes('WHERE case_id = ?')) {
            return { count: [...db.index.values()].filter((row) => row.case_id === params[0]).length } as T;
          }
          return { count: db.index.size } as T;
        }
        return undefined;
      },

      run(...params: unknown[]) {
        if (sql.startsWith('DELETE FROM case_search_index_state WHERE case_id = ?')) {
          const deleted = db.state.delete(String(params[0]));
          return { changes: deleted ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM case_search_index_state')) {
          const changes = db.state.size;
          db.state.clear();
          return { changes };
        }
        if (sql.startsWith('DELETE FROM case_search_index_fts WHERE index_id = ?')) {
          const deleted = db.fts.delete(String(params[0]));
          return { changes: deleted ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM case_search_index WHERE id = ?')) {
          const deleted = db.index.delete(String(params[0]));
          return { changes: deleted ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM case_search_index_fts')) {
          const changes = db.fts.size;
          db.fts.clear();
          return { changes };
        }
        if (sql.startsWith('DELETE FROM case_search_index')) {
          const changes = db.index.size;
          db.index.clear();
          return { changes };
        }
        if (sql.includes('INSERT INTO case_search_index_state')) {
          const [case_id, indexed_at, last_source_updated_at, source_count, updated_at] = params;
          db.state.set(String(case_id), { case_id, indexed_at, last_source_updated_at, source_count, updated_at });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_search_index_fts')) {
          db.fts.set(String(params[0]), { index_id: params[0], title: params[1], content: params[2], keywords: params[3], source_label: params[4] });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_search_index')) {
          const [id, case_id, case_number, source_type, source_id, source_label, title, content, keywords, occurred_at, updated_at, confidentiality, contains_health_data, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, created_at] = params;
          db.index.set(String(id), { id, case_id, case_number, source_type, source_id, source_label, title, content, keywords, occurred_at, updated_at, confidentiality, contains_health_data, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, created_at });
          return { changes: 1 };
        }
        return { changes: 0 };
      },

      filterRows: (patterns: string[], sourceTypes: string[]): Record<string, unknown>[] => {
        const activeSourceTypes = new Set(sourceTypes.filter(Boolean));
        return [...db.index.values()]
          .filter((row) => !activeSourceTypes.size || activeSourceTypes.has(String(row.source_type)))
          .filter((row) => patterns.some((pattern) => ['title', 'content', 'keywords', 'source_label'].some((field) => String(row[field] ?? '').toLowerCase().includes(pattern))));
      },

      toSearchRow: (row: Record<string, unknown>): Record<string, unknown> => ({
        ...row,
        excerpt: String(row.content ?? row.title ?? '').slice(0, 220),
        rank: 100,
      }),
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('SearchIndexService funktionale Suchabdeckung 0.9.1', () => {
  it('findet Kernquellen, Prozessmodule, Dokumente und OCR-Texte innerhalb der ausgewählten Fallakte', () => {
    const documents: CaseSearchDocument[] = [
      searchDocument({ sourceType: 'case', sourceId: 'case-1', sourceLabel: 'Fallakte', title: 'Fallakte Homeoffice', content: 'Zusammenfassung: Homeoffice als Arbeitsplatzanpassung.', navigationTarget: { kind: 'case', id: 'case-1' } }),
      searchDocument({ sourceType: 'note', sourceId: 'note-1', sourceLabel: 'Fallnotiz', title: 'Gesprächsnotiz', content: 'Im Gespräch wurde Homeoffice als Entlastung erwähnt.', extractionQuality: 'manual', navigationTarget: { kind: 'note', id: 'note-1' } }),
      searchDocument({ sourceType: 'document', sourceId: 'doc-1', sourceLabel: 'Dokument', title: 'Ärztliche Empfehlung', content: 'Textauszug empfiehlt Homeoffice und feste Arbeitsmittel.', extractionQuality: 'native_text', navigationTarget: { kind: 'document', id: 'doc-1' } }),
      searchDocument({ sourceType: 'document_ocr', sourceId: 'doc-2', sourceLabel: 'OCR-Text', title: 'Scan Anlage', content: 'OCR erkannte Homeoffice in gescanntem Dokument.', extractionQuality: 'ocr', navigationTarget: { kind: 'document', id: 'doc-2' } }),
      searchDocument({ sourceType: 'measure_note', sourceId: 'mn-1', sourceLabel: 'Maßnahmennotiz', title: 'Terminnotiz', content: 'Homeoffice-Termin mit Führungskraft protokolliert.', navigationTarget: { kind: 'measure', id: 'measure-1', subId: 'mn-1' } }),
      searchDocument({ sourceType: 'bem', sourceId: 'bem-1', sourceLabel: 'BEM', title: 'BEM-Verfahren', content: 'BEM prüft Homeoffice und technische Ausstattung.' }),
      searchDocument({ sourceType: 'prevention', sourceId: 'prev-1', sourceLabel: 'Prävention', title: 'Präventionsverfahren', content: 'Prävention bewertet Homeoffice zur Vermeidung weiterer Ausfälle.' }),
      searchDocument({ sourceType: 'termination', sourceId: 'term-1', sourceLabel: 'Kündigungsanhörung', title: 'Anhörung', content: 'SBV-Stellungnahme verweist auf nicht geprüftes Homeoffice.' }),
      searchDocument({ sourceType: 'equalization', sourceId: 'eq-1', sourceLabel: 'Gleichstellung / GdB', title: 'Gleichstellung', content: 'Arbeitsplatzerhalt durch Homeoffice als Argument.' }),
      searchDocument({ sourceType: 'participation', sourceId: 'part-1', sourceLabel: 'SBV-Beteiligung', title: 'SBV-Beteiligung', content: 'SBV wurde zur Homeoffice-Entscheidung beteiligt.' }),
      searchDocument({ sourceType: 'measure', sourceId: 'measure-1', sourceLabel: 'Maßnahme', title: 'Arbeitsplatzmaßnahme', content: 'Maßnahme: Homeoffice testweise ermöglichen.', navigationTarget: { kind: 'measure', id: 'measure-1' } }),
      searchDocument({ sourceType: 'workplace_accommodation', sourceId: 'acc-1', sourceLabel: 'Arbeitsplatzgestaltung', title: 'Arbeitsplatzgestaltung', content: 'Barriere wird durch Homeoffice reduziert.', navigationTarget: { kind: 'measure', id: 'measure-1', subId: 'acc-1' } }),
      searchDocument({ caseId: 'case-2', caseNumber: 'SBV-2026-002', sourceType: 'note', sourceId: 'foreign-note', sourceLabel: 'Fallnotiz', title: 'Fremde Fallakte', content: 'Homeoffice darf im Fallaktenfilter nicht sichtbar sein.', navigationTarget: { kind: 'note', id: 'foreign-note' } }),
    ];
    const providers = [...new Set(documents.map((document) => document.sourceType))].map((sourceType) => providerFor(sourceType, sourceType, documents.filter((document) => document.sourceType === sourceType)));
    const service = new SearchIndexService(new SearchBehaviorDb(), providers);

    const results = service.search({ query: 'Homeoffice', caseId: 'case-1', limit: 50 });

    expect(results.map((result) => result.caseId)).toEqual(new Array(12).fill('case-1'));
    expect(new Set(results.map((result) => result.sourceType))).toEqual(new Set<CaseSearchSourceType>([
      'case', 'note', 'document', 'document_ocr', 'measure_note', 'bem', 'prevention', 'termination', 'equalization', 'participation', 'measure', 'workplace_accommodation',
    ]));
    expect(results.find((result) => result.sourceType === 'document_ocr')).toMatchObject({ extractionQuality: 'ocr', navigationKind: 'document', navigationId: 'doc-2' });
    expect(results.flatMap((result) => result.excerptSegments ?? []).some((segment) => segment.match && segment.text.toLowerCase() === 'homeoffice')).toBe(true);
  });

  it('filtert serverseitig nach Quelltypen und verwirft Treffer anderer Quellen', () => {
    const documents = [
      searchDocument({ sourceType: 'document', sourceId: 'doc-1', sourceLabel: 'Dokument', title: 'Dokument', content: 'Homeoffice im Dokument', extractionQuality: 'native_text', navigationTarget: { kind: 'document', id: 'doc-1' } }),
      searchDocument({ sourceType: 'measure_note', sourceId: 'mn-1', sourceLabel: 'Maßnahmennotiz', title: 'Notiz', content: 'Homeoffice in der Maßnahmennotiz', navigationTarget: { kind: 'measure', id: 'measure-1', subId: 'mn-1' } }),
      searchDocument({ sourceType: 'bem', sourceId: 'bem-1', sourceLabel: 'BEM', title: 'BEM', content: 'Homeoffice im BEM' }),
    ];
    const service = new SearchIndexService(new SearchBehaviorDb(), [
      providerFor('document', 'Dokument', [documents[0]]),
      providerFor('measure_note', 'Maßnahmennotiz', [documents[1]]),
      providerFor('bem', 'BEM', [documents[2]]),
    ]);

    const results = service.search({ query: 'Homeoffice', caseId: 'case-1', sourceTypes: ['document', 'measure_note'], limit: 20 });

    expect(results.map((result) => result.sourceType).sort()).toEqual(['document', 'measure_note']);
    expect(results.some((result) => result.sourceType === 'bem')).toBe(false);
  });

  it('aktualisiert einen veralteten Fallaktenindex und entfernt alte Klartexte beim Rebuild', () => {
    let document = searchDocument({ sourceType: 'measure_note', sourceId: 'mn-1', sourceLabel: 'Maßnahmennotiz', title: 'Erststand', content: 'AlterKlartext aus der ersten Protokollfassung', updatedAt: '2026-05-14T08:00:00.000Z', navigationTarget: { kind: 'measure', id: 'measure-1', subId: 'mn-1' } });
    const provider = providerFor('measure_note', 'Maßnahmennotiz', [document]);
    const db = new SearchBehaviorDb();
    const service = new SearchIndexService(db, [provider]);

    expect(service.search({ query: 'AlterKlartext', caseId: 'case-1' })).toHaveLength(1);

    document = searchDocument({ ...document, title: 'Anonymisierter Stand', content: '[anonymisiert] NeuerSuchbegriff bleibt auffindbar', updatedAt: '2026-05-14T09:00:00.000Z' });
    provider.collectAll = () => [document];
    provider.collectForCase = (_db, caseId) => document.caseId === caseId ? [document] : [];
    provider.latestUpdatedAtForCase = () => document.updatedAt;
    provider.latestUpdatedAtAll = () => document.updatedAt;

    expect(service.search({ query: 'NeuerSuchbegriff', caseId: 'case-1' })).toHaveLength(1);
    expect(service.search({ query: 'AlterKlartext', caseId: 'case-1' })).toHaveLength(0);
    expect([...db.index.values()].filter((row) => row.source_id === 'mn-1')).toHaveLength(1);
  });

  it('entfernt gelöschte Quellen aus dem Index und baut sie nicht wieder auf, wenn der Provider sie nicht mehr liefert', () => {
    let documents = [
      searchDocument({ sourceType: 'document', sourceId: 'doc-1', sourceLabel: 'Dokument', title: 'Dokument', content: 'LöschSuchwort im Dokument', extractionQuality: 'native_text', navigationTarget: { kind: 'document', id: 'doc-1' } }),
    ];
    const provider = providerFor('document', 'Dokument', documents);
    const db = new SearchBehaviorDb();
    const service = new SearchIndexService(db, [provider]);

    expect(service.search({ query: 'LöschSuchwort', caseId: 'case-1' })).toHaveLength(1);

    documents = [];
    provider.collectAll = () => documents;
    provider.collectForCase = () => documents;
    provider.latestUpdatedAtForCase = () => undefined;
    provider.latestUpdatedAtAll = () => undefined;

    expect(service.deleteSource('document', 'doc-1')).toBe(1);
    expect(service.search({ query: 'LöschSuchwort', caseId: 'case-1' })).toHaveLength(0);
    expect(db.index.size).toBe(0);
  });
});
