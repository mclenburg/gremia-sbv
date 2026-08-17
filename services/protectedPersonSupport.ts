import { createHash } from 'node:crypto';
import type { PersonImportRunItemRecord, PersonImportRunRecord, ProtectedPersonRecord, LeftCompanyReason } from '../src/domain/models/protected-person.model.js';
import { legalToday } from '../src/domain/time/legalTime.js';
export interface ProtectedPersonRow {
  id: string; created_at: string; updated_at: string; record_kind: ProtectedPersonRecord['recordKind'] | null;
  first_name: string | null; last_name: string | null; pseudonym_label: string | null; personnel_number: string | null;
  work_email: string | null; organizational_unit: string | null; location: string | null; employment_state: ProtectedPersonRecord['employmentState'] | null;
  left_company_at: string | null; left_company_reason: LeftCompanyReason | null; protection_status: ProtectedPersonRecord['protectionStatus'] | null;
  status_valid_from: string | null; status_valid_until: string | null; evidence_checked_at: string | null; status_source: ProtectedPersonRecord['statusSource'] | null;
  lifecycle_state: ProtectedPersonRecord['lifecycleState'] | null; expiry_warning_created_at: string | null; expiry_review_due_at: string | null;
  retention_reason: string | null; retention_review_at: string | null; anonymized_at: string | null; anonymization_reason: string | null; notes: string | null;
}
export interface PersonImportRunRow {
  id: string; profile_id: string | null; source_file_name: string; source_file_hash: string; imported_at: string;
  total_rows: number; created_count: number; updated_count: number; unchanged_count: number; conflict_count: number; skipped_count: number; missing_count: number;
}
export interface PersonImportRunItemRow {
  id: string; run_id: string; row_number: number; action: PersonImportRunItemRecord['action']; protected_person_id: string | null;
  match_strategy: PersonImportRunItemRecord['matchStrategy'] | null; conflict_reason: string | null; validation_message: string | null; changed_fields_json: string; created_at: string;
}
export interface ExistingDeadlineRow { id: string; }

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeOptional(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

export function isPastOrTodayDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
  return dateOnly <= legalToday();
}

export function resolveEmploymentState(requested: unknown, leftCompanyAt: string | null | undefined): ProtectedPersonRecord['employmentState'] {
  if (requested === 'unknown') return 'unknown';
  if (requested === 'left_company') return isPastOrTodayDate(leftCompanyAt) ? 'left_company' : 'active_employee';
  return isPastOrTodayDate(leftCompanyAt) ? 'left_company' : 'active_employee';
}

export function mapPerson(row: ProtectedPersonRow): ProtectedPersonRecord {
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

export function mapImportRun(row: PersonImportRunRow): PersonImportRunRecord {
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

export function mapImportItem(row: PersonImportRunItemRow): PersonImportRunItemRecord {
  return {
    id: row.id,
    runId: row.run_id,
    rowNumber: Number(row.row_number ?? 0),
    action: row.action,
    protectedPersonId: row.protected_person_id ?? undefined,
    matchStrategy: row.match_strategy ?? undefined,
    conflictReason: row.conflict_reason ?? undefined,
    validationMessage: row.validation_message ?? undefined,
    changedFields: parseChangedFields(row.changed_fields_json ?? '[]'),
    createdAt: row.created_at
  };
}

export function parseChangedFields(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function hashStableId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 12);
}
