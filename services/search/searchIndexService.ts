import type { CaseContentSearchInput, CaseSearchResult, CaseSearchSourceType, CaseSearchHighlightSegment } from '../../src/app/core/models/case-note.model.js';
import type { DatabaseAdapter } from '../databaseService.js';
import { CASE_SEARCH_PROVIDERS, caseSearchSourceLabels } from './searchProviders.js';
import { PersonalDataAuditLogService } from '../auditLogService.js';
import type { PersonalDataAuditAction } from '../../src/app/core/models/audit.model.js';
import type { CaseSearchDocument, CaseSearchProvider } from './searchTypes.js';

function nowIso(): string {
  return new Date().toISOString();
}

function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function escapeFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(' AND ');
}

const SEARCH_SOURCE_PRIORITY: Partial<Record<CaseSearchSourceType, number>> = {
  case: 0,
  note: 1,
  measure_note: 2,
  document: 3,
  document_ocr: 4,
  bem: 5,
  prevention: 5,
  termination: 5,
  equalization: 5,
  participation: 5,
  workplace_accommodation: 6,
  measure: 7,
  bem_event: 8,
  prevention_event: 8,
  participation_event: 8,
  measure_event: 8,
};

function normalizeSourceTypes(values?: readonly CaseSearchSourceType[]): CaseSearchSourceType[] {
  if (!values?.length) return [];
  const allowed = new Set(CASE_SEARCH_PROVIDERS.map((provider) => provider.sourceType));
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

function highlightSegments(excerpt: string): CaseSearchHighlightSegment[] {
  const parts: CaseSearchHighlightSegment[] = [];
  let remaining = excerpt;
  while (remaining.includes('[') && remaining.includes(']')) {
    const start = remaining.indexOf('[');
    const end = remaining.indexOf(']', start + 1);
    if (start < 0 || end < 0) break;
    if (start > 0) parts.push({ text: remaining.slice(0, start), match: false });
    parts.push({ text: remaining.slice(start + 1, end), match: true });
    remaining = remaining.slice(end + 1);
  }
  if (remaining) parts.push({ text: remaining, match: false });
  return parts.length ? parts.filter((part) => part.text) : [{ text: excerpt, match: false }];
}

function sourcePriority(type: CaseSearchSourceType): number {
  return SEARCH_SOURCE_PRIORITY[type] ?? 10;
}

function rankResults(results: CaseSearchResult[]): CaseSearchResult[] {
  return [...results].sort((left, right) => {
    const priority = sourcePriority(left.sourceType) - sourcePriority(right.sourceType);
    if (priority !== 0) return priority;
    const rank = left.rank - right.rank;
    if (rank !== 0) return rank;
    return String(right.date ?? '').localeCompare(String(left.date ?? ''));
  });
}

function sourceTypeFilterClause(sourceTypes: readonly CaseSearchSourceType[]): { clause: string; params: CaseSearchSourceType[] } {
  if (!sourceTypes.length) return { clause: '', params: [] };
  return { clause: ` AND i.source_type IN (${sourceTypes.map(() => '?').join(', ')})`, params: [...sourceTypes] };
}

function fallbackSourceTypeFilterClause(sourceTypes: readonly CaseSearchSourceType[]): { clause: string; params: CaseSearchSourceType[] } {
  if (!sourceTypes.length) return { clause: '', params: [] };
  return { clause: ` AND source_type IN (${sourceTypes.map(() => '?').join(', ')})`, params: [...sourceTypes] };
}


function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightQueryInExcerpt(excerpt: string, query: string): CaseSearchHighlightSegment[] {
  const terms = query.trim().split(/\s+/).map(escapeRegex).filter(Boolean);
  if (!terms.length || !excerpt) return [{ text: excerpt, match: false }];
  return highlightSegments(excerpt.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '[$1]'));
}

