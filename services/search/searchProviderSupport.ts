import type { DatabaseAdapter } from '../databaseService.js';
import type { CaseSearchDocument, CaseSearchNavigationKind, CaseSearchProvider, CaseSearchSourceType } from './searchTypes.js';
export interface SearchProviderRow extends Record<string, unknown> {
  id: string;
  case_id: string;
  accommodation_status?: string | null;
  agency_reference?: string | null;
  application_status?: string | null;
  barrier_or_limitation?: string | null;
  case_number?: string | null;
  category?: string | null;
  completion_reason?: string | null;
  confidential_level?: string | null;
  confidential_notes?: string | null;
  consent_scope?: string | null;
  contains_health_data?: number | string | null;
  content?: string | null;
  created_at?: string | null;
  data_retention_note?: string | null;
  decision_notified?: number | string | null;
  decision_stage?: string | null;
  description?: string | null;
  difficulty_type?: string | null;
  display_name?: string | null;
  display_title?: string | null;
  employer_measure_type?: string | null;
  employer_reason?: string | null;
  employer_request_summary?: string | null;
  employer_response_status?: string | null;
  event_type?: string | null;
  extracted_text?: string | null;
  extraction_quality?: string | null;
  filename?: string | null;
  hazard_description?: string | null;
  hearing_before_decision?: number | string | null;
  implementation_status?: string | null;
  information_complete?: number | string | null;
  legal_basis?: string | null;
  measure_id?: string | null;
  measure_owners?: string | null;
  measure_type?: string | null;
  measures?: string | null;
  mime_type?: string | null;
  missing_information?: string | null;
  next_step?: string | null;
  next_steps?: string | null;
  notes?: string | null;
  occurred_at?: string | null;
  ocr_engine?: string | null;
  ocr_status?: string | null;
  ocr_text?: string | null;
  outcome?: string | null;
  participants?: string | null;
  participation_status?: string | null;
  person_status?: string | null;
  process_id?: string | null;
  proposed_solution?: string | null;
  protection_status?: string | null;
  requested_adjustment?: string | null;
  result?: string | null;
  risk_level?: string | null;
  risk_type?: string | null;
  sbv_assessment?: string | null;
  sbv_position?: string | null;
  source_id?: string | null;
  statement?: string | null;
  status?: string | null;
  summary?: string | null;
  termination_type?: string | null;
  text_extraction_status?: string | null;
  text_extractor_id?: string | null;
  title?: string | null;
  trigger_description?: string | null;
  trigger_type?: string | null;
  type?: string | null;
  updated_at?: string | null;
  violation_summary?: string | null;
  workplace_context?: string | null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function hasTable(db: DatabaseAdapter, table: string): boolean {
  try {
    return Boolean(db.prepare<{ value: number }>("SELECT 1 AS value FROM sqlite_master WHERE type IN ('table','view') AND name = ?").get(table));
  } catch {
    return false;
  }
}

export function hasRequiredTables(db: DatabaseAdapter, tables: readonly string[]): boolean {
  return tables.every((table) => hasTable(db, table));
}

export function text(...parts: unknown[]): string {
  return parts
    .map((part) => (part === null || part === undefined ? '' : String(part)))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');
}

export function bool(value: unknown): boolean {
  return Boolean(Number(value ?? 0));
}

type SqlProviderDefinition = {
  sourceType: CaseSearchSourceType;
  label: string;
  requiredTables: readonly string[];
  allSql: string;
  caseSql: string;
  map(row: SearchProviderRow): CaseSearchDocument;
};

export function makeSqlProvider(definition: SqlProviderDefinition): CaseSearchProvider {
  return {
    sourceType: definition.sourceType,
    label: definition.label,
    requiredTables: definition.requiredTables,
    collectAll(db) {
      if (!hasRequiredTables(db, definition.requiredTables)) return [];
      return db.prepare<SearchProviderRow>(definition.allSql).all().map(definition.map);
    },
    collectForCase(db, caseId) {
      if (!hasRequiredTables(db, definition.requiredTables)) return [];
      return db.prepare<SearchProviderRow>(definition.caseSql).all(caseId).map(definition.map);
    },
    latestUpdatedAtForCase(db, caseId) {
      if (!hasRequiredTables(db, definition.requiredTables)) return undefined;
      const row = db.prepare<{ updated_at?: string }>(`
        SELECT MAX(updated_at) AS updated_at
        FROM (${definition.allSql}) search_provider_source
        WHERE case_id = ?
      `).get(caseId);
      return row?.updated_at || undefined;
    },
    latestUpdatedAtAll(db) {
      if (!hasRequiredTables(db, definition.requiredTables)) return undefined;
      const row = db.prepare<{ updated_at?: string }>(`
        SELECT MAX(updated_at) AS updated_at
        FROM (${definition.allSql}) search_provider_source
      `).get();
      return row?.updated_at || undefined;
    },
  };
}

export function documentFromRow(
  row: SearchProviderRow,
  sourceType: CaseSearchSourceType,
  sourceLabel: string,
  title: string,
  content: string,
  navigationKind: CaseSearchNavigationKind,
  navigationId: string | null | undefined,
  options: Partial<Pick<CaseSearchDocument, 'keywords' | 'occurredAt' | 'confidentiality' | 'containsHealthData' | 'extractionQuality'>> & { navigationSubId?: string } = {},
): CaseSearchDocument {
  return {
    caseId: String(row.case_id),
    caseNumber: row.case_number ?? undefined,
    sourceType,
    sourceId: String(row.source_id ?? row.id),
    sourceLabel,
    title: title.trim() || sourceLabel,
    content: content.trim(),
    keywords: options.keywords?.trim() || undefined,
    occurredAt: options.occurredAt ?? row.occurred_at ?? row.updated_at ?? row.created_at ?? undefined,
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    confidentiality: options.confidentiality ?? 'sensibel',
    containsHealthData: options.containsHealthData ?? true,
    extractionQuality: options.extractionQuality ?? 'structured',
    navigationTarget: {
      kind: navigationKind,
      id: String(navigationId ?? row.source_id ?? row.id),
      subId: options.navigationSubId,
    },
  };
}

