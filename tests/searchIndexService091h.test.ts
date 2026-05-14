import { describe, expect, it } from 'vitest';
import { SearchIndexService } from '../services/search/searchIndexService';
import type { CaseSearchDocument, CaseSearchProvider } from '../services/search/searchTypes';
import type { DatabaseAdapter } from '../services/databaseService';

function doc(overrides: Partial<CaseSearchDocument> = {}): CaseSearchDocument {
  return {
    caseId: 'case-1',
    caseNumber: 'SBV-1',
    sourceType: 'bem',
    sourceId: 'bem-1',
    sourceLabel: 'BEM',
    title: 'BEM wegen Arbeitsplatzbelastung',
    content: 'Stufenweise Wiedereingliederung und technische Arbeitshilfe prüfen',
    keywords: 'BEM Prävention',
    occurredAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    confidentiality: 'sensibel',
    containsHealthData: true,
    extractionQuality: 'structured',
    navigationTarget: { kind: 'process', id: 'bem-1' },
    ...overrides,
  };
}

const provider: CaseSearchProvider = {
  sourceType: 'bem',
  label: 'BEM',
  requiredTables: [],
  collectAll: () => [doc(), doc({ caseId: 'case-2', caseNumber: 'SBV-2', sourceId: 'bem-2', content: 'Nur andere Fallakte' })],
  collectForCase: (_db, caseId) => [doc(), doc({ caseId: 'case-2', caseNumber: 'SBV-2', sourceId: 'bem-2', content: 'Nur andere Fallakte' })].filter((entry) => entry.caseId === caseId),
  latestUpdatedAtForCase: (_db, caseId) => caseId === 'case-1' ? '2026-05-01T10:00:00.000Z' : caseId === 'case-2' ? '2026-05-01T10:00:00.000Z' : undefined,
  latestUpdatedAtAll: () => '2026-05-01T10:00:00.000Z',
};

