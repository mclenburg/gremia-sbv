import type { DatabaseAdapter } from '../databaseService.js';
import { escapeFtsQuery } from './searchIndexSupport.js';
import { SEARCH_SOURCE_CATALOG } from './searchSourceCatalog.js';
import { collectUnifiedSearchDocuments, type UnifiedSearchDocument } from './unifiedSearchProviders.js';
import type { UnifiedSearchHit, UnifiedSearchPage, UnifiedSearchQuery } from '../../src/domain/models/unified-search.model.js';
export type { UnifiedSearchHit, UnifiedSearchPage, UnifiedSearchQuery } from '../../src/domain/models/unified-search.model.js';

interface StoredHit extends Omit<UnifiedSearchHit, 'excerpt' | 'caseId' | 'caseNumber' | 'navigationSubId' | 'occurredAt'> {
  entryId: string;
  excerpt: string;
  case_id: string | null;
  case_number: string | null;
  navigation_sub_id: string | null;
  occurred_at: string | null;
}

const nowIso = (): string => new Date().toISOString();
const SHARED_RELATION_TABLES = new Set([
  'cases', 'case_measures', 'bem_processes', 'prevention_processes',
  'sbv_participations', 'sbv_participation_violations', 'generated_documents',
  'person_case_links', 'deadlines', 'case_documents', 'sbv_elections',
  'legal_norms',
]);

function entryId(sourceType: string, sourceId: string): string {
  return JSON.stringify([sourceType, sourceId]);
}

/** New read model. The legacy case index remains available until the UI switches. */
export class UnifiedSearchIndexService {
  constructor(private readonly db: DatabaseAdapter) {}

  /** Purges every copy associated with a case inside the caller's transaction. */
  purgeCase(caseId: string): number {
    const result = this.db.prepare(`DELETE FROM search_entries WHERE id IN (
      SELECT entry_id FROM search_entry_cases WHERE case_id = ?
    ) OR (source_type = 'case' AND source_id = ?)`).run(caseId, caseId) as { changes?: number };
    return Number(result.changes ?? 0);
  }

