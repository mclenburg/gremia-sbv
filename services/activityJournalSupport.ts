import type { ActivityJournalCategory, ActivityJournalConfidentialityLevel, ActivityJournalCreatedFrom, ActivityJournalEntryRecord, ActivityJournalLinkRecord, ActivityJournalLinkTarget, ActivityJournalStatus, ActivityJournalTargetType, ActivityJournalTimeMode } from '../src/domain/models/activity-journal.model.js';
import { ACTIVITY_JOURNAL_TARGET_TYPES } from '../src/domain/models/activity-journal.model.js';
import { legalCalendarDate, legalToday } from '../src/domain/time/legalTime.js';
export const TIME_MODES: ActivityJournalTimeMode[] = ['none', 'duration', 'range', 'timer'];
export const CONFIDENTIALITY_LEVELS: ActivityJournalConfidentialityLevel[] = ['normal', 'confidential', 'highly_confidential'];
export const STATUSES: ActivityJournalStatus[] = ['draft', 'final', 'follow_up_open'];
export const CREATED_FROM: ActivityJournalCreatedFrom[] = ['manual', 'text_command', 'context_prefill', 'timer', 'import'];

export type ActivityJournalEntryRow = {
  id: string;
  entry_date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  time_mode: ActivityJournalTimeMode;
  category: ActivityJournalCategory;
  title: string;
  description: string | null;
  result_note: string | null;
  confidentiality_level: ActivityJournalConfidentialityLevel;
  status: ActivityJournalStatus;
  created_from: ActivityJournalCreatedFrom;
  follow_up_due_at: string | null;
  performed_outside_contract_work_time: number;
  exported_for_activity_report_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityJournalLinkRow = {
  id: string;
  entry_id: string;
  target_type: ActivityJournalTargetType;
  target_id: string;
  created_at: string;
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(): string {
  return legalToday();
}

export function bool(value: unknown): boolean {
  return Boolean(value);
}

export function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeDateOnly(value: unknown): string {
  const fallback = todayIsoDate();
  const trimmed = normalizeOptional(value) ?? fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? fallback : legalCalendarDate(parsed);
}

export function normalizeIso(value: unknown): string | null {
  const trimmed = normalizeOptional(value);
  if (!trimmed) return null;
  const valueWithTime = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T09:00:00.000Z` : trimmed;
  const parsed = new Date(valueWithTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

export function normalizeDuration(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.trunc(parsed);
}

export function durationFromRange(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export function mapLink(row: ActivityJournalLinkRow): ActivityJournalLinkRecord {
  return {
    id: row.id,
    entryId: row.entry_id,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at
  };
}

export function mapEntry(row: ActivityJournalEntryRow): ActivityJournalEntryRecord {
  return {
    id: row.id,
    entryDate: row.entry_date,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    durationMinutes: row.duration_minutes === null || row.duration_minutes === undefined ? undefined : Number(row.duration_minutes),
    timeMode: row.time_mode,
    category: row.category,
    title: row.title,
    description: row.description ?? undefined,
    resultNote: row.result_note ?? undefined,
    confidentialityLevel: row.confidentiality_level,
    status: row.status,
    createdFrom: row.created_from,
    followUpDueAt: row.follow_up_due_at ?? undefined,
    performedOutsideContractWorkTime: bool(row.performed_outside_contract_work_time),
    exportedForActivityReportAt: row.exported_for_activity_report_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function assertTarget(target: ActivityJournalLinkTarget): void {
  if (!ACTIVITY_JOURNAL_TARGET_TYPES.includes(target.targetType)) throw new Error(`Unzulässiger Journal-Bezug: ${target.targetType}`);
  if (!normalizeOptional(target.targetId)) throw new Error('Ein Journal-Bezug benötigt eine Ziel-ID.');
}

export function hasCaseLink(links: ActivityJournalLinkRecord[]): boolean {
  return links.some((link) => link.targetType === 'case');
}

export function hasControlLink(links: ActivityJournalLinkRecord[]): boolean {
  return links.some((link) => link.targetType === 'sbv_control_protocol');
}