class SearchDb implements DatabaseAdapter {
  readonly index = new Map<string, Record<string, unknown>>();
  readonly fts = new Map<string, Record<string, unknown>>();
  readonly state = new Map<string, Record<string, unknown>>();
  readonly auditRows: Record<string, unknown>[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(...params: unknown[]): T[] {
        if (sql.includes('FROM case_search_index_fts f')) {
          throw new Error('FTS not available in fake db');
        }
        if (sql.includes('SELECT COUNT(*) AS count FROM case_search_index')) {
          if (sql.includes('WHERE case_id = ?')) {
            return [{ count: [...self.index.values()].filter((row) => row.case_id === params[0]).length }] as T[];
          }
          return [{ count: self.index.size }] as T[];
        }
        if (sql.includes('FROM case_search_index') && sql.includes('SELECT id')) {
          if (sql.includes('WHERE case_id = ?')) {
            return [...self.index.values()].filter((row) => row.case_id === params[0]).map((row) => ({ id: row.id })) as T[];
          }
          if (sql.includes('WHERE source_type = ? AND source_id = ?')) {
            return [...self.index.values()].filter((row) => row.source_type === params[0] && row.source_id === params[1]).map((row) => ({ id: row.id, case_id: row.case_id })) as T[];
          }
        }
        if (sql.includes('FROM case_search_index') && sql.includes('WHERE case_id = ?')) {
          const [caseId, titlePattern, contentPattern, keywordPattern, labelPattern] = params.map(String);
          const patterns = [titlePattern, contentPattern, keywordPattern, labelPattern]
            .filter((pattern) => pattern !== 'undefined')
            .map((pattern) => pattern.replace(/^%|%$/g, '').toLowerCase());
          return [...self.index.values()]
            .filter((row) => row.case_id === caseId)
            .filter((row) => patterns.some((pattern) => ['title', 'content', 'keywords', 'source_label'].some((field) => String(row[field] ?? '').toLowerCase().includes(pattern))))
            .map((row) => ({ ...row, excerpt: String(row.content ?? '').slice(0, 220), rank: 100 })) as T[];
        }
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (sql.includes('SELECT indexed_at, last_source_updated_at, source_count FROM case_search_index_state')) {
          return self.state.get(String(params[0])) as T | undefined;
        }
        if (sql.includes('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1')) {
          const previous = self.auditRows.at(-1);
          return previous ? { sequence: previous.sequence, entry_hash: previous.entry_hash } as T : undefined;
        }
        if (sql.includes('SELECT * FROM personal_data_audit_log WHERE id = ?')) {
          return self.auditRows.find((row) => row.id === params[0]) as T | undefined;
        }
        if (sql.includes('SELECT COUNT(*) AS count FROM case_search_index')) {
          if (sql.includes('WHERE case_id = ?')) {
            return { count: [...self.index.values()].filter((row) => row.case_id === params[0]).length } as T;
          }
          return { count: self.index.size } as T;
        }
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.startsWith('DELETE FROM case_search_index_state WHERE case_id = ?')) {
          const deleted = self.state.delete(String(params[0]));
          return { changes: deleted ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM case_search_index_state')) {
          const changes = self.state.size;
          self.state.clear();
          return { changes };
        }
        if (sql.startsWith('DELETE FROM case_search_index_fts WHERE index_id = ?')) {
          self.fts.delete(String(params[0]));
          return { changes: 1 };
        }
        if (sql.startsWith('DELETE FROM case_search_index WHERE id = ?')) {
          const deleted = self.index.delete(String(params[0]));
          return { changes: deleted ? 1 : 0 };
        }
        if (sql.startsWith('DELETE FROM case_search_index_fts')) {
          const changes = self.fts.size;
          self.fts.clear();
          return { changes };
        }
        if (sql.startsWith('DELETE FROM case_search_index')) {
          const changes = self.index.size;
          self.index.clear();
          return { changes };
        }
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          const [id, sequence, occurred_at, actor, action, subject_type, subject_id, case_id, purpose, metadata_json, previous_hash, entry_hash] = params;
          self.auditRows.push({ id, sequence, occurred_at, actor, action, subject_type, subject_id, case_id, purpose, metadata_json, previous_hash, entry_hash });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_search_index_state')) {
          const [case_id, indexed_at, last_source_updated_at, source_count, updated_at] = params;
          self.state.set(String(case_id), { case_id, indexed_at, last_source_updated_at, source_count, updated_at });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_search_index_fts')) {
          self.fts.set(String(params[0]), { index_id: params[0], title: params[1], content: params[2], keywords: params[3], source_label: params[4] });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO case_search_index')) {
          const [id, case_id, case_number, source_type, source_id, source_label, title, content, keywords, occurred_at, updated_at, confidentiality, contains_health_data, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, created_at] = params;
          self.index.set(String(id), { id, case_id, case_number, source_type, source_id, source_label, title, content, keywords, occurred_at, updated_at, confidentiality, contains_health_data, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, created_at });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('SearchIndexService 0.9.1', () => {
  it('indexiert Provider-Dokumente fallbezogen und respektiert den Fallaktenfilter', () => {
    const db = new SearchDb();
    const service = new SearchIndexService(db, [provider]);

    const results = service.search({ query: 'Wiedereingliederung', caseId: 'case-1' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ sourceType: 'bem', sourceId: 'bem-1', caseId: 'case-1', sourceLabel: 'BEM' });
    expect(results[0].excerpt).toContain('Wiedereingliederung');
  });



  it('nutzt vorhandenen frischen Index ohne bei jeder Suche neu zu sammeln', () => {
    const db = new SearchDb();
    let collectForCaseCalls = 0;
    const countingProvider: CaseSearchProvider = {
      ...provider,
      collectForCase(dbAdapter, caseId) {
        collectForCaseCalls += 1;
        return provider.collectForCase(dbAdapter, caseId);
      },
    };
    const service = new SearchIndexService(db, [countingProvider]);

    const first = service.search({ query: 'Wiedereingliederung', caseId: 'case-1' });
    const second = service.search({ query: 'Wiedereingliederung', caseId: 'case-1' });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(collectForCaseCalls).toBe(1);
    expect(db.state.get('case-1')).toMatchObject({ last_source_updated_at: '2026-05-01T10:00:00.000Z' });
  });

  it('löscht Suchindexeinträge fall- und quellbezogen', () => {
    const db = new SearchDb();
    const service = new SearchIndexService(db, [provider]);
    service.reindexAll();

    expect(db.index.size).toBe(2);
    expect(service.deleteSource('bem', 'bem-1')).toBe(1);
    expect([...db.index.values()].map((row) => row.source_id)).toEqual(['bem-2']);
    expect(db.state.has('case-1')).toBe(false);
    expect(service.deleteCase('case-2')).toBe(1);
    expect(db.index.size).toBe(0);
    expect(db.auditRows.map((row) => row.subject_type)).toContain('case_search_index');
  });
});