function mapRow(row: any): CaseSearchResult {
  const caseNumbers = typeof row.case_numbers === 'string' && row.case_numbers.trim()
    ? row.case_numbers.split(',').map((entry: string) => entry.trim()).filter(Boolean)
    : undefined;
  return {
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceLabel: row.source_label,
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    caseNumbers,
    title: row.title ?? row.source_label ?? 'Suchtreffer',
    excerpt: row.excerpt ?? '',
    excerptSegments: highlightSegments(row.excerpt ?? ''),
    extractionQuality: row.extraction_quality ?? undefined,
    navigationKind: row.navigation_kind ?? undefined,
    navigationId: row.navigation_id ?? undefined,
    navigationSubId: row.navigation_sub_id ?? undefined,
    date: row.occurred_at ?? undefined,
    rank: Number(row.rank ?? 100),
  };
}

export class SearchIndexService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly providers: readonly CaseSearchProvider[] = CASE_SEARCH_PROVIDERS,
  ) {}

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_search_index (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        case_number TEXT,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_label TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT,
        occurred_at TEXT,
        updated_at TEXT NOT NULL,
        confidentiality TEXT NOT NULL DEFAULT 'sensibel',
        contains_health_data INTEGER NOT NULL DEFAULT 1,
        extraction_quality TEXT NOT NULL DEFAULT 'structured',
        navigation_kind TEXT NOT NULL,
        navigation_id TEXT NOT NULL,
        navigation_sub_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_type, source_id, case_id)
      );

      CREATE INDEX IF NOT EXISTS idx_case_search_index_case ON case_search_index(case_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_case_search_index_source ON case_search_index(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_case_search_index_navigation ON case_search_index(navigation_kind, navigation_id);

      CREATE TABLE IF NOT EXISTS case_search_index_state (
        case_id TEXT PRIMARY KEY,
        indexed_at TEXT NOT NULL,
        last_source_updated_at TEXT,
        source_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS case_search_index_fts USING fts5(
        index_id UNINDEXED,
        title,
        content,
        keywords,
        source_label,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);
  }

  reindexAll(): number {
    this.ensureSchema();
    this.db.prepare('DELETE FROM case_search_index_fts').run();
    this.db.prepare('DELETE FROM case_search_index').run();
    this.db.prepare('DELETE FROM case_search_index_state').run();
    let count = 0;
    const touchedCaseIds = new Set<string>();
    for (const provider of this.providers) {
      for (const document of this.safeCollect(() => provider.collectAll(this.db))) {
        this.upsertDocument(document);
        touchedCaseIds.add(document.caseId);
        count += 1;
      }
    }
    for (const caseId of touchedCaseIds) this.markCaseIndexed(caseId);
    this.markGlobalIndexed(count);
    this.audit('update', 'Suchindex vollständig neu aufgebaut', { metadata: { documentsIndexed: count, casesTouched: touchedCaseIds.size } });
    return count;
  }

  reindexCase(caseId: string): number {
    this.ensureSchema();
    this.deleteCase(caseId);
    let count = 0;
    for (const provider of this.providers) {
      for (const document of this.safeCollect(() => provider.collectForCase(this.db, caseId))) {
        this.upsertDocument(document);
        count += 1;
      }
    }
    this.markCaseIndexed(caseId);
    this.audit('update', 'Suchindex der Fallakte neu aufgebaut', { caseId, subjectId: caseId, metadata: { documentsIndexed: count } });
    return count;
  }

  reindexSource(sourceType: string, sourceId: string): number {
    this.ensureSchema();
    const caseIds = new Set<string>();
    const existing = this.db.prepare<{ case_id: string }>('SELECT case_id FROM case_search_index WHERE source_type = ? AND source_id = ?').all(sourceType, sourceId);
    existing.forEach((row) => caseIds.add(row.case_id));
    this.deleteSource(sourceType, sourceId);

    const provider = this.providers.find((candidate) => candidate.sourceType === sourceType);
    if (!provider) return 0;

    if (!caseIds.size) {
      for (const document of this.safeCollect(() => provider.collectAll(this.db)).filter((document) => document.sourceId === sourceId)) {
        caseIds.add(document.caseId);
      }
    }

    let count = 0;
    for (const caseId of caseIds) {
      for (const document of this.safeCollect(() => provider.collectForCase(this.db, caseId)).filter((document) => document.sourceId === sourceId)) {
        this.upsertDocument(document);
        count += 1;
      }
      this.markCaseIndexed(caseId);
    }
    this.clearGlobalState();
    this.audit('update', 'Suchindex einer Quelle neu aufgebaut', { subjectId: sourceId, metadata: { sourceType, documentsIndexed: count, casesTouched: caseIds.size } });
    return count;
  }

  upsertDocument(document: CaseSearchDocument): void {
    this.ensureSchema();
    const id = this.indexId(document.sourceType, document.sourceId, document.caseId);
    this.db.prepare('DELETE FROM case_search_index_fts WHERE index_id = ?').run(id);
    this.db.prepare('DELETE FROM case_search_index WHERE id = ?').run(id);
    this.db.prepare(`
      INSERT INTO case_search_index (
        id, case_id, case_number, source_type, source_id, source_label, title, content, keywords,
        occurred_at, updated_at, confidentiality, contains_health_data, extraction_quality,
        navigation_kind, navigation_id, navigation_sub_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      document.caseId,
      document.caseNumber ?? null,
      document.sourceType,
      document.sourceId,
      document.sourceLabel,
      document.title,
      document.content,
      document.keywords ?? null,
      document.occurredAt ?? null,
      document.updatedAt,
      document.confidentiality,
      document.containsHealthData ? 1 : 0,
      document.extractionQuality,
      document.navigationTarget.kind,
      document.navigationTarget.id,
      document.navigationTarget.subId ?? null,
      nowIso(),
    );
    this.db.prepare(`
      INSERT INTO case_search_index_fts (index_id, title, content, keywords, source_label)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, document.title, document.content, document.keywords ?? '', document.sourceLabel);
  }

  deleteCase(caseId: string): number {
    this.ensureSchema();
    const ids = this.db.prepare<{ id: string }>('SELECT id FROM case_search_index WHERE case_id = ?').all(caseId).map((row) => row.id);
    let count = 0;
    for (const id of ids) {
      this.db.prepare('DELETE FROM case_search_index_fts WHERE index_id = ?').run(id);
      const result = this.db.prepare<any>('DELETE FROM case_search_index WHERE id = ?').run(id) as { changes?: number } | undefined;
      count += Number(result?.changes ?? 0);
    }
    this.db.prepare('DELETE FROM case_search_index_state WHERE case_id = ?').run(caseId);
    this.clearGlobalState();
    if (count > 0) {
      this.audit('delete', 'Suchindex der Fallakte gelöscht', { caseId, subjectId: caseId, metadata: { entriesDeleted: count } });
    }
    return count;
  }

  deleteSource(sourceType: string, sourceId: string): number {
    this.ensureSchema();
    const rows = this.db.prepare<{ id: string; case_id: string }>('SELECT id, case_id FROM case_search_index WHERE source_type = ? AND source_id = ?').all(sourceType, sourceId);
    const caseIds = new Set(rows.map((row) => row.case_id));
    let count = 0;
    for (const row of rows) {
      this.db.prepare('DELETE FROM case_search_index_fts WHERE index_id = ?').run(row.id);
      const result = this.db.prepare<any>('DELETE FROM case_search_index WHERE id = ?').run(row.id) as { changes?: number } | undefined;
      count += Number(result?.changes ?? 0);
    }
    for (const caseId of caseIds) this.invalidateCase(caseId);
    this.clearGlobalState();
    if (count > 0) {
      this.audit('delete', 'Suchindexeinträge einer Quelle gelöscht', { subjectId: sourceId, metadata: { sourceType, entriesDeleted: count, casesTouched: caseIds.size } });
    }
    return count;
  }

  search(input: CaseContentSearchInput): CaseSearchResult[] {
    this.ensureSchema();
    const query = input.query.trim();
    if (query.length < 2) return [];
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const sourceTypes = normalizeSourceTypes(input.sourceTypes);

    this.ensureFresh(input.caseId);

    try {
      const ftsQuery = escapeFtsQuery(query);
      const sourceFilter = sourceTypeFilterClause(sourceTypes);
      const rows = input.caseId
        ? this.db.prepare<any>(`
            SELECT i.source_type, i.source_id, i.source_label, i.case_id, i.case_number, i.title,
              snippet(case_search_index_fts, 2, '[', ']', ' … ', 20) AS excerpt,
              i.occurred_at, i.extraction_quality, i.navigation_kind, i.navigation_id, i.navigation_sub_id,
              bm25(case_search_index_fts) AS rank
            FROM case_search_index_fts f
            JOIN case_search_index i ON i.id = f.index_id
            WHERE case_search_index_fts MATCH ? AND i.case_id = ?${sourceFilter.clause}
            ORDER BY rank, i.updated_at DESC
            LIMIT ?
          `).all(ftsQuery, input.caseId, ...sourceFilter.params, limit)
        : this.db.prepare<any>(`
            SELECT i.source_type, i.source_id, i.source_label, i.case_id, i.case_number, i.title,
              snippet(case_search_index_fts, 2, '[', ']', ' … ', 20) AS excerpt,
              i.occurred_at, i.extraction_quality, i.navigation_kind, i.navigation_id, i.navigation_sub_id,
              bm25(case_search_index_fts) AS rank
            FROM case_search_index_fts f
            JOIN case_search_index i ON i.id = f.index_id
            WHERE case_search_index_fts MATCH ?${sourceFilter.clause}
            ORDER BY rank, i.updated_at DESC
            LIMIT ?
          `).all(ftsQuery, ...sourceFilter.params, limit);
      return rankResults(rows.map(mapRow)).slice(0, limit);
    } catch {
      return this.searchFallback(query, input.caseId, limit, sourceTypes);
    }
  }

  sourceLabels(): Record<string, string> {
    return caseSearchSourceLabels();
  }

  private audit(action: PersonalDataAuditAction, purpose: string, input: { caseId?: string; subjectId?: string; metadata?: Record<string, unknown> } = {}): void {
    try {
      new PersonalDataAuditLogService(this.db).append({
        action,
        subjectType: 'case_search_index',
        subjectId: input.subjectId,
        caseId: input.caseId,
        purpose,
        metadata: input.metadata,
      });
    } catch {
      // Der Suchindex darf Fachoperationen nicht blockieren, wenn ein schlanker
      // Testadapter oder eine beschädigte Audit-Tabelle den Nachweis nicht schreiben kann.
    }
  }

  private ensureFresh(caseId?: string): void {
    if (caseId) this.ensureCaseFresh(caseId);
    else this.ensureAllFresh();
  }

  private ensureCaseFresh(caseId: string): void {
    const state = this.db.prepare<{ indexed_at?: string; last_source_updated_at?: string; source_count?: number }>(
      'SELECT indexed_at, last_source_updated_at, source_count FROM case_search_index_state WHERE case_id = ?',
    ).get(caseId);
    const indexedCount = Number(this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_search_index WHERE case_id = ?').get(caseId)?.count ?? 0);
    const latest = this.latestUpdatedAtForCase(caseId);
    const latestChanged = Boolean(latest && latest !== state?.last_source_updated_at);
    if (!state || latestChanged || (latest && indexedCount === 0)) this.reindexCase(caseId);
  }

  private ensureAllFresh(): void {
    const state = this.db.prepare<{ indexed_at?: string; last_source_updated_at?: string; source_count?: number }>(
      'SELECT indexed_at, last_source_updated_at, source_count FROM case_search_index_state WHERE case_id = ?',
    ).get('__all__');
    const indexedCount = Number(this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_search_index').get()?.count ?? 0);
    const latest = this.latestUpdatedAtAll();
    const latestChanged = Boolean(latest && latest !== state?.last_source_updated_at);
    if (!state || latestChanged || (latest && indexedCount === 0)) this.reindexAll();
  }

  private latestUpdatedAtForCase(caseId: string): string | undefined {
    return this.providers
      .map((provider) => this.safeRead(() => provider.latestUpdatedAtForCase(this.db, caseId)))
      .filter((value): value is string => Boolean(value))
      .sort()
      .slice(-1)[0];
  }

  private latestUpdatedAtAll(): string | undefined {
    return this.providers
      .map((provider) => this.safeRead(() => provider.latestUpdatedAtAll(this.db)))
      .filter((value): value is string => Boolean(value))
      .sort()
      .slice(-1)[0];
  }

  private markCaseIndexed(caseId: string): void {
    const timestamp = nowIso();
    const latest = this.latestUpdatedAtForCase(caseId);
    const count = Number(this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_search_index WHERE case_id = ?').get(caseId)?.count ?? 0);
    this.db.prepare(`
      INSERT INTO case_search_index_state (case_id, indexed_at, last_source_updated_at, source_count, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        indexed_at = excluded.indexed_at,
        last_source_updated_at = excluded.last_source_updated_at,
        source_count = excluded.source_count,
        updated_at = excluded.updated_at
    `).run(caseId, timestamp, latest ?? null, count, timestamp);
  }

  private markGlobalIndexed(sourceCount: number): void {
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO case_search_index_state (case_id, indexed_at, last_source_updated_at, source_count, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(case_id) DO UPDATE SET
        indexed_at = excluded.indexed_at,
        last_source_updated_at = excluded.last_source_updated_at,
        source_count = excluded.source_count,
        updated_at = excluded.updated_at
    `).run('__all__', timestamp, this.latestUpdatedAtAll() ?? null, sourceCount, timestamp);
  }

  private invalidateCase(caseId: string): void {
    this.db.prepare('DELETE FROM case_search_index_state WHERE case_id = ?').run(caseId);
  }

  private clearGlobalState(): void {
    this.db.prepare('DELETE FROM case_search_index_state WHERE case_id = ?').run('__all__');
  }

  private safeRead<T>(producer: () => T): T | undefined {
    try {
      return producer();
    } catch {
      return undefined;
    }
  }

  private searchFallback(query: string, caseId: string | undefined, limit: number, sourceTypes: readonly CaseSearchSourceType[] = []): CaseSearchResult[] {
    const pattern = likePattern(query);
    const sourceFilter = fallbackSourceTypeFilterClause(sourceTypes);
    const rows = caseId
      ? this.db.prepare<any>(`
          SELECT source_type, source_id, source_label, case_id, case_number, title,
            substr(COALESCE(content, title), 1, 220) AS excerpt,
            occurred_at, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, 100 AS rank
          FROM case_search_index
          WHERE case_id = ?
            AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR COALESCE(keywords, '') LIKE ? ESCAPE '\\' OR source_label LIKE ? ESCAPE '\\')${sourceFilter.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `).all(caseId, pattern, pattern, pattern, pattern, ...sourceFilter.params, limit)
      : this.db.prepare<any>(`
          SELECT source_type, source_id, source_label, case_id, case_number, title,
            substr(COALESCE(content, title), 1, 220) AS excerpt,
            occurred_at, extraction_quality, navigation_kind, navigation_id, navigation_sub_id, 100 AS rank
          FROM case_search_index
          WHERE (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR COALESCE(keywords, '') LIKE ? ESCAPE '\\' OR source_label LIKE ? ESCAPE '\\')${sourceFilter.clause}
          ORDER BY updated_at DESC
          LIMIT ?
        `).all(pattern, pattern, pattern, pattern, ...sourceFilter.params, limit);
    return rankResults(rows.map((row: any) => ({ ...mapRow(row), excerptSegments: highlightQueryInExcerpt(String(row.excerpt ?? ''), query) }))).slice(0, limit);
  }

  private indexId(sourceType: string, sourceId: string, caseId: string): string {
    return `${sourceType}:${sourceId}:${caseId}`;
  }

  private safeCollect(collect: () => CaseSearchDocument[]): CaseSearchDocument[] {
    try {
      return collect().filter((document) => document.caseId && document.sourceId && document.title);
    } catch {
      return [];
    }
  }
}