  rebuild(): number {
    const documents = collectUnifiedSearchDocuments(this.db);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const revision = this.currentRevision();
      this.db.prepare('DELETE FROM search_entries').run();
      // The delete trigger removes FTS rows; a separate wipe repairs any old orphan.
      this.db.prepare('DELETE FROM search_entries_fts').run();
      for (const document of documents) this.insert(document);
      this.db.prepare(`INSERT INTO search_index_build_state (id, built_revision, built_at, entry_count)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET built_revision = excluded.built_revision,
          built_at = excluded.built_at, entry_count = excluded.entry_count`).run(revision, nowIso(), documents.length);
      this.db.prepare('DELETE FROM search_dirty_tables WHERE revision <= ?').run(revision);
      this.db.exec('COMMIT');
      return documents.length;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  ensureFresh(): void {
    const built = this.db.prepare<{ built_revision: number }>('SELECT built_revision FROM search_index_build_state WHERE id = 1').get();
    if (!built) {
      this.rebuild();
      return;
    }
    const revision = this.currentRevision();
    if (built.built_revision === revision) return;
    const dirty = this.db.prepare<{ table_name: string }>('SELECT table_name FROM search_dirty_tables WHERE revision > ?').all(built.built_revision)
      .map((row) => row.table_name);
    if (!dirty.length || dirty.some((table) => SHARED_RELATION_TABLES.has(table))) {
      this.rebuild();
      return;
    }
    const affected = new Set(SEARCH_SOURCE_CATALOG.filter((source) =>
      dirty.some((table) => source.table === table || source.childTables.includes(table))).map((source) => source.sourceType));
    if (!affected.size) {
      this.rebuild();
      return;
    }
    const documents = collectUnifiedSearchDocuments(this.db, affected);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const sourceType of affected) this.db.prepare('DELETE FROM search_entries WHERE source_type = ?').run(sourceType);
      for (const document of documents) this.insert(document);
      const count = Number(this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM search_entries').get()?.count ?? 0);
      this.db.prepare('UPDATE search_index_build_state SET built_revision = ?, built_at = ?, entry_count = ? WHERE id = 1')
        .run(revision, nowIso(), count);
      this.db.prepare('DELETE FROM search_dirty_tables WHERE revision <= ?').run(revision);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  search(input: UnifiedSearchQuery): UnifiedSearchPage {
    const query = input.query.trim();
    if (query.length < 2 || (input.area === 'current_case' && !input.currentCaseId)) return { total: 0, hits: [] };
    this.ensureFresh();
    const areaFilter = input.area === 'all_data' ? '' : input.area === 'current_case'
      ? ' AND EXISTS (SELECT 1 FROM search_entry_cases ec WHERE ec.entry_id = e.id AND ec.case_id = ?)'
      : ' AND EXISTS (SELECT 1 FROM search_entry_cases ec WHERE ec.entry_id = e.id)';
    const areaParams = input.area === 'current_case' ? [input.currentCaseId] : [];
    const sourceTypes = [...new Set(input.sourceTypes ?? [])];
    const typeFilter = sourceTypes.length ? ` AND e.source_type IN (${sourceTypes.map(() => '?').join(',')})` : '';
    const params = [escapeFtsQuery(query), ...areaParams, ...sourceTypes];
    const from = `FROM search_entries_fts f JOIN search_entries e ON e.id = f.entry_id
      WHERE search_entries_fts MATCH ?${areaFilter}${typeFilter}`;
    const total = Number(this.db.prepare<{ count: number }>(`SELECT COUNT(*) AS count ${from}`).get(...params)?.count ?? 0);
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 100);
    const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
    const rows = this.db.prepare<StoredHit>(`SELECT e.id AS entryId, e.source_type AS sourceType, e.source_id AS sourceId,
      e.module, e.source_label AS sourceLabel, e.title,
      snippet(search_entries_fts, 2, '[', ']', ' … ', 20) AS excerpt,
      e.case_id, e.case_number, e.navigation_kind AS navigationKind,
      e.navigation_id AS navigationId, e.navigation_sub_id,
      e.extraction_quality AS extractionQuality, e.occurred_at
      ${from} ORDER BY bm25(search_entries_fts), e.updated_at DESC, e.id LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
    const links = rows.length ? this.db.prepare<{ entry_id: string; case_id: string; case_number: string }>(`
      SELECT ec.entry_id, ec.case_id, c.case_number FROM search_entry_cases ec
      JOIN cases c ON c.id = ec.case_id
      WHERE ec.entry_id IN (${rows.map(() => '?').join(',')}) ORDER BY c.case_number`)
      .all(...rows.map((row) => row.entryId)) : [];
    const linksByEntry = new Map<string, typeof links>();
    for (const link of links) {
      const group = linksByEntry.get(link.entry_id) ?? [];
      group.push(link);
      linksByEntry.set(link.entry_id, group);
    }
    const state = this.db.prepare<{ built_at: string }>('SELECT built_at FROM search_index_build_state WHERE id = 1').get();
    return {
      total,
      hits: rows.map((row) => ({
        sourceType: row.sourceType, sourceId: row.sourceId, module: row.module,
        sourceLabel: row.sourceLabel, title: row.title, excerpt: row.excerpt,
        caseId: input.area === 'current_case' ? input.currentCaseId : row.case_id ?? undefined,
        caseNumber: input.area === 'current_case'
          ? linksByEntry.get(row.entryId)?.find((link) => link.case_id === input.currentCaseId)?.case_number
          : row.case_number ?? undefined,
        caseNumbers: input.area === 'current_case'
          ? undefined : linksByEntry.get(row.entryId)?.map((link) => link.case_number),
        navigationKind: row.navigationKind, navigationId: row.navigationId,
        navigationSubId: row.navigation_sub_id ?? undefined,
        extractionQuality: row.extractionQuality, occurredAt: row.occurred_at ?? undefined,
      })),
      indexedAt: state?.built_at,
    };
  }

  private currentRevision(): number {
    return Number(this.db.prepare<{ revision: number }>('SELECT revision FROM search_change_clock WHERE id = 1').get()?.revision ?? 0);
  }

  private insert(document: UnifiedSearchDocument): void {
    const id = entryId(document.sourceType, document.sourceId);
    const validCases = document.caseIds.filter((caseId) => Boolean(this.db.prepare('SELECT 1 FROM cases WHERE id = ?').get(caseId)));
    const primaryCaseId = validCases[0] ?? null;
    const caseNumber = primaryCaseId
      ? this.db.prepare<{ case_number: string }>('SELECT case_number FROM cases WHERE id = ?').get(primaryCaseId)?.case_number ?? null
      : null;
    this.db.prepare(`INSERT INTO search_entries
      (id, source_type, source_id, case_id, case_number, module, source_label, title, content, keywords,
       occurred_at, updated_at, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, document.sourceType, document.sourceId, primaryCaseId, caseNumber,
      document.module, document.sourceLabel, document.title, document.content, document.keywords,
      document.occurredAt ?? null, document.updatedAt, document.extractionQuality,
      document.navigationKind, document.navigationId, document.navigationSubId ?? null, nowIso(),
    );
    this.db.prepare('INSERT INTO search_entries_fts(entry_id, title, content, keywords, source_label) VALUES (?, ?, ?, ?, ?)')
      .run(id, document.title, document.content, document.keywords, document.sourceLabel);
    for (const caseId of validCases) this.db.prepare('INSERT OR IGNORE INTO search_entry_cases(entry_id, case_id) VALUES (?, ?)').run(id, caseId);
  }
}
