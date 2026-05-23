import type { DatabaseAdapter } from './databaseService.js';
import type {
  DataSubjectAccessPrefill,
  DataSubjectAccessPrefillCase,
  DataSubjectAccessPrefillDeadline,
  DataSubjectAccessPrefillFreeTextMatch,
  DataSubjectAccessPrefillImportRun,
  DataSubjectAccessPrefillLifecycleEvent,
  DataSubjectAccessPrefillMeasure,
  DataSubjectAccessPrefillPerson,
  DataSubjectAccessRequestInput,
} from '../src/app/core/models/compliance.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function optional(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text.length ? text : undefined;
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasTable(db: DatabaseAdapter, name: string): boolean {
  try {
    const row = db.prepare<any>(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

function parseChangedFields(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function rawTokens(value: unknown): string[] {
  return String(value ?? '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function searchTokens(input: DataSubjectAccessRequestInput): string[] {
  return unique([...rawTokens(input.requesterName), ...rawTokens(input.caseReference)]);
}

function nameTokens(input: DataSubjectAccessRequestInput): string[] {
  return unique(rawTokens(input.requesterName));
}

function nameVariants(input: DataSubjectAccessRequestInput): string[] {
  const parts = rawTokens(input.requesterName);
  const variants = [input.requesterName.trim()];
  if (parts.length >= 2) {
    variants.push(parts.join(' '));
    variants.push([...parts].reverse().join(' '));
    variants.push(parts[0]);
    variants.push(parts[parts.length - 1]);
  } else {
    variants.push(...parts);
  }
  return unique(variants.map((value) => value.trim()).filter((value) => value.length >= 2));
}

function allSearchTerms(input: DataSubjectAccessRequestInput): string[] {
  return unique([
    ...nameVariants(input),
    ...searchTokens(input),
  ]);
}

function placeholders(values: string[]): string {
  return values.map(() => '?').join(', ');
}

function textOf(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((column) => row[column]).filter((value) => value !== undefined && value !== null).join(' ');
}

function matchedTermsIn(text: string, terms: string[]): string[] {
  const normalizedText = normalize(text);
  return terms.filter((term) => normalizedText.includes(normalize(term)));
}

function excerpt(text: string, terms: string[], fallback = '—'): string {
  const normalizedText = normalize(text);
  const first = terms
    .map((term) => normalizedText.indexOf(normalize(term)))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, first - 90);
  const end = Math.min(text.length, first + 210);
  const slice = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!slice) return fallback;
  return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
}

function mapPerson(row: any): DataSubjectAccessPrefillPerson {
  const displayName = row.record_kind === 'pseudonymous_request'
    ? row.pseudonym_label || 'Pseudonyme Anfrage'
    : `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return {
    id: row.id,
    displayName,
    recordKind: optional(row.record_kind),
    personnelNumber: optional(row.personnel_number),
    workEmail: optional(row.work_email),
    organizationalUnit: optional(row.organizational_unit),
    location: optional(row.location),
    protectionStatus: optional(row.protection_status),
    employmentState: optional(row.employment_state),
    lifecycleState: optional(row.lifecycle_state),
    statusValidFrom: optional(row.status_valid_from),
    statusValidUntil: optional(row.status_valid_until),
    evidenceCheckedAt: optional(row.evidence_checked_at),
    retentionReviewAt: optional(row.retention_review_at),
    anonymizedAt: optional(row.anonymized_at),
  };
}

function mapLegacyPerson(row: any): DataSubjectAccessPrefillPerson {
  return {
    id: row.id,
    displayName: row.display_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    recordKind: 'legacy_person',
    workEmail: optional(row.email),
    organizationalUnit: optional(row.department),
    protectionStatus: optional(row.sb_status),
    statusValidUntil: optional(row.valid_until),
  };
}

function mapCase(row: any): DataSubjectAccessPrefillCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    displayName: row.display_name,
    category: row.category,
    status: row.status,
    priority: row.priority,
    openedAt: row.opened_at,
    closedAt: optional(row.closed_at),
    privacyReviewRequired: Boolean(row.privacy_review_required),
  };
}

function mapDeadline(row: any): DataSubjectAccessPrefillDeadline {
  return {
    id: row.id,
    title: row.confidential_title || row.title,
    processType: row.process_type,
    deadlineType: row.deadline_type,
    status: row.status,
    severity: row.severity,
    dueAt: row.due_at,
    caseId: optional(row.case_id),
    measureId: optional(row.measure_id),
    legalBasis: optional(row.legal_basis),
  };
}

function mapMeasure(row: any): DataSubjectAccessPrefillMeasure {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.type,
    title: row.title,
    status: row.status,
    riskLevel: row.risk_level,
    openedAt: row.opened_at,
    dueAt: optional(row.due_at),
    closedAt: optional(row.closed_at),
    requiresFollowUp: Boolean(row.requires_follow_up),
  };
}

function mapImport(row: any): DataSubjectAccessPrefillImportRun {
  return {
    id: row.id,
    sourceFileName: row.source_file_name,
    importedAt: row.imported_at,
    action: row.action,
    changedFields: parseChangedFields(row.changed_fields_json),
  };
}

function mapLifecycle(row: any): DataSubjectAccessPrefillLifecycleEvent {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: optional(row.subject_id),
    caseId: optional(row.case_id),
    purpose: row.purpose,
  };
}

interface FreeTextSource {
  table: string;
  sourceType: string;
  sourceLabel: string;
  idColumn: string;
  titleColumn?: string;
  caseIdColumn?: string;
  dateColumn?: string;
  textColumns: string[];
  joinCase?: boolean;
  linkVia?: 'measure' | 'bem_process' | 'prevention_process' | 'sbv_participation';
}

function linkedCaseExpression(source: FreeTextSource): string {
  if (source.caseIdColumn) return `t.${source.caseIdColumn}`;
  if (source.linkVia === 'measure') return 'cm.case_id';
  if (source.linkVia === 'bem_process') return 'bp.case_id';
  if (source.linkVia === 'prevention_process') return 'pp.case_id';
  if (source.linkVia === 'sbv_participation') return 'sp.case_id';
  return 'NULL';
}

function linkedCaseJoin(source: FreeTextSource): string {
  if (source.joinCase && source.caseIdColumn) return `LEFT JOIN cases c ON c.id = t.${source.caseIdColumn}`;
  if (source.linkVia === 'measure') return 'LEFT JOIN case_measures cm ON cm.id = t.measure_id LEFT JOIN cases c ON c.id = cm.case_id';
  if (source.linkVia === 'bem_process') return 'LEFT JOIN bem_processes bp ON bp.id = t.process_id LEFT JOIN cases c ON c.id = bp.case_id';
  if (source.linkVia === 'prevention_process') return 'LEFT JOIN prevention_processes pp ON pp.id = t.process_id LEFT JOIN cases c ON c.id = pp.case_id';
  if (source.linkVia === 'sbv_participation') return 'LEFT JOIN sbv_participations sp ON sp.id = t.participation_id LEFT JOIN cases c ON c.id = sp.case_id';
  return '';
}

function hasLinkedCase(source: FreeTextSource): boolean {
  return Boolean(source.caseIdColumn || source.linkVia);
}


const FREE_TEXT_SOURCES: FreeTextSource[] = [
  { table: 'cases', sourceType: 'case', sourceLabel: 'Fallakte', idColumn: 'id', titleColumn: 'display_name', caseIdColumn: 'id', dateColumn: 'opened_at', textColumns: ['case_number', 'display_name', 'summary', 'privacy_review_reason'] },
  { table: 'case_notes', sourceType: 'case_note', sourceLabel: 'Fallnotiz', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'note_date', textColumns: ['title', 'participants', 'content', 'next_steps'], joinCase: true },
  { table: 'case_measure_notes', sourceType: 'case_measure_note', sourceLabel: 'Maßnahmen-/Prozessnotiz', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'note_at', textColumns: ['title', 'participants', 'content', 'next_steps'], joinCase: true },
  { table: 'case_documents', sourceType: 'case_document', sourceLabel: 'Dokumenttext/OCR', idColumn: 'id', titleColumn: 'display_title', caseIdColumn: 'case_id', dateColumn: 'imported_at', textColumns: ['filename', 'display_title', 'extracted_text', 'ocr_text', 'text_extraction_error', 'ocr_error'], joinCase: true },
  { table: 'case_measures', sourceType: 'case_measure', sourceLabel: 'Maßnahme', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'opened_at', textColumns: ['title', 'summary', 'next_step'], joinCase: true },
  { table: 'case_measure_participation', sourceType: 'participation_measure', sourceLabel: 'SBV-Beteiligungsmaßnahme', idColumn: 'measure_id', titleColumn: 'employer_measure_type', textColumns: ['employer_measure_type', 'person_status', 'decision_stage', 'violation_summary', 'sbv_position'], linkVia: 'measure' },
  { table: 'case_measure_workplace_accommodation', sourceType: 'workplace_accommodation', sourceLabel: 'Arbeitsplatzanpassung', idColumn: 'measure_id', titleColumn: 'category', textColumns: ['category', 'requested_adjustment', 'legal_basis', 'barrier_or_limitation', 'workplace_context', 'proposed_solution', 'outcome'], linkVia: 'measure' },
  { table: 'case_measure_events', sourceType: 'case_measure_event', sourceLabel: 'Maßnahmenereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'measure' },
  { table: 'bem_processes', sourceType: 'bem_process', sourceLabel: 'BEM-Verfahren', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['title', 'trigger_description', 'consent_scope', 'data_retention_note', 'participants', 'measures', 'measure_owners', 'result', 'completion_reason', 'confidential_notes'], joinCase: true },
  { table: 'bem_process_events', sourceType: 'bem_event', sourceLabel: 'BEM-Ereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'bem_process' },
  { table: 'prevention_processes', sourceType: 'prevention_process', sourceLabel: 'Präventionsverfahren', idColumn: 'id', titleColumn: 'difficulty_type', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['difficulty_type', 'risk_type', 'person_status', 'hazard_description', 'employer_request_summary', 'measures', 'result'], joinCase: true },
  { table: 'prevention_process_events', sourceType: 'prevention_event', sourceLabel: 'Präventionsereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'prevention_process' },
  { table: 'equalization_processes', sourceType: 'equalization_process', sourceLabel: 'Gleichstellungs-/GdB-Vorgang', idColumn: 'id', titleColumn: 'application_status', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['application_status', 'agency_reference', 'outcome', 'notes'], joinCase: true },
  { table: 'termination_hearings', sourceType: 'termination_hearing', sourceLabel: 'Kündigungsanhörung', idColumn: 'id', titleColumn: 'termination_type', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['termination_type', 'protection_status', 'employer_reason', 'missing_information', 'sbv_assessment', 'statement'], joinCase: true },
  { table: 'sbv_participations', sourceType: 'sbv_participation', sourceLabel: 'SBV-Beteiligungsmonitor', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'created_at', textColumns: ['title', 'measure_type', 'person_status', 'decision_stage', 'violation_summary', 'sbv_position', 'next_step'], joinCase: true },
  { table: 'sbv_participation_events', sourceType: 'sbv_participation_event', sourceLabel: 'SBV-Beteiligungsereignis', idColumn: 'id', titleColumn: 'title', dateColumn: 'created_at', textColumns: ['event_type', 'title', 'description'], linkVia: 'sbv_participation' },
  { table: 'contact_text_references', sourceType: 'contact_text_reference', sourceLabel: 'Kontakt-Freitextreferenz', idColumn: 'id', titleColumn: 'source_table', dateColumn: 'created_at', textColumns: ['source_table', 'source_column', 'excerpt'] },
  { table: 'case_search_index', sourceType: 'case_search_index', sourceLabel: 'Suchindex-Fundstelle', idColumn: 'id', titleColumn: 'title', caseIdColumn: 'case_id', dateColumn: 'occurred_at', textColumns: ['source_label', 'title', 'content', 'keywords'], joinCase: true },
];

export class DsarPrefillService {
  constructor(private readonly db: DatabaseAdapter) {}

  buildPrefill(input: DataSubjectAccessRequestInput): DataSubjectAccessPrefill {
    const tokens = searchTokens(input);
    const terms = allSearchTerms(input);
    const persons = this.findPersons(input, tokens);
    const protectedPersonIds = persons.filter((person) => person.recordKind !== 'legacy_person').map((person) => person.id);
    const legacyPersonIds = persons.filter((person) => person.recordKind === 'legacy_person').map((person) => person.id);
    const cases = this.findCases(input, tokens, protectedPersonIds, legacyPersonIds);
    const directFreeTextMatches = this.findFreeTextMatches(terms, cases.map((item) => item.id));
    const allCaseIds = unique([...cases.map((item) => item.id), ...directFreeTextMatches.map((item) => item.caseId)]);
    const allCases = this.mergeCases(cases, this.findCasesByIds(allCaseIds));
    const caseIds = allCases.map((item) => item.id);
    const linkedCaseFreeTextMatches = this.findLinkedCaseFreeTextMatches(caseIds, directFreeTextMatches.map((item) => item.id));
    const freeTextMatches = [...directFreeTextMatches, ...linkedCaseFreeTextMatches].slice(0, 160);
    const measures = this.findMeasures(caseIds);
    const deadlines = this.findDeadlines(protectedPersonIds, legacyPersonIds, caseIds, measures.map((item) => item.id));
    const importRuns = this.findImportRuns(protectedPersonIds);
    const lifecycleEvents = this.findLifecycleEvents(protectedPersonIds, legacyPersonIds, caseIds);

    return {
      generatedAt: nowIso(),
      matchReason: this.matchReason(input, tokens, persons.length, allCases.length, freeTextMatches.length),
      persons,
      cases: allCases,
      deadlines,
      measures,
      importRuns,
      lifecycleEvents,
      freeTextMatches,
    };
  }

  private matchReason(input: DataSubjectAccessRequestInput, tokens: string[], personCount: number, caseCount: number, freeTextCount: number): string {
    if (!tokens.length) return 'Keine Suchangaben vorhanden; es wurden keine personenbezogenen Datensätze automatisch vorbefüllt.';
    const parts = [];
    if (input.requesterName.trim()) parts.push(`Name: ${input.requesterName.trim()} (inkl. Vorname-/Nachname-Einzelsuche)`);
    if (input.caseReference.trim()) parts.push(`Fall-/Aktenbezug: ${input.caseReference.trim()}`);
    return `Automatische Vorbefüllung anhand ${parts.join(' · ')}. Treffer: ${personCount} Personenstamm/Personenstämme, ${caseCount} Fallakte(n), ${freeTextCount} Freitext-Fundstelle(n).`;
  }

  private findPersons(input: DataSubjectAccessRequestInput, tokens: string[]): DataSubjectAccessPrefillPerson[] {
    const rowsByKey = new Map<string, DataSubjectAccessPrefillPerson>();
    const terms = unique([...nameVariants(input), ...tokens]);
    if (!terms.length) return [];

    if (hasTable(this.db, 'protected_persons')) {
      const lowerName = input.requesterName.trim().toLowerCase();
      const whereParts: string[] = [];
      const params: string[] = [];
      if (lowerName) {
        whereParts.push(`lower(trim(first_name || ' ' || last_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(trim(last_name || ' ' || first_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(coalesce(pseudonym_label, '')) = ?`);
        params.push(lowerName);
      }
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(pseudonym_label, '') || ' ' || coalesce(personnel_number, '') || ' ' || coalesce(work_email, '') || ' ' || coalesce(notes, '')) LIKE ?`);
        params.push(like);
      }
      const rows = whereParts.length ? this.db.prepare<any>(`
        SELECT * FROM protected_persons
        WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, created_at DESC
        LIMIT 40
      `).all(...params).map(mapPerson) : [];
      rows.forEach((row) => rowsByKey.set(`protected:${row.id}`, row));
    }

    if (hasTable(this.db, 'persons')) {
      const whereParts: string[] = [];
      const params: string[] = [];
      const lowerName = input.requesterName.trim().toLowerCase();
      if (lowerName) {
        whereParts.push(`lower(trim(first_name || ' ' || last_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(trim(last_name || ' ' || first_name)) = ?`);
        params.push(lowerName);
        whereParts.push(`lower(coalesce(display_name, '')) = ?`);
        params.push(lowerName);
      }
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(department, '') || ' ' || coalesce(notes, '')) LIKE ?`);
        params.push(like);
      }
      const rows = whereParts.length ? this.db.prepare<any>(`
        SELECT * FROM persons
        WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
        ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE, updated_at DESC
        LIMIT 40
      `).all(...params).map(mapLegacyPerson) : [];
      rows.forEach((row) => rowsByKey.set(`legacy:${row.id}`, row));
    }

    return Array.from(rowsByKey.values()).slice(0, 80);
  }

  private findCases(input: DataSubjectAccessRequestInput, tokens: string[], protectedPersonIds: string[], legacyPersonIds: string[]): DataSubjectAccessPrefillCase[] {
    if (!hasTable(this.db, 'cases')) return [];
    const rowsById = new Map<string, DataSubjectAccessPrefillCase>();
    if (protectedPersonIds.length && hasTable(this.db, 'person_case_links')) {
      const rows = this.db.prepare<any>(`
        SELECT DISTINCT c.* FROM cases c
        LEFT JOIN person_case_links pcl ON pcl.case_file_id = c.id AND pcl.link_state = 'active'
        WHERE c.protected_person_id IN (${placeholders(protectedPersonIds)}) OR pcl.protected_person_id IN (${placeholders(protectedPersonIds)})
        ORDER BY c.opened_at DESC
        LIMIT 80
      `).all(...protectedPersonIds, ...protectedPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    } else if (protectedPersonIds.length) {
      const rows = this.db.prepare<any>(`
        SELECT DISTINCT * FROM cases
        WHERE protected_person_id IN (${placeholders(protectedPersonIds)})
        ORDER BY opened_at DESC
        LIMIT 80
      `).all(...protectedPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    }

    if (legacyPersonIds.length) {
      const rows = this.db.prepare<any>(`
        SELECT DISTINCT * FROM cases
        WHERE person_id IN (${placeholders(legacyPersonIds)})
        ORDER BY opened_at DESC
        LIMIT 80
      `).all(...legacyPersonIds).map(mapCase);
      rows.forEach((row) => rowsById.set(row.id, row));
    }

    const caseReference = input.caseReference.trim();
    const terms = unique([caseReference, ...tokens]);
    if (terms.length) {
      const whereParts: string[] = [];
      const params: string[] = [];
      for (const token of terms) {
        const like = `%${token.toLowerCase()}%`;
        whereParts.push(`lower(coalesce(case_number, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(privacy_review_reason, '')) LIKE ?`);
        params.push(like);
      }
      if (whereParts.length) {
        const rows = this.db.prepare<any>(`
          SELECT * FROM cases
          WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
          ORDER BY opened_at DESC
          LIMIT 80
        `).all(...params).map(mapCase);
        rows.forEach((row) => rowsById.set(row.id, row));
      }
    }
    return Array.from(rowsById.values()).slice(0, 100);
  }

  private findCasesByIds(caseIds: string[]): DataSubjectAccessPrefillCase[] {
    if (!caseIds.length || !hasTable(this.db, 'cases')) return [];
    return this.db.prepare<any>(`
      SELECT * FROM cases
      WHERE id IN (${placeholders(caseIds)})
      ORDER BY opened_at DESC
      LIMIT 100
    `).all(...caseIds).map(mapCase);
  }

  private mergeCases(primary: DataSubjectAccessPrefillCase[], secondary: DataSubjectAccessPrefillCase[]): DataSubjectAccessPrefillCase[] {
    const byId = new Map<string, DataSubjectAccessPrefillCase>();
    [...primary, ...secondary].forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).slice(0, 100);
  }

  private findFreeTextMatches(terms: string[], knownCaseIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!terms.length) return [];
    const matches: DataSubjectAccessPrefillFreeTextMatch[] = [];
    for (const source of FREE_TEXT_SOURCES) {
      matches.push(...this.findFreeTextMatchesInSource(source, terms, 'name_or_reference', knownCaseIds));
      if (matches.length >= 120) break;
    }
    return this.dedupeFreeTextMatches(matches).slice(0, 120);
  }

  private findLinkedCaseFreeTextMatches(caseIds: string[], existingIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!caseIds.length) return [];
    const existing = new Set(existingIds);
    const matches: DataSubjectAccessPrefillFreeTextMatch[] = [];
    for (const source of FREE_TEXT_SOURCES.filter(hasLinkedCase)) {
      matches.push(...this.findLinkedCaseFreeTextMatchesInSource(source, caseIds, existing));
      if (matches.length >= 80) break;
    }
    return this.dedupeFreeTextMatches(matches).slice(0, 80);
  }

  private findFreeTextMatchesInSource(source: FreeTextSource, terms: string[], matchKind: DataSubjectAccessPrefillFreeTextMatch['matchKind'], knownCaseIds: string[]): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!hasTable(this.db, source.table)) return [];
    const params: string[] = [];
    const textSql = source.textColumns.map((column) => `coalesce(t.${column}, '')`).join(` || ' ' || `);
    const where = terms.map((term) => {
      params.push(`%${term.toLowerCase()}%`);
      return `lower(${textSql}) LIKE ?`;
    }).join(' OR ');
    const caseSelect = linkedCaseExpression(source);
    const caseJoin = linkedCaseJoin(source);
    const caseNumberSelect = caseJoin.includes(' cases c ') ? 'c.case_number' : (source.table === 'cases' ? 't.case_number' : 'NULL');
    const titleSelect = source.titleColumn ? `coalesce(t.${source.titleColumn}, t.${source.idColumn})` : `t.${source.idColumn}`;
    const dateSelect = source.dateColumn ? `t.${source.dateColumn}` : 'NULL';
    const rows = this.db.prepare<any>(`
      SELECT t.*, ${caseSelect} AS __case_id, ${caseNumberSelect} AS __case_number, ${titleSelect} AS __title, ${dateSelect} AS __occurred_at
      FROM ${source.table} t
      ${caseJoin}
      WHERE ${where}
      ORDER BY ${source.dateColumn ? `t.${source.dateColumn}` : `t.${source.idColumn}`} DESC
      LIMIT 40
    `).all(...params);
    return rows.map((row) => this.mapFreeTextRow(source, row, terms, matchKind, knownCaseIds.includes(row.__case_id)));
  }

  private findLinkedCaseFreeTextMatchesInSource(source: FreeTextSource, caseIds: string[], existing: Set<string>): DataSubjectAccessPrefillFreeTextMatch[] {
    if (!hasLinkedCase(source) || !hasTable(this.db, source.table)) return [];
    const caseJoin = linkedCaseJoin(source);
    const caseExpr = linkedCaseExpression(source);
    const caseNumberSelect = caseJoin.includes(' cases c ') ? 'c.case_number' : (source.table === 'cases' ? 't.case_number' : 'NULL');
    const titleSelect = source.titleColumn ? `coalesce(t.${source.titleColumn}, t.${source.idColumn})` : `t.${source.idColumn}`;
    const dateSelect = source.dateColumn ? `t.${source.dateColumn}` : 'NULL';
    const rows = this.db.prepare<any>(`
      SELECT t.*, ${caseExpr} AS __case_id, ${caseNumberSelect} AS __case_number, ${titleSelect} AS __title, ${dateSelect} AS __occurred_at
      FROM ${source.table} t
      ${caseJoin}
      WHERE ${caseExpr} IN (${placeholders(caseIds)})
      ORDER BY ${source.dateColumn ? `t.${source.dateColumn}` : `t.${source.idColumn}`} DESC
      LIMIT 80
    `).all(...caseIds);
    return rows
      .map((row) => this.mapFreeTextRow(source, row, [], 'linked_case', true))
      .filter((row) => !existing.has(row.id));
  }

  private mapFreeTextRow(source: FreeTextSource, row: Record<string, unknown>, terms: string[], matchKind: DataSubjectAccessPrefillFreeTextMatch['matchKind'], linkedKnownCase: boolean): DataSubjectAccessPrefillFreeTextMatch {
    const body = textOf(row, source.textColumns);
    const matched = terms.length ? matchedTermsIn(body, terms) : [];
    const id = `${source.sourceType}:${String(row[source.idColumn] ?? row.__title ?? source.sourceLabel)}`;
    return {
      id,
      sourceType: source.sourceType,
      sourceLabel: source.sourceLabel,
      title: String(row.__title ?? row[source.titleColumn ?? source.idColumn] ?? source.sourceLabel),
      caseId: optional(row.__case_id),
      caseNumber: optional(row.__case_number),
      occurredAt: optional(row.__occurred_at),
      matchedTerms: matched,
      matchKind: matchKind === 'linked_case' || linkedKnownCase && !matched.length ? 'linked_case' : 'name_or_reference',
      excerpt: excerpt(body, matched.length ? matched : terms, 'Fallaktenverknüpfter Freitext ohne Namensnennung im Auszug.'),
      requiresManualReview: true,
    };
  }

  private dedupeFreeTextMatches(matches: DataSubjectAccessPrefillFreeTextMatch[]): DataSubjectAccessPrefillFreeTextMatch[] {
    const byId = new Map<string, DataSubjectAccessPrefillFreeTextMatch>();
    matches.forEach((match) => byId.set(match.id, match));
    return Array.from(byId.values());
  }

  private findDeadlines(protectedPersonIds: string[], legacyPersonIds: string[], caseIds: string[], measureIds: string[]): DataSubjectAccessPrefillDeadline[] {
    if (!hasTable(this.db, 'deadlines')) return [];
    const whereParts: string[] = [];
    const params: string[] = [];
    if (caseIds.length) {
      whereParts.push(`case_id IN (${placeholders(caseIds)})`);
      params.push(...caseIds);
    }
    if (protectedPersonIds.length) {
      whereParts.push(`process_id IN (${placeholders(protectedPersonIds)})`);
      params.push(...protectedPersonIds);
    }
    if (legacyPersonIds.length) {
      whereParts.push(`person_id IN (${placeholders(legacyPersonIds)})`);
      params.push(...legacyPersonIds);
    }
    if (measureIds.length) {
      whereParts.push(`measure_id IN (${placeholders(measureIds)})`);
      params.push(...measureIds);
    }
    if (!whereParts.length) return [];
    return this.db.prepare<any>(`
      SELECT * FROM deadlines
      WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
      ORDER BY due_at ASC
      LIMIT 100
    `).all(...params).map(mapDeadline);
  }

  private findMeasures(caseIds: string[]): DataSubjectAccessPrefillMeasure[] {
    if (!caseIds.length || !hasTable(this.db, 'case_measures')) return [];
    return this.db.prepare<any>(`
      SELECT * FROM case_measures
      WHERE case_id IN (${placeholders(caseIds)})
      ORDER BY opened_at DESC, updated_at DESC
      LIMIT 100
    `).all(...caseIds).map(mapMeasure);
  }

  private findImportRuns(protectedPersonIds: string[]): DataSubjectAccessPrefillImportRun[] {
    if (!protectedPersonIds.length || !hasTable(this.db, 'person_import_run_items') || !hasTable(this.db, 'person_import_runs')) return [];
    return this.db.prepare<any>(`
      SELECT r.id, r.source_file_name, r.imported_at, i.action, i.changed_fields_json
      FROM person_import_run_items i
      JOIN person_import_runs r ON r.id = i.run_id
      WHERE i.protected_person_id IN (${placeholders(protectedPersonIds)})
      ORDER BY r.imported_at DESC, i.row_number ASC
      LIMIT 80
    `).all(...protectedPersonIds).map(mapImport);
  }

  private findLifecycleEvents(protectedPersonIds: string[], legacyPersonIds: string[], caseIds: string[]): DataSubjectAccessPrefillLifecycleEvent[] {
    if (!hasTable(this.db, 'personal_data_audit_log')) return [];
    const whereParts: string[] = [];
    const params: string[] = [];
    const subjectIds = unique([...protectedPersonIds, ...legacyPersonIds]);
    if (subjectIds.length) {
      whereParts.push(`subject_id IN (${placeholders(subjectIds)})`);
      params.push(...subjectIds);
    }
    if (caseIds.length) {
      whereParts.push(`case_id IN (${placeholders(caseIds)})`);
      params.push(...caseIds);
    }
    if (!whereParts.length) return [];
    return this.db.prepare<any>(`
      SELECT id, occurred_at, action, subject_type, subject_id, case_id, purpose
      FROM personal_data_audit_log
      WHERE ${whereParts.map((part) => `(${part})`).join(' OR ')}
      ORDER BY occurred_at DESC, sequence DESC
      LIMIT 100
    `).all(...params).map(mapLifecycle);
  }
}
