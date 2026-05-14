import type { DatabaseAdapter } from '../databaseService.js';
import type {
  CaseSearchDocument,
  CaseSearchExtractionQuality,
  CaseSearchNavigationKind,
  CaseSearchProvider,
  CaseSearchSourceType,
} from './searchTypes.js';
import type { ConfidentialLevel } from '../../src/app/core/models/case-note.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function hasTable(db: DatabaseAdapter, table: string): boolean {
  try {
    return Boolean(db.prepare<{ value: number }>("SELECT 1 AS value FROM sqlite_master WHERE type IN ('table','view') AND name = ?").get(table));
  } catch {
    return false;
  }
}

function hasRequiredTables(db: DatabaseAdapter, tables: readonly string[]): boolean {
  return tables.every((table) => hasTable(db, table));
}

function text(...parts: unknown[]): string {
  return parts
    .map((part) => (part === null || part === undefined ? '' : String(part)))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');
}

function bool(value: unknown): boolean {
  return Boolean(Number(value ?? 0));
}

type SqlProviderDefinition = {
  sourceType: CaseSearchSourceType;
  label: string;
  requiredTables: readonly string[];
  allSql: string;
  caseSql: string;
  map(row: any): CaseSearchDocument;
};

function makeSqlProvider(definition: SqlProviderDefinition): CaseSearchProvider {
  return {
    sourceType: definition.sourceType,
    label: definition.label,
    requiredTables: definition.requiredTables,
    collectAll(db) {
      if (!hasRequiredTables(db, definition.requiredTables)) return [];
      return db.prepare<any>(definition.allSql).all().map(definition.map);
    },
    collectForCase(db, caseId) {
      if (!hasRequiredTables(db, definition.requiredTables)) return [];
      return db.prepare<any>(definition.caseSql).all(caseId).map(definition.map);
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

function documentFromRow(
  row: any,
  sourceType: CaseSearchSourceType,
  sourceLabel: string,
  title: string,
  content: string,
  navigationKind: CaseSearchNavigationKind,
  navigationId: string,
  options: Partial<Pick<CaseSearchDocument, 'keywords' | 'occurredAt' | 'confidentiality' | 'containsHealthData' | 'extractionQuality'>> & { navigationSubId?: string } = {},
): CaseSearchDocument {
  return {
    caseId: row.case_id,
    caseNumber: row.case_number ?? undefined,
    sourceType,
    sourceId: row.source_id ?? row.id,
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
      id: navigationId,
      subId: options.navigationSubId,
    },
  };
}

export const caseMetadataSearchProvider = makeSqlProvider({
  sourceType: 'case',
  label: 'Fallakte',
  requiredTables: ['cases'],
  allSql: `SELECT id, id AS source_id, id AS case_id, case_number, display_name, category, status, summary, opened_at AS occurred_at, COALESCE(closed_at, opened_at) AS updated_at FROM cases`,
  caseSql: `SELECT id, id AS source_id, id AS case_id, case_number, display_name, category, status, summary, opened_at AS occurred_at, COALESCE(closed_at, opened_at) AS updated_at FROM cases WHERE id = ?`,
  map: (row) => documentFromRow(
    row,
    'case',
    'Fallakte',
    row.display_name ?? row.case_number ?? 'Fallakte',
    text(row.case_number, row.display_name, row.category, row.status, row.summary),
    'case',
    row.id,
    { containsHealthData: true, confidentiality: 'sensibel', extractionQuality: 'structured' },
  ),
});

export const caseNotesSearchProvider = makeSqlProvider({
  sourceType: 'note',
  label: 'Fallnotiz',
  requiredTables: ['case_notes', 'case_note_cases', 'cases'],
  allSql: `
    SELECT n.id, n.id AS source_id, link.case_id, c.case_number, n.title, n.participants, n.content, n.next_steps, n.note_date AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_notes n
    JOIN case_note_cases link ON link.note_id = n.id
    JOIN cases c ON c.id = link.case_id
  `,
  caseSql: `
    SELECT n.id, n.id AS source_id, link.case_id, c.case_number, n.title, n.participants, n.content, n.next_steps, n.note_date AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_notes n
    JOIN case_note_cases link ON link.note_id = n.id
    JOIN cases c ON c.id = link.case_id
    WHERE link.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'note',
    'Fallnotiz',
    row.title ?? 'Gesprächsnotiz',
    text(row.participants, row.content, row.next_steps),
    'note',
    row.id,
    {
      occurredAt: row.occurred_at,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: (row.confidential_level ?? 'sensibel') as ConfidentialLevel,
      extractionQuality: 'manual',
    },
  ),
});

export const caseDocumentsSearchProvider = makeSqlProvider({
  sourceType: 'document',
  label: 'Dokument',
  requiredTables: ['case_documents', 'cases'],
  allSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.extracted_text, d.mime_type, d.created_at AS occurred_at, d.imported_at AS updated_at, d.contains_health_data, d.extraction_quality, d.text_extraction_status, d.text_extractor_id, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
  `,
  caseSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.extracted_text, d.mime_type, d.created_at AS occurred_at, d.imported_at AS updated_at, d.contains_health_data, d.extraction_quality, d.text_extraction_status, d.text_extractor_id, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'document',
    'Dokument',
    row.display_title ?? row.filename ?? 'Dokument',
    text(row.filename, row.extracted_text),
    'document',
    row.id,
    {
      keywords: text(row.mime_type, row.text_extraction_status, row.extraction_quality, row.text_extractor_id, row.ocr_status, row.ocr_engine),
      occurredAt: row.occurred_at,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: 'sensibel',
      extractionQuality: (row.extraction_quality ?? (row.extracted_text ? 'native_text' : 'unknown')) as CaseSearchExtractionQuality,
    },
  ),
});


export const documentOcrSearchProvider = makeSqlProvider({
  sourceType: 'document_ocr',
  label: 'OCR-Text',
  requiredTables: ['case_documents', 'cases'],
  allSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.ocr_text, d.mime_type, d.created_at AS occurred_at, COALESCE(d.ocr_completed_at, d.imported_at) AS updated_at, d.contains_health_data, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.ocr_status = 'completed' AND COALESCE(d.ocr_text, '') <> ''
  `,
  caseSql: `
    SELECT d.id, d.id AS source_id, d.case_id, c.case_number, d.display_title, d.filename, d.ocr_text, d.mime_type, d.created_at AS occurred_at, COALESCE(d.ocr_completed_at, d.imported_at) AS updated_at, d.contains_health_data, d.ocr_status, d.ocr_engine
    FROM case_documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.case_id = ? AND d.ocr_status = 'completed' AND COALESCE(d.ocr_text, '') <> ''
  `,
  map: (row) => documentFromRow(
    row,
    'document_ocr',
    'OCR-Text',
    row.display_title ?? row.filename ?? 'OCR-Text',
    text(row.filename, row.ocr_text),
    'document',
    row.id,
    {
      keywords: text(row.mime_type, row.ocr_status, row.ocr_engine),
      occurredAt: row.occurred_at,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: 'sensibel',
      extractionQuality: 'ocr',
    },
  ),
});

export const caseMeasureNotesSearchProvider = makeSqlProvider({
  sourceType: 'measure_note',
  label: 'Maßnahmennotiz',
  requiredTables: ['case_measure_notes', 'cases'],
  allSql: `
    SELECT n.id, n.id AS source_id, n.case_id, c.case_number, n.measure_type, n.measure_id, n.title, n.participants, n.content, n.next_steps, n.note_at AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_measure_notes n
    JOIN cases c ON c.id = n.case_id
  `,
  caseSql: `
    SELECT n.id, n.id AS source_id, n.case_id, c.case_number, n.measure_type, n.measure_id, n.title, n.participants, n.content, n.next_steps, n.note_at AS occurred_at, n.updated_at, n.contains_health_data, n.confidential_level
    FROM case_measure_notes n
    JOIN cases c ON c.id = n.case_id
    WHERE n.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'measure_note',
    'Maßnahmennotiz',
    row.title ?? 'Maßnahmennotiz',
    text(row.measure_type, row.participants, row.content, row.next_steps),
    'measure',
    row.measure_id,
    {
      navigationSubId: row.id,
      occurredAt: row.occurred_at,
      containsHealthData: bool(row.contains_health_data),
      confidentiality: (row.confidential_level ?? 'sensibel') as ConfidentialLevel,
      extractionQuality: 'manual',
    },
  ),
});

