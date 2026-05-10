import { randomUUID, createHash } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DeadlineService } from './deadlineService.js';
import { PersonCaseLinkService } from './personCaseLinkService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { assertPersonPrivacyReason, decideStructuredPersonAnonymization } from './personAnonymizationPolicy.js';
import type {
  CreateProtectedPersonInput,
  PersonCaseLinkRecord,
  PersonImportRunItemRecord,
  PersonImportRunRecord,
  ProtectedPersonListFilters,
  ProtectedPersonRecord,
  UpdateProtectedPersonInput
} from '../src/app/core/models/protected-person.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOptional(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function isPastOrTodayDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateOnly <= today;
}

function resolveEmploymentState(requested: unknown, leftCompanyAt: string | null | undefined): ProtectedPersonRecord['employmentState'] {
  if (requested === 'unknown') return 'unknown';
  if (requested === 'left_company') return isPastOrTodayDate(leftCompanyAt) ? 'left_company' : 'active_employee';
  return isPastOrTodayDate(leftCompanyAt) ? 'left_company' : 'active_employee';
}

function mapPerson(row: any): ProtectedPersonRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recordKind: row.record_kind ?? 'identified_person',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    pseudonymLabel: row.pseudonym_label ?? undefined,
    personnelNumber: row.personnel_number ?? undefined,
    workEmail: row.work_email ?? undefined,
    organizationalUnit: row.organizational_unit ?? undefined,
    location: row.location ?? undefined,
    employmentState: resolveEmploymentState(row.employment_state, row.left_company_at),
    leftCompanyAt: row.left_company_at ?? undefined,
    leftCompanyReason: row.left_company_reason ?? undefined,
    protectionStatus: row.protection_status ?? 'unclear',
    statusValidFrom: row.status_valid_from ?? undefined,
    statusValidUntil: row.status_valid_until ?? undefined,
    evidenceCheckedAt: row.evidence_checked_at ?? undefined,
    statusSource: row.status_source ?? 'unknown',
    lifecycleState: row.lifecycle_state ?? 'active',
    expiryWarningCreatedAt: row.expiry_warning_created_at ?? undefined,
    expiryReviewDueAt: row.expiry_review_due_at ?? undefined,
    retentionReason: row.retention_reason ?? undefined,
    retentionReviewAt: row.retention_review_at ?? undefined,
    anonymizedAt: row.anonymized_at ?? undefined,
    anonymizationReason: row.anonymization_reason ?? undefined,
    notes: row.notes ?? undefined
  };
}

function mapImportRun(row: any): PersonImportRunRecord {
  return {
    id: row.id,
    profileId: row.profile_id ?? undefined,
    sourceFileName: row.source_file_name,
    sourceFileHash: row.source_file_hash,
    importedAt: row.imported_at,
    totalRows: Number(row.total_rows ?? 0),
    createdCount: Number(row.created_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    unchangedCount: Number(row.unchanged_count ?? 0),
    conflictCount: Number(row.conflict_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    missingCount: Number(row.missing_count ?? 0)
  };
}

function mapImportItem(row: any): PersonImportRunItemRecord {
  return {
    id: row.id,
    runId: row.run_id,
    rowNumber: Number(row.row_number ?? 0),
    action: row.action,
    protectedPersonId: row.protected_person_id ?? undefined,
    matchStrategy: row.match_strategy ?? undefined,
    conflictReason: row.conflict_reason ?? undefined,
    validationMessage: row.validation_message ?? undefined,
    changedFields: JSON.parse(row.changed_fields_json ?? '[]'),
    createdAt: row.created_at
  };
}

function hashStableId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 12);
}

