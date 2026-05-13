import type { DatabaseAdapter } from './databaseService.js';

export type PrivacyAnonymizationValue =
  | 'anonymizationStamp'
  | 'null'
  | 'zero'
  | { literal: string };

export type CasePrivacyEntityDefinition = {
  key: string;
  table: string;
  idColumn: string;
  caseColumn: string;
  pendingMarkerFields: readonly string[];
  anonymizeFields: Readonly<Record<string, PrivacyAnonymizationValue>>;
  deleteWithCase: boolean;
};

export const CASE_PRIVACY_ENTITY_REGISTRY = [
  {
    key: 'case-file',
    table: 'cases',
    idColumn: 'id',
    caseColumn: 'id',
    pendingMarkerFields: ['summary'],
    anonymizeFields: { summary: 'anonymizationStamp' },
    deleteWithCase: true,
  },
  {
    key: 'case-note',
    table: 'case_notes',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['title', 'participants', 'content', 'next_steps'],
    anonymizeFields: {
      participants: { literal: '[anonymisiert]' },
      content: 'anonymizationStamp',
      next_steps: 'null',
      contains_health_data: 'zero',
    },
    deleteWithCase: true,
  },
  {
    key: 'case-document',
    table: 'case_documents',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['display_title', 'extracted_text'],
    anonymizeFields: {
      display_title: { literal: '[Dokument anonymisiert]' },
      extracted_text: 'null',
    },
    deleteWithCase: true,
  },
  {
    key: 'bem-process',
    table: 'bem_processes',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['title', 'trigger_description', 'consent_scope', 'data_retention_note', 'participants', 'measures', 'measure_owners', 'result', 'completion_reason', 'confidential_notes'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'bem-process-event',
    table: 'bem_process_events',
    idColumn: 'id',
    caseColumn: 'process_id',
    pendingMarkerFields: ['title', 'description'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'prevention-process',
    table: 'prevention_processes',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['hazard_description', 'employer_request_summary', 'measures', 'result'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'prevention-process-event',
    table: 'prevention_process_events',
    idColumn: 'id',
    caseColumn: 'process_id',
    pendingMarkerFields: ['title', 'description'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'equalization-process',
    table: 'equalization_processes',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['agency_reference', 'outcome', 'notes'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'termination-hearing',
    table: 'termination_hearings',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['employer_reason', 'missing_information', 'sbv_assessment', 'statement'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'sbv-participation',
    table: 'sbv_participations',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['title', 'violation_summary', 'sbv_position', 'next_step'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'sbv-participation-event',
    table: 'sbv_participation_events',
    idColumn: 'id',
    caseColumn: 'participation_id',
    pendingMarkerFields: ['title', 'description'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'case-measure',
    table: 'case_measures',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['title', 'summary', 'next_step'],
    anonymizeFields: {},
    deleteWithCase: false,
  },
  {
    key: 'case-measure-note',
    table: 'case_measure_notes',
    idColumn: 'id',
    caseColumn: 'case_id',
    pendingMarkerFields: ['title', 'participants', 'content', 'next_steps'],
    anonymizeFields: {
      title: { literal: '[Maßnahmennotiz anonymisiert]' },
      participants: { literal: '[anonymisiert]' },
      content: 'anonymizationStamp',
      next_steps: 'null',
      contains_health_data: 'zero',
      confidential_level: { literal: 'normal' },
    },
    deleteWithCase: true,
  },
] as const satisfies readonly CasePrivacyEntityDefinition[];

const CASE_ID_TABLES = new Set(['cases', 'case_notes', 'case_documents', 'bem_processes', 'prevention_processes', 'equalization_processes', 'termination_hearings', 'sbv_participations', 'case_measures', 'case_measure_notes']);

export function getCasePrivacyEntities(): readonly CasePrivacyEntityDefinition[] {
  return CASE_PRIVACY_ENTITY_REGISTRY;
}

export function getCasePrivacyEntity(table: string): CasePrivacyEntityDefinition | undefined {
  return CASE_PRIVACY_ENTITY_REGISTRY.find((entry) => entry.table === table);
}

export function directCasePrivacyEntities(): readonly CasePrivacyEntityDefinition[] {
  return CASE_PRIVACY_ENTITY_REGISTRY.filter((entry) => CASE_ID_TABLES.has(entry.table));
}

export function casePrivacyTables(): string[] {
  return CASE_PRIVACY_ENTITY_REGISTRY.map((entry) => entry.table);
}

export function existingColumns(db: DatabaseAdapter, table: string): Set<string> {
  try {
    return new Set(
      db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all()
        .map((row) => row.name)
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export function caseWhereSql(entity: CasePrivacyEntityDefinition): string {
  return `WHERE ${entity.caseColumn} = ?`;
}

export function resolveAnonymizationValue(value: PrivacyAnonymizationValue, stamp: string): unknown {
  if (value === 'anonymizationStamp') return stamp;
  if (value === 'null') return null;
  if (value === 'zero') return 0;
  return value.literal;
}
