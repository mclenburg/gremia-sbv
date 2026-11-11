type CaseKind = keyof typeof VACATION_V5_CASE_ROW_FIELDS;

/** Case fields are staged separately until the collector and importer support their references and document bytes. */
export const VACATION_V5_CASE_ROW_FIELDS = {
  protected_person: {
    table: 'protected_persons', references: ['id'], localOnly: ['expiry_warning_created_at', 'expiry_review_due_at', 'retention_reason', 'retention_review_at', 'anonymized_at', 'anonymization_reason'],
    required: ['first_name', 'last_name', 'protection_status'],
    fields: ['created_at', 'updated_at', 'record_kind', 'pseudonym_label', 'first_name', 'last_name', 'personnel_number', 'work_email', 'organizational_unit', 'location', 'employment_state', 'left_company_at', 'left_company_reason', 'protection_status', 'status_valid_from', 'status_valid_until', 'evidence_checked_at', 'status_source', 'lifecycle_state', 'notes'],
  },
  case: {
    table: 'cases', references: ['id', 'person_id', 'protected_person_id'],
    localOnly: ['is_locked', 'privacy_review_required', 'privacy_review_reason', 'privacy_review_due_at', 'privacy_review_priority', 'anonymization_recommended', 'anonymized_at', 'handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'],
    required: ['case_number', 'display_name', 'category', 'status', 'opened_at'],
    fields: ['case_number', 'display_name', 'category', 'status', 'priority', 'opened_at', 'closed_at', 'summary', 'risk_level', 'is_pseudonymized', 'review_at', 'created_at', 'updated_at', 'person_binding_state'],
  },
  case_note: {
    table: 'case_notes', references: ['id', 'case_id'], localOnly: [],
    required: ['title', 'note_date', 'note_type', 'content'],
    fields: ['title', 'note_date', 'note_type', 'participants', 'content', 'next_steps', 'contains_health_data', 'confidential_level', 'created_at', 'updated_at'],
  },
  case_measure: {
    table: 'case_measures', references: ['id', 'case_id', 'source_id'],
    localOnly: ['handover_import_id', 'handover_package_id', 'handover_valid_until', 'handover_status', 'handover_continue_confirmed_at', 'handover_continue_reason'],
    required: ['type', 'title', 'status', 'opened_at'],
    fields: ['type', 'title', 'status', 'risk_level', 'created_from', 'summary', 'next_step', 'due_at', 'opened_at', 'closed_at', 'requires_follow_up', 'created_at', 'updated_at'],
  },
  case_measure_note: {
    table: 'case_measure_notes', references: ['id', 'case_id', 'measure_id'], localOnly: [],
    required: ['measure_type', 'title', 'note_at', 'content'],
    fields: ['measure_type', 'title', 'note_at', 'participants', 'content', 'next_steps', 'contains_health_data', 'confidential_level', 'created_at', 'updated_at'],
  },
  case_document: {
    table: 'case_documents', references: ['id', 'case_id', 'measure_id'],
    localOnly: ['storage_path', 'document_key', 'iv', 'auth_tag', 'extracted_text', 'imported_at', 'extraction_quality', 'text_extraction_status', 'text_extracted_at', 'text_extractor_id', 'text_extraction_error', 'ocr_status', 'ocr_text', 'ocr_engine', 'ocr_started_at', 'ocr_completed_at', 'ocr_error', 'remote_document_id', 'remote_version_id', 'remote_title'],
    required: ['filename', 'sha256', 'size_bytes'],
    fields: ['filename', 'display_title', 'mime_type', 'sha256', 'size_bytes', 'contains_health_data', 'created_at'],
  },
} as const;

function configuration(kind: string): (typeof VACATION_V5_CASE_ROW_FIELDS)[CaseKind] {
  if (!Object.hasOwn(VACATION_V5_CASE_ROW_FIELDS, kind)) throw new Error('Unbekannter Fallabschnitt im Vertretungspaket.');
  return VACATION_V5_CASE_ROW_FIELDS[kind as CaseKind];
}

export function assertVacationV5CaseRow(kind: string, input: unknown): Record<string, string | number | boolean | null> {
  const config = configuration(kind);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ungültige Fallabschnittsdaten.');
  const row = input as Record<string, unknown>;
  const allowed: readonly string[] = config.fields;
  if (Object.keys(row).some((key) => !allowed.includes(key))) throw new Error('Unerwartete Felder im Fallabschnitt.');
  if (config.required.some((key) => row[key] === undefined || row[key] === null || row[key] === '')) {
    throw new Error('Pflichtfelder im Fallabschnitt fehlen.');
  }
  for (const value of Object.values(row)) {
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Ungültiger Wert im Fallabschnitt.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Ungültiger Wert im Fallabschnitt.');
  }
  if (Buffer.byteLength(JSON.stringify(row), 'utf8') > 64 * 1024) throw new Error('Eine Fallabschnittszeile ist zu groß.');
  return row as Record<string, string | number | boolean | null>;
}

export function projectVacationV5CaseRow(kind: string, source: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const projected: Record<string, unknown> = {};
  for (const field of configuration(kind).fields) if (Object.hasOwn(source, field)) projected[field] = source[field];
  return assertVacationV5CaseRow(kind, projected);
}
