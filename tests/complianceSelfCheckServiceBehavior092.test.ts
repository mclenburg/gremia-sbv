import { describe, expect, it } from 'vitest';
import { ComplianceSelfCheckService } from '../services/complianceSelfCheckService';
import type { DatabaseAdapter } from '../services/databaseService';
import {
  ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS,
  CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  CASE_DOCUMENTS_REQUIRED_COLUMNS,
  CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS,
  CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS,
  CASE_MEASURES_REQUIRED_COLUMNS,
  CASE_MEASURE_NOTES_REQUIRED_COLUMNS,
  CASE_SEARCH_INDEX_REQUIRED_COLUMNS,
  CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS,
  CASES_REQUIRED_COLUMNS,
  COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
  GREMIA_BR_CACHE_REQUIRED_COLUMNS,
  GREMIA_BR_SETTINGS_REQUIRED_COLUMNS,
  PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS,
  PROTECTED_PERSONS_REQUIRED_COLUMNS,
  SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS,
  SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
  GENERATED_DOCUMENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS,
  SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS,
  RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS,
  RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS,
} from '../services/appSchema';

type TableMap = Record<string, readonly string[]>;
type NameRow = { name?: string };

const completeSchema: TableMap = {
  schema_migrations: ['version'],
  cases: CASES_REQUIRED_COLUMNS,
  case_notes: ['id'],
  case_documents: CASE_DOCUMENTS_REQUIRED_COLUMNS,
  generated_documents: GENERATED_DOCUMENTS_REQUIRED_COLUMNS,
  contacts: ['id'],
  deadlines: ['id', 'title', 'due_at', 'status'],
  protected_persons: PROTECTED_PERSONS_REQUIRED_COLUMNS,
  person_case_links: ['id', 'protected_person_id', 'case_file_id', 'link_state'],
  privacy_review_items: ['id', 'case_id', 'protected_person_id', 'reason', 'status', 'due_at'],
  personal_data_audit_log: PERSONAL_DATA_AUDIT_REQUIRED_COLUMNS,
  case_measure_notes: CASE_MEASURE_NOTES_REQUIRED_COLUMNS,
  case_search_index: CASE_SEARCH_INDEX_REQUIRED_COLUMNS,
  case_search_index_fts: ['index_id', 'title', 'content', 'keywords', 'source_label'],
  case_search_index_state: CASE_SEARCH_INDEX_STATE_REQUIRED_COLUMNS,
  case_document_ocr_jobs: CASE_DOCUMENT_OCR_JOBS_REQUIRED_COLUMNS,
  gremia_br_settings: GREMIA_BR_SETTINGS_REQUIRED_COLUMNS,
  gremia_br_cache_entries: GREMIA_BR_CACHE_REQUIRED_COLUMNS,
  case_external_references: CASE_EXTERNAL_REFERENCES_REQUIRED_COLUMNS,
  case_measures: CASE_MEASURES_REQUIRED_COLUMNS,
  case_handover_imports: CASE_HANDOVER_IMPORTS_REQUIRED_COLUMNS,
  case_handover_import_items: CASE_HANDOVER_IMPORT_ITEMS_REQUIRED_COLUMNS,
  sbv_resource_records: SBV_RESOURCE_RECORDS_REQUIRED_COLUMNS,
  sbv_control_protocols: SBV_CONTROL_PROTOCOLS_REQUIRED_COLUMNS,
  compliance_incidents: COMPLIANCE_INCIDENTS_REQUIRED_COLUMNS,
  activity_journal_entries: ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS,
  activity_journal_links: ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS,
  activity_journal_category_preferences: ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS,
  sbv_participation_violations: SBV_PARTICIPATION_VIOLATIONS_REQUIRED_COLUMNS,
  sbv_participation_violation_events: SBV_PARTICIPATION_VIOLATION_EVENTS_REQUIRED_COLUMNS,
  sbv_participation_violation_documents: SBV_PARTICIPATION_VIOLATION_DOCUMENTS_REQUIRED_COLUMNS,
  recruiting_participations: RECRUITING_PARTICIPATIONS_REQUIRED_COLUMNS,
  recruiting_interview_events: RECRUITING_INTERVIEW_EVENTS_REQUIRED_COLUMNS,
};

class SelfCheckDb implements DatabaseAdapter {
  constructor(
    private readonly values: Record<string, number | string> = {},
    private readonly tables: TableMap = completeSchema,
  ) {}

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(): T[] {
        const tableInfo = sql.match(/^PRAGMA table_info\(([^)]+)\)$/i);
        if (tableInfo) return (self.tables[tableInfo[1]] ?? []).map((name) => ({ name }) satisfies NameRow) as T[];
        if (sql.includes('personal_data_audit_log') && sql.includes('ORDER BY sequence ASC')) return [] as T[];
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (sql.includes('sqlite_master')) {
          const table = String(params[0] ?? '');
          return (self.tables[table] ? { value: 1 } : undefined) as T | undefined;
        }
        if (sql.includes('MAX(version)')) return { value: '0047' } as T;
        if (sql.includes('privacy_review_items') && sql.includes('due_at <')) return { value: self.values.overduePrivacyReviews ?? 0 } as T;
        if (sql.includes('privacy_review_items')) return { value: self.values.openPrivacyReviews ?? 0 } as T;
        if (sql.includes('compliance_incidents') && sql.includes("risk_level = 'high'")) return { value: self.values.highIncidents ?? 0 } as T;
        if (sql.includes('compliance_incidents')) return { value: self.values.openIncidents ?? 0 } as T;
        if (sql.includes('handover_valid_until')) return { value: self.values.expiredHandoverCases ?? 0 } as T;
        if (sql.includes('MAX(occurred_at)')) return { value: self.values.lastAuditExport } as T;
        return { value: 0 } as T;
      },
      run(): { changes: number } { return { changes: 0 }; },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('ComplianceSelfCheckService', () => {
  it('bewertet einen sauberen Compliance-Zustand als ok', () => {
    const result = new ComplianceSelfCheckService(new SelfCheckDb({ lastAuditExport: '2026-05-23T10:00:00.000Z' })).evaluate();

    expect(result.status).toBe('ok');
    expect(result.score).toBe(100);
    expect(result.nextActions).toEqual([]);
  });

  it('eskaliert offene hohe Vorfälle und überfällige Datenschutzprüfungen', () => {
    const result = new ComplianceSelfCheckService(new SelfCheckDb({ overduePrivacyReviews: 2, openPrivacyReviews: 2, openIncidents: 1, highIncidents: 1 })).evaluate();

    expect(result.status).toBe('problem');
    expect(result.items.find((entry) => entry.id === 'incidents')?.status).toBe('problem');
    expect(result.items.find((entry) => entry.id === 'privacy-reviews')?.status).toBe('problem');
    expect(result.nextActions.join(' ')).toContain('Vorfallbewertung');
  });
});
