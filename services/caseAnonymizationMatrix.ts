export type CaseAnonymizationScope =
  | 'case'
  | 'bem_process'
  | 'prevention_process'
  | 'participation'
  | 'measure'
  | 'deadline'
  | 'violation'
  | 'activity_journal';

export type CaseAnonymizationMatrixEntry = {
  table: string;
  scope: CaseAnonymizationScope;
  freeTextFields?: readonly string[];
  participantFields?: readonly string[];
  alwaysReplaceFields?: Readonly<Record<string, string>>;
  relationStrategy?: 'ENTKOPPELN' | 'LÖSCHEN' | 'REGENERIEREN' | 'ERHALTEN';
  immutable?: boolean;
};

/**
 * Vollständige fachliche Matrix der Datenklassen, die bei einer Fallanonymisierung
 * bewusst behandelt werden. Nicht-personenbezogene Strukturwerte (Status, Daten,
 * Typen, Rechtsnormen) bleiben erhalten. HashChain-Tabellen sind ausdrücklich
 * immutable und werden ausschließlich durch einen neuen Audit-Eintrag ergänzt.
 */
export const CASE_ANONYMIZATION_MATRIX: readonly CaseAnonymizationMatrixEntry[] = [
  { table: 'cases', scope: 'case', freeTextFields: ['summary', 'handover_continue_reason'] },
  { table: 'case_notes', scope: 'case', freeTextFields: ['title', 'content', 'next_steps'], participantFields: ['participants'] },
  { table: 'case_measure_notes', scope: 'case', freeTextFields: ['title', 'content', 'next_steps'], participantFields: ['participants'] },
  { table: 'case_note_cases', scope: 'case', relationStrategy: 'ERHALTEN' },

  { table: 'bem_processes', scope: 'case', freeTextFields: ['title', 'trigger_description', 'consent_scope', 'data_retention_note', 'measures', 'measure_owners', 'result', 'completion_reason', 'confidential_notes'], participantFields: ['participants'] },
  { table: 'bem_process_events', scope: 'bem_process', freeTextFields: ['title', 'description'] },
  { table: 'prevention_processes', scope: 'case', freeTextFields: ['hazard_description', 'employer_request_summary', 'measures', 'result'] },
  { table: 'prevention_process_events', scope: 'prevention_process', freeTextFields: ['title', 'description'] },
  { table: 'equalization_processes', scope: 'case', freeTextFields: ['agency_reference', 'outcome', 'notes'] },
  { table: 'termination_hearings', scope: 'case', freeTextFields: ['integration_office_decision', 'employer_reason', 'missing_information', 'sbv_assessment', 'statement', 'handover_continue_reason'] },
  { table: 'sbv_participations', scope: 'case', freeTextFields: ['title', 'violation_summary', 'sbv_position', 'next_step'] },
  { table: 'sbv_participation_events', scope: 'participation', freeTextFields: ['title', 'description'] },
  { table: 'case_measures', scope: 'case', freeTextFields: ['title', 'summary', 'next_step', 'handover_continue_reason'] },
  { table: 'case_measure_participation', scope: 'measure', freeTextFields: ['violation_summary', 'sbv_position'] },
  { table: 'case_measure_events', scope: 'measure', freeTextFields: ['title', 'description'] },
  { table: 'case_measure_workplace_accommodation', scope: 'measure', freeTextFields: ['requested_adjustment', 'barrier_or_limitation', 'workplace_context', 'proposed_solution', 'outcome'] },

  { table: 'deadlines', scope: 'case', freeTextFields: ['title', 'confidential_title', 'description', 'source_event', 'completed_note', 'cancelled_reason', 'notes'] },
  { table: 'deadline_audit', scope: 'deadline', freeTextFields: ['old_value', 'new_value', 'reason'] },
  { table: 'template_renders', scope: 'case', freeTextFields: ['subject', 'body'] },
  { table: 'case_legal_references', scope: 'case', freeTextFields: ['note'] },
  {
    table: 'case_note_links',
    scope: 'case',
    alwaysReplaceFields: {
      label: '[Verknüpfung im Rahmen der Fallanonymisierung neutralisiert]',
      accessible_label: '[Anonymisierte Verknüpfung öffnen]',
    },
  },
  { table: 'activity_journal_entries', scope: 'activity_journal', freeTextFields: ['title', 'description', 'result_note'] },
  { table: 'sbv_participation_violations', scope: 'violation', freeTextFields: ['subject', 'measure_description', 'wrong_behavior', 'required_behavior', 'consequence_warning'] },
  { table: 'sbv_participation_violation_events', scope: 'violation', freeTextFields: ['note'] },

  { table: 'person_case_links', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'case_contacts', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'bem_process_contacts', scope: 'bem_process', relationStrategy: 'ENTKOPPELN' },
  { table: 'prevention_process_contacts', scope: 'prevention_process', relationStrategy: 'ENTKOPPELN' },
  { table: 'contact_text_references', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'case_external_references', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'case_handover_import_items', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'case_handover_imports', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'activity_journal_links', scope: 'activity_journal', relationStrategy: 'ENTKOPPELN' },
  { table: 'case_documents', scope: 'case', relationStrategy: 'LÖSCHEN' },
  { table: 'case_documents_fts', scope: 'case', relationStrategy: 'REGENERIEREN' },
  { table: 'case_document_ocr_jobs', scope: 'case', relationStrategy: 'LÖSCHEN' },
  { table: 'case_search_index', scope: 'case', relationStrategy: 'REGENERIEREN' },
  { table: 'case_search_index_fts', scope: 'case', relationStrategy: 'REGENERIEREN' },
  { table: 'case_search_index_state', scope: 'case', relationStrategy: 'REGENERIEREN' },
  { table: 'privacy_review_items', scope: 'case', relationStrategy: 'ENTKOPPELN' },
  { table: 'generated_documents', scope: 'case', relationStrategy: 'LÖSCHEN' },
  { table: 'sbv_participation_violation_documents', scope: 'violation', relationStrategy: 'LÖSCHEN' },

  { table: 'personal_data_audit_log', scope: 'case', immutable: true },
  { table: 'audit_log', scope: 'case', immutable: true },
];

export function matrixEntry(table: string): CaseAnonymizationMatrixEntry | undefined {
  return CASE_ANONYMIZATION_MATRIX.find((entry) => entry.table === table);
}