export const bemSearchProvider = makeSqlProvider({
  sourceType: 'bem',
  label: 'BEM',
  requiredTables: ['bem_processes', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.trigger_type, p.trigger_description, p.consent_scope, p.data_retention_note, p.participants, p.measures, p.measure_owners, p.result, p.completion_reason, p.confidential_notes, p.first_meeting_at AS occurred_at, p.updated_at FROM bem_processes p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.trigger_type, p.trigger_description, p.consent_scope, p.data_retention_note, p.participants, p.measures, p.measure_owners, p.result, p.completion_reason, p.confidential_notes, p.first_meeting_at AS occurred_at, p.updated_at FROM bem_processes p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'bem', 'BEM', row.title ?? 'BEM-Verfahren', text(row.trigger_type, row.trigger_description, row.consent_scope, row.data_retention_note, row.participants, row.measures, row.measure_owners, row.result, row.completion_reason, row.confidential_notes), 'process', row.id),
});

export const bemEventSearchProvider = makeSqlProvider({
  sourceType: 'bem_event',
  label: 'BEM-Ereignis',
  requiredTables: ['bem_process_events', 'bem_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM bem_process_events e JOIN bem_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM bem_process_events e JOIN bem_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'bem_event', 'BEM-Ereignis', row.title ?? 'BEM-Ereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const preventionSearchProvider = makeSqlProvider({
  sourceType: 'prevention',
  label: 'Prävention',
  requiredTables: ['prevention_processes', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.difficulty_type, p.risk_type, p.person_status, p.hazard_description, p.employer_request_summary, p.measures, p.result, p.first_knowledge_at AS occurred_at, p.updated_at FROM prevention_processes p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.difficulty_type, p.risk_type, p.person_status, p.hazard_description, p.employer_request_summary, p.measures, p.result, p.first_knowledge_at AS occurred_at, p.updated_at FROM prevention_processes p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'prevention', 'Prävention', 'Präventionsverfahren', text(row.difficulty_type, row.risk_type, row.person_status, row.hazard_description, row.employer_request_summary, row.measures, row.result), 'process', row.id),
});

export const preventionEventSearchProvider = makeSqlProvider({
  sourceType: 'prevention_event',
  label: 'Präventionsereignis',
  requiredTables: ['prevention_process_events', 'prevention_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM prevention_process_events e JOIN prevention_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM prevention_process_events e JOIN prevention_processes p ON p.id = e.process_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'prevention_event', 'Präventionsereignis', row.title ?? 'Präventionsereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const terminationSearchProvider = makeSqlProvider({
  sourceType: 'termination',
  label: 'Kündigungsanhörung',
  requiredTables: ['termination_hearings', 'cases'],
  allSql: `SELECT t.id, t.id AS source_id, t.case_id, c.case_number, t.status, t.termination_type, t.protection_status, t.employer_reason, t.missing_information, t.sbv_assessment, t.statement, t.received_at AS occurred_at, t.updated_at FROM termination_hearings t JOIN cases c ON c.id = t.case_id`,
  caseSql: `SELECT t.id, t.id AS source_id, t.case_id, c.case_number, t.status, t.termination_type, t.protection_status, t.employer_reason, t.missing_information, t.sbv_assessment, t.statement, t.received_at AS occurred_at, t.updated_at FROM termination_hearings t JOIN cases c ON c.id = t.case_id WHERE t.case_id = ?`,
  map: (row) => documentFromRow(row, 'termination', 'Kündigungsanhörung', 'Kündigungsanhörung', text(row.status, row.termination_type, row.protection_status, row.employer_reason, row.missing_information, row.sbv_assessment, row.statement), 'process', row.id),
});

export const equalizationSearchProvider = makeSqlProvider({
  sourceType: 'equalization',
  label: 'Gleichstellung/GdB',
  requiredTables: ['equalization_processes', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, e.case_id, c.case_number, e.application_status, e.agency_reference, e.outcome, e.notes, COALESCE(e.application_submitted_at, e.created_at) AS occurred_at, e.updated_at FROM equalization_processes e JOIN cases c ON c.id = e.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, e.case_id, c.case_number, e.application_status, e.agency_reference, e.outcome, e.notes, COALESCE(e.application_submitted_at, e.created_at) AS occurred_at, e.updated_at FROM equalization_processes e JOIN cases c ON c.id = e.case_id WHERE e.case_id = ?`,
  map: (row) => documentFromRow(row, 'equalization', 'Gleichstellung/GdB', 'Gleichstellung/GdB', text(row.application_status, row.agency_reference, row.outcome, row.notes), 'process', row.id),
});

export const participationSearchProvider = makeSqlProvider({
  sourceType: 'participation',
  label: 'SBV-Beteiligung',
  requiredTables: ['sbv_participations', 'cases'],
  allSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.measure_type, p.status, p.risk_level, p.violation_summary, p.sbv_position, p.next_step, p.first_known_at AS occurred_at, p.updated_at FROM sbv_participations p JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT p.id, p.id AS source_id, p.case_id, c.case_number, p.title, p.measure_type, p.status, p.risk_level, p.violation_summary, p.sbv_position, p.next_step, p.first_known_at AS occurred_at, p.updated_at FROM sbv_participations p JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'participation', 'SBV-Beteiligung', row.title ?? 'SBV-Beteiligung', text(row.measure_type, row.status, row.risk_level, row.violation_summary, row.sbv_position, row.next_step), 'process', row.id),
});

export const participationEventSearchProvider = makeSqlProvider({
  sourceType: 'participation_event',
  label: 'SBV-Beteiligungsereignis',
  requiredTables: ['sbv_participation_events', 'sbv_participations', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM sbv_participation_events e JOIN sbv_participations p ON p.id = e.participation_id JOIN cases c ON c.id = p.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, p.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, p.id AS process_id FROM sbv_participation_events e JOIN sbv_participations p ON p.id = e.participation_id JOIN cases c ON c.id = p.case_id WHERE p.case_id = ?`,
  map: (row) => documentFromRow(row, 'participation_event', 'SBV-Beteiligungsereignis', row.title ?? 'SBV-Beteiligungsereignis', text(row.event_type, row.description), 'process', row.process_id, { navigationSubId: row.id }),
});

export const measureSearchProvider = makeSqlProvider({
  sourceType: 'measure',
  label: 'Maßnahme',
  requiredTables: ['case_measures', 'case_measure_participation', 'cases'],
  allSql: `
    SELECT m.id, m.id AS source_id, m.case_id, c.case_number, m.type, m.title, m.status, m.risk_level, m.summary, m.next_step, m.opened_at AS occurred_at, m.updated_at,
           p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status, p.information_complete, p.hearing_before_decision, p.decision_notified, p.violation_summary, p.sbv_position
    FROM case_measures m
    JOIN cases c ON c.id = m.case_id
    LEFT JOIN case_measure_participation p ON p.measure_id = m.id
  `,
  caseSql: `
    SELECT m.id, m.id AS source_id, m.case_id, c.case_number, m.type, m.title, m.status, m.risk_level, m.summary, m.next_step, m.opened_at AS occurred_at, m.updated_at,
           p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status, p.information_complete, p.hearing_before_decision, p.decision_notified, p.violation_summary, p.sbv_position
    FROM case_measures m
    JOIN cases c ON c.id = m.case_id
    LEFT JOIN case_measure_participation p ON p.measure_id = m.id
    WHERE m.case_id = ?
  `,
  map: (row) => documentFromRow(
    row,
    'measure',
    'Maßnahme',
    row.title ?? 'Maßnahme',
    text(
      row.type,
      row.status,
      row.risk_level,
      row.summary,
      row.next_step,
      row.employer_measure_type,
      row.person_status,
      row.decision_stage,
      row.participation_status,
      row.information_complete ? 'Information vollständig' : undefined,
      row.hearing_before_decision ? 'Anhörung vor Entscheidung' : undefined,
      row.decision_notified ? 'Entscheidung mitgeteilt' : undefined,
      row.violation_summary,
      row.sbv_position,
    ),
    'measure',
    row.id,
  ),
});

export const measureEventSearchProvider = makeSqlProvider({
  sourceType: 'measure_event',
  label: 'Maßnahmenereignis',
  requiredTables: ['case_measure_events', 'case_measures', 'cases'],
  allSql: `SELECT e.id, e.id AS source_id, m.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, m.id AS measure_id FROM case_measure_events e JOIN case_measures m ON m.id = e.measure_id JOIN cases c ON c.id = m.case_id`,
  caseSql: `SELECT e.id, e.id AS source_id, m.case_id, c.case_number, e.title, e.description, e.event_type, e.created_at AS occurred_at, e.created_at AS updated_at, m.id AS measure_id FROM case_measure_events e JOIN case_measures m ON m.id = e.measure_id JOIN cases c ON c.id = m.case_id WHERE m.case_id = ?`,
  map: (row) => documentFromRow(row, 'measure_event', 'Maßnahmenereignis', row.title ?? 'Maßnahmenereignis', text(row.event_type, row.description), 'measure', row.measure_id, { navigationSubId: row.id }),
});

export const workplaceAccommodationSearchProvider = makeSqlProvider({
  sourceType: 'workplace_accommodation',
  label: 'Arbeitsplatzgestaltung',
  requiredTables: ['case_measure_workplace_accommodation', 'case_measures', 'cases'],
  allSql: `SELECT w.measure_id AS id, w.measure_id AS source_id, m.case_id, c.case_number, m.title, w.category, w.accommodation_status, w.requested_adjustment, w.legal_basis, w.barrier_or_limitation, w.workplace_context, w.proposed_solution, w.employer_response_status, w.implementation_status, w.outcome, w.created_at AS occurred_at, w.updated_at FROM case_measure_workplace_accommodation w JOIN case_measures m ON m.id = w.measure_id JOIN cases c ON c.id = m.case_id`,
  caseSql: `SELECT w.measure_id AS id, w.measure_id AS source_id, m.case_id, c.case_number, m.title, w.category, w.accommodation_status, w.requested_adjustment, w.legal_basis, w.barrier_or_limitation, w.workplace_context, w.proposed_solution, w.employer_response_status, w.implementation_status, w.outcome, w.created_at AS occurred_at, w.updated_at FROM case_measure_workplace_accommodation w JOIN case_measures m ON m.id = w.measure_id JOIN cases c ON c.id = m.case_id WHERE m.case_id = ?`,
  map: (row) => documentFromRow(row, 'workplace_accommodation', 'Arbeitsplatzgestaltung', row.title ?? 'Arbeitsplatzgestaltung', text(row.category, row.accommodation_status, row.requested_adjustment, row.legal_basis, row.barrier_or_limitation, row.workplace_context, row.proposed_solution, row.employer_response_status, row.implementation_status, row.outcome), 'measure', row.id),
});

export const CASE_SEARCH_PROVIDERS = [
  caseMetadataSearchProvider,
  caseNotesSearchProvider,
  caseDocumentsSearchProvider,
  documentOcrSearchProvider,
  caseMeasureNotesSearchProvider,
  bemSearchProvider,
  bemEventSearchProvider,
  preventionSearchProvider,
  preventionEventSearchProvider,
  terminationSearchProvider,
  equalizationSearchProvider,
  participationSearchProvider,
  participationEventSearchProvider,
  measureSearchProvider,
  measureEventSearchProvider,
  workplaceAccommodationSearchProvider,
] as const satisfies readonly CaseSearchProvider[];

export function caseSearchSourceLabels(): Record<CaseSearchSourceType, string> {
  return CASE_SEARCH_PROVIDERS.reduce((labels, provider) => {
    labels[provider.sourceType] = provider.label;
    return labels;
  }, {} as Record<CaseSearchSourceType, string>);
}