export class ProtectedPersonService {
  constructor(private readonly db: DatabaseAdapter) {}

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, purpose: string, metadata?: Record<string, unknown>): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'protected_person', subjectId, purpose, metadata });
    } catch (error) {
      console.warn('Gremia.SBV protected person audit failed', error);
    }
  }

  create(input: CreateProtectedPersonInput): ProtectedPersonRecord {
    const recordKind = input.recordKind ?? 'identified_person';
    const firstName = normalizeOptional(input.firstName) ?? '';
    const lastName = normalizeOptional(input.lastName) ?? '';
    const pseudonymLabel = normalizeOptional(input.pseudonymLabel);
    if (recordKind === 'identified_person' && (!firstName || !lastName)) throw new Error('Vor- und Nachname sind Pflichtfelder.');
    if (recordKind === 'pseudonymous_request' && (input.personnelNumber || input.workEmail || input.organizationalUnit || input.location)) throw new Error('Anonyme Anfragen dürfen keine Direktidentifikatoren enthalten.');
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO protected_persons (
        id, created_at, updated_at, record_kind, pseudonym_label, first_name, last_name, personnel_number, work_email,
        organizational_unit, location, employment_state, left_company_at, left_company_reason,
        protection_status, status_valid_from, status_valid_until, evidence_checked_at, status_source,
        lifecycle_state, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      timestamp,
      recordKind,
      pseudonymLabel,
      firstName,
      lastName,
      normalizeOptional(input.personnelNumber),
      normalizeOptional(input.workEmail),
      normalizeOptional(input.organizationalUnit),
      normalizeOptional(input.location),
      resolveEmploymentState(input.employmentState, normalizeOptional(input.leftCompanyAt)),
      normalizeOptional(input.leftCompanyAt),
      normalizeOptional(input.leftCompanyReason),
      input.protectionStatus,
      normalizeOptional(input.statusValidFrom),
      normalizeOptional(input.statusValidUntil),
      normalizeOptional(input.evidenceCheckedAt),
      input.statusSource ?? 'manual',
      'active',
      normalizeOptional(input.notes)
    );
    this.audit('create', id, 'Personenverzeichnis: geschützte Person angelegt', { source: input.statusSource ?? 'manual', recordKind, hasPersonnelNumber: Boolean(input.personnelNumber) });
    return this.get(id)!;
  }

  update(id: string, input: UpdateProtectedPersonInput): ProtectedPersonRecord {
    const before = this.get(id);
    if (!before) throw new Error(`Person nicht gefunden: ${id}`);
    const merged = { ...before, ...input };
    if ((merged.recordKind ?? 'identified_person') === 'identified_person' && (!normalizeOptional(merged.firstName) || !normalizeOptional(merged.lastName))) throw new Error('Vor- und Nachname sind Pflichtfelder.');
    this.db.prepare(`
      UPDATE protected_persons SET
        updated_at = ?, record_kind = ?, pseudonym_label = ?, first_name = ?, last_name = ?, personnel_number = ?, work_email = ?,
        organizational_unit = ?, location = ?, employment_state = ?, left_company_at = ?, left_company_reason = ?,
        protection_status = ?, status_valid_from = ?, status_valid_until = ?, evidence_checked_at = ?, status_source = ?,
        lifecycle_state = ?, expiry_warning_created_at = ?, expiry_review_due_at = ?, retention_reason = ?, retention_review_at = ?,
        anonymization_reason = ?, notes = ?
      WHERE id = ?
    `).run(
      nowIso(),
      merged.recordKind ?? 'identified_person',
      normalizeOptional(merged.pseudonymLabel),
      merged.firstName,
      merged.lastName,
      normalizeOptional(merged.personnelNumber),
      normalizeOptional(merged.workEmail),
      normalizeOptional(merged.organizationalUnit),
      normalizeOptional(merged.location),
      resolveEmploymentState(merged.employmentState, normalizeOptional(merged.leftCompanyAt)),
      normalizeOptional(merged.leftCompanyAt),
      normalizeOptional(merged.leftCompanyReason),
      merged.protectionStatus,
      normalizeOptional(merged.statusValidFrom),
      normalizeOptional(merged.statusValidUntil),
      normalizeOptional(merged.evidenceCheckedAt),
      merged.statusSource,
      merged.lifecycleState,
      normalizeOptional(merged.expiryWarningCreatedAt),
      normalizeOptional(merged.expiryReviewDueAt),
      normalizeOptional(merged.retentionReason),
      normalizeOptional(merged.retentionReviewAt),
      normalizeOptional(merged.anonymizationReason),
      normalizeOptional(merged.notes),
      id
    );
    this.audit('update', id, 'Personenverzeichnis: geschützte Person geändert', { changedFields: Object.keys(input) });
    return this.get(id)!;
  }

  get(id: string): ProtectedPersonRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM protected_persons WHERE id = ?').get(id);
    if (!row) return undefined;
    return mapPerson(row);
  }

  list(filters: ProtectedPersonListFilters = {}): ProtectedPersonRecord[] {
    this.audit('read', undefined, 'Personenverzeichnis angezeigt', { hasQuery: Boolean(filters.query) });
    let rows = this.db.prepare<any>('SELECT * FROM protected_persons ORDER BY last_name, first_name').all().map(mapPerson);
    const query = filters.query?.trim().toLowerCase();
    if (query) {
      rows = rows.filter((person) => [person.firstName, person.lastName, person.personnelNumber, person.workEmail, person.organizationalUnit, person.location].some((value) => value?.toLowerCase().includes(query)));
    }
    if (filters.protectionStatus?.length) rows = rows.filter((person) => filters.protectionStatus!.includes(person.protectionStatus));
    if (filters.employmentState?.length) rows = rows.filter((person) => filters.employmentState!.includes(person.employmentState));
    if (filters.lifecycleState?.length) rows = rows.filter((person) => filters.lifecycleState!.includes(person.lifecycleState));
    if (filters.expiringWithinDays !== undefined) {
      const until = new Date();
      until.setUTCDate(until.getUTCDate() + filters.expiringWithinDays);
      rows = rows.filter((person) => person.statusValidUntil && new Date(person.statusValidUntil) <= until);
    }
    return rows;
  }

  findByPersonnelNumber(personnelNumber: string): ProtectedPersonRecord | undefined {
    const normalized = normalizeOptional(personnelNumber);
    if (!normalized) return undefined;
    const row = this.db.prepare<any>('SELECT * FROM protected_persons WHERE personnel_number = ? LIMIT 1').get(normalized);
    return row ? mapPerson(row) : undefined;
  }

  findByWorkEmail(workEmail: string): ProtectedPersonRecord | undefined {
    const normalized = normalizeOptional(workEmail)?.toLowerCase();
    if (!normalized) return undefined;
    const row = this.db.prepare<any>('SELECT * FROM protected_persons WHERE lower(work_email) = ? LIMIT 1').get(normalized);
    return row ? mapPerson(row) : undefined;
  }

  findNameConflict(firstName: string, lastName: string): ProtectedPersonRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM protected_persons WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?) LIMIT 1').get(firstName.trim(), lastName.trim());
    return row ? mapPerson(row) : undefined;
  }

  linkCase(protectedPersonId: string, caseFileId: string, linkReason?: string): PersonCaseLinkRecord {
    const link = new PersonCaseLinkService(this.db).linkCase(protectedPersonId, caseFileId, linkReason);
    this.audit('update', protectedPersonId, 'Personenverzeichnis: Fallakte verknüpft', { caseFileId });
    return link;
  }

  listCaseLinks(protectedPersonId: string): PersonCaseLinkRecord[] {
    return new PersonCaseLinkService(this.db).listCaseLinks(protectedPersonId);
  }

  listImportRuns(limit = 20): PersonImportRunRecord[] {
    return this.db.prepare<any>('SELECT * FROM person_import_runs ORDER BY imported_at DESC LIMIT ?').all(limit).map(mapImportRun);
  }

  getImportRun(id: string): PersonImportRunRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM person_import_runs WHERE id = ?').get(id);
    if (!row) return undefined;
    const run = mapImportRun(row);
    run.items = this.db.prepare<any>('SELECT * FROM person_import_run_items WHERE run_id = ? ORDER BY row_number ASC').all(id).map(mapImportItem);
    return run;
  }

  recordImportRun(input: Omit<PersonImportRunRecord, 'id' | 'importedAt'> & { id?: string; importedAt?: string; items: Omit<PersonImportRunItemRecord, 'id' | 'runId' | 'createdAt'>[] }): PersonImportRunRecord {
    const id = input.id ?? randomUUID();
    const importedAt = input.importedAt ?? nowIso();
    this.db.prepare(`
      INSERT INTO person_import_runs (
        id, profile_id, source_file_name, source_file_hash, imported_at, total_rows,
        created_count, updated_count, unchanged_count, conflict_count, skipped_count, missing_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.profileId ?? null, input.sourceFileName, input.sourceFileHash, importedAt, input.totalRows, input.createdCount, input.updatedCount, input.unchangedCount, input.conflictCount, input.skippedCount, input.missingCount);
    for (const item of input.items) {
      this.db.prepare(`
        INSERT INTO person_import_run_items (
          id, run_id, row_number, action, protected_person_id, match_strategy, conflict_reason,
          validation_message, changed_fields_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), id, item.rowNumber, item.action, item.protectedPersonId ?? null, item.matchStrategy ?? null, item.conflictReason ?? null, item.validationMessage ?? null, JSON.stringify(item.changedFields ?? []), importedAt);
    }
    this.audit('import', id, 'Personenverzeichnis: Arbeitgeberliste importiert', { totalRows: input.totalRows, created: input.createdCount, updated: input.updatedCount, conflicts: input.conflictCount });
    return this.getImportRun(id)!;
  }

  anonymizeStructuredData(id: string, reason: string): ProtectedPersonRecord {
    const before = this.get(id);
    if (!before) throw new Error(`Person nicht gefunden: ${id}`);
    const timestamp = nowIso();
    const normalizedReason = assertPersonPrivacyReason(reason);
    const decision = decideStructuredPersonAnonymization(id);
    this.db.prepare(`
      UPDATE protected_persons SET
        record_kind = 'pseudonymous_request',
        pseudonym_label = ?,
        first_name = ?,
        last_name = ?,
        personnel_number = ?,
        work_email = ?,
        organizational_unit = ?,
        location = ?,
        lifecycle_state = ?,
        anonymized_at = ?,
        anonymization_reason = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      decision.pseudonymLabel,
      decision.firstName,
      decision.lastName,
      decision.personnelNumber,
      decision.workEmail,
      decision.organizationalUnit,
      decision.location,
      decision.lifecycleState,
      timestamp,
      normalizedReason,
      decision.notes,
      timestamp,
      id
    );
    const links = new PersonCaseLinkService(this.db).markPersonAnonymized(id, timestamp);
    links.forEach((link) => {
      this.db.prepare(`UPDATE cases SET summary = COALESCE(summary, ''), updated_at = ? WHERE id = ?`).run(timestamp, link.caseFileId);
    });
    this.audit('anonymize', id, 'Personenverzeichnis: strukturierte Daten anonymisiert', { subjectId: id, timestamp, reasonCode: 'structured_person_anonymization' });
    return this.get(id)!;
  }

  createStatusExpiryWarning(person: ProtectedPersonRecord, dueAt: string, referenceDate = new Date()): void {
    const existing = this.db.prepare<any>(`
      SELECT id FROM deadlines
      WHERE process_id = ? AND source_event = 'protected_person.status_expiry_warning' AND status IN ('open', 'overdue')
      LIMIT 1
    `).get(person.id);
    if (existing) return;
    const deadlineService = new DeadlineService(this.db);
    deadlineService.create({
      processId: person.id,
      processType: 'custom',
      deadlineType: 'warning',
      title: 'Statusnachweis läuft ab',
      confidentialTitle: 'Gremia.SBV: Statusnachweis prüfen',
      description: 'Datenschutzfreundliche Wiedervorlage: Bitte Personenverzeichnis in Gremia.SBV prüfen. Keine Namen in externe Kalender übernehmen.',
      dueAt,
      reminderAt: referenceDate.toISOString(),
      sourceEvent: 'protected_person.status_expiry_warning',
      severity: 'important',
      calculationMode: 'workflow',
      warningThresholdHours: 24 * 30,
      criticalThresholdHours: 24 * 7,
      isUserEditable: false
    });
  }

  createStatusExpiredPrivacyReview(person: ProtectedPersonRecord, dueAt: string, referenceDate = new Date()): void {
    const existing = this.db.prepare<any>(`
      SELECT id FROM deadlines
      WHERE process_id = ? AND source_event = 'protected_person.status_expired_privacy_review' AND status IN ('open', 'overdue')
      LIMIT 1
    `).get(person.id);
    if (existing) return;
    const deadlineService = new DeadlineService(this.db);
    deadlineService.create({
      processId: person.id,
      processType: 'custom',
      deadlineType: 'warning',
      title: 'Datenschutzprüfung nach Statusablauf',
      confidentialTitle: 'Gremia.SBV: Datenschutzprüfung Personenverzeichnis',
      description: 'Datenschutzfreundliche Wiedervorlage: Schutzstatus ist abgelaufen. Bitte Fortspeicherung, Anonymisierung oder Löschung prüfen.',
      dueAt,
      reminderAt: referenceDate.toISOString(),
      sourceEvent: 'protected_person.status_expired_privacy_review',
      severity: 'critical',
      calculationMode: 'workflow',
      warningThresholdHours: 24,
      criticalThresholdHours: 0,
      isUserEditable: false
    });
  }


  createAnonymousRequest(sequenceLabel?: string): ProtectedPersonRecord {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const label = sequenceLabel?.trim() || `Anonyme Anfrage ${stamp}-${hashStableId(randomUUID()).slice(0, 4)}`;
    return this.create({
      recordKind: 'pseudonymous_request',
      firstName: '',
      lastName: '',
      pseudonymLabel: label,
      protectionStatus: 'unclear',
      employmentState: 'unknown',
      statusSource: 'manual'
    });
  }

}