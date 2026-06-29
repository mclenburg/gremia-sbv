import type {
  RecruitingAccessibilityCheckStatus,
  RecruitingApplicantReferenceMode,
  RecruitingApplicantStatus,
  RecruitingParticipationStatus,
  RecruitingViolationReviewReason,
} from '../src/app/core/models/recruiting-participation.model.js';
import {
  RECRUITING_ACCESSIBILITY_CHECK_STATUSES,
  RECRUITING_APPLICANT_REFERENCE_MODES,
  RECRUITING_APPLICANT_STATUSES,
  RECRUITING_PARTICIPATION_STATUSES,
  RECRUITING_VIOLATION_REVIEW_REASONS,
} from '../src/app/core/models/recruiting-participation.model.js';

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeOptionalIso(value: unknown): string | null {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text;
  const parsed = new Date(withTime);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Ungültiges Datum: ${text}`);
  return parsed.toISOString();
}

export function normalizeRequiredIso(value: unknown, fieldName: string): string {
  const iso = normalizeOptionalIso(value);
  if (!iso) throw new Error(`${fieldName} ist erforderlich.`);
  return iso;
}

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}

export function normalizeRecruitingParticipationStatus(value: unknown): RecruitingParticipationStatus {
  return isOneOf(RECRUITING_PARTICIPATION_STATUSES, value) ? value : 'draft';
}

export function normalizeApplicantReferenceMode(value: unknown): RecruitingApplicantReferenceMode {
  return isOneOf(RECRUITING_APPLICANT_REFERENCE_MODES, value) ? value : 'anonymous_reference';
}

export function normalizeApplicantStatus(value: unknown): RecruitingApplicantStatus {
  return isOneOf(RECRUITING_APPLICANT_STATUSES, value) ? value : 'unknown_or_not_relevant';
}

export function normalizeAccessibilityCheckStatus(value: unknown): RecruitingAccessibilityCheckStatus {
  return isOneOf(RECRUITING_ACCESSIBILITY_CHECK_STATUSES, value) ? value : 'not_checked';
}

export function normalizeViolationReviewReason(value: unknown): RecruitingViolationReviewReason | null {
  return isOneOf(RECRUITING_VIOLATION_REVIEW_REASONS, value) ? value : null;
}

export function normalizeBoolean(value: unknown): boolean {
  return Boolean(value);
}

export function normalizeOptionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') return null;
  return Boolean(value);
}

export function normalizeNonNegativeInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) throw new Error('Anzahlwerte dürfen nicht negativ sein.');
  return Math.trunc(numberValue);
}

export function defaultApplicantReference(sequence: number): string {
  return `Bewerbung ${Math.max(1, sequence)}`;
}

export function assertNoConversationProtocolField(fieldName: string): never {
  throw new Error(`${fieldName} ist kein zulässiges Feld. Gremia.SBV dokumentiert bei Stellenbesetzungen den Verfahrensstand, kein Gesprächsprotokoll.`);
}
