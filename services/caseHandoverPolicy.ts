import { randomUUID } from 'node:crypto';
import type { CaseHandoverCandidateMatch } from '../src/domain/models/case-handover.model.js';
import type { TransferImportPlan } from '../src/domain/models/transfer.model.js';
import { buildTransferImportPlan } from './transferImportPlan.js';

export const CASE_HANDOVER_FORMAT = 'gremia-sbv-case-handover';
export const CASE_HANDOVER_LEGACY_VERSION = 1;
export const CASE_HANDOVER_VERSION = 2;

export function packageRef(prefix: string, index: number): string {
  return `${prefix}_${index + 1}`;
}

export function createPackageId(): string {
  return `handover_${randomUUID()}`;
}

export function normalizeNamePart(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

export function normalizeCaseNumber(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .replace(/\s+/g, '')
    .trim();
}

export function isExpired(expiresAt?: string, now = new Date()): boolean {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  return Number.isFinite(expires.getTime()) && expires.getTime() < now.getTime();
}


export function canImportPackage(expiresAt?: string, now = new Date()): boolean {
  return !isExpired(expiresAt, now);
}

export function handoverExpiryState(expiresAt?: string, now = new Date()): 'no_expiry' | 'valid' | 'expired' {
  if (!expiresAt) return 'no_expiry';
  return isExpired(expiresAt, now) ? 'expired' : 'valid';
}

export function safeAuditMetadata(input: {
  packageId?: string;
  caseCount?: number;
  measureCount?: number;
  documentCount?: number;
  deadlineCount?: number;
  hasExpiry?: boolean;
  expiresAt?: string;
  mode?: string;
  result?: string;
  reasonCode?: string;
}): Record<string, unknown> {
  return {
    packageId: input.packageId ?? 'unknown',
    caseCount: Number(input.caseCount ?? 0),
    measureCount: Number(input.measureCount ?? 0),
    documentCount: Number(input.documentCount ?? 0),
    deadlineCount: Number(input.deadlineCount ?? 0),
    hasExpiry: Boolean(input.hasExpiry),
    expiresAt: input.expiresAt ?? null,
    mode: input.mode ?? null,
    result: input.result ?? null,
    reasonCode: input.reasonCode ?? null,
  };
}

export function assertAuditMetadataContainsNoPersonalData(metadata: Record<string, unknown>): boolean {
  const serialized = JSON.stringify(metadata);
  return !/(diagnose|geburtsdatum|personalnummer|vorname|nachname|falltitel|notiz|inhalt)/i.test(serialized);
}

export function buildCandidateMatches(args: {
  exportedCaseNumber?: string;
  exportedDisplayName?: string;
  exportedFirstName?: string;
  exportedLastName?: string;
  localCases: Array<{ id: string; case_number?: string; display_name?: string; protected_first_name?: string; protected_last_name?: string }>;
}): CaseHandoverCandidateMatch[] {
  const exportedCaseNumber = normalizeCaseNumber(args.exportedCaseNumber);
  const exportedDisplayName = normalizeNamePart(args.exportedDisplayName);
  const exportedFirst = normalizeNamePart(args.exportedFirstName);
  const exportedLast = normalizeNamePart(args.exportedLastName);
  const matches = new Map<string, CaseHandoverCandidateMatch>();
  for (const local of args.localCases) {
    const localCaseNumber = normalizeCaseNumber(local.case_number);
    const localDisplayName = normalizeNamePart(local.display_name);
    const localFirst = normalizeNamePart(local.protected_first_name);
    const localLast = normalizeNamePart(local.protected_last_name);
    if (exportedCaseNumber && localCaseNumber && exportedCaseNumber === localCaseNumber) {
      const identityConflict = hasIdentityConflict({
        exportedDisplayName,
        exportedFirst,
        exportedLast,
        localDisplayName,
        localFirst,
        localLast,
      });
      matches.set(local.id, {
        localCaseId: local.id,
        caseNumber: local.case_number ?? '—',
        displayName: local.display_name ?? '—',
        reason: 'case_number',
        confidence: 'high',
        conflictLevel: identityConflict ? 'true_conflict' : 'safe_match',
        conflictReason: identityConflict ? 'Aktenzeichen stimmt überein, aber Name oder Personenbezug widersprechen dem Übergabepaket.' : undefined,
      });
      continue;
    }
    if (exportedDisplayName && localDisplayName && exportedDisplayName === localDisplayName) {
      matches.set(local.id, { localCaseId: local.id, caseNumber: local.case_number ?? '—', displayName: local.display_name ?? '—', reason: 'name', confidence: 'medium', conflictLevel: 'possible_match' });
      continue;
    }
    const personMatch = (exportedFirst && exportedFirst === localFirst) || (exportedLast && exportedLast === localLast) || (exportedFirst && exportedLast && exportedFirst === localLast && exportedLast === localFirst);
    if (personMatch) {
      matches.set(local.id, { localCaseId: local.id, caseNumber: local.case_number ?? '—', displayName: local.display_name ?? '—', reason: 'person_name', confidence: exportedFirst && exportedLast && localFirst && localLast ? 'high' : 'medium', conflictLevel: 'possible_match' });
    }
  }
  return [...matches.values()];
}

export function buildCaseHandoverImportPlan(input: {
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  expiresAt?: string;
  isExpired: boolean;
  matches: readonly CaseHandoverCandidateMatch[];
}): TransferImportPlan {
  return buildTransferImportPlan({ transferKind: 'case_handover', ...input });
}

function hasIdentityConflict(input: {
  exportedDisplayName: string;
  exportedFirst: string;
  exportedLast: string;
  localDisplayName: string;
  localFirst: string;
  localLast: string;
}): boolean {
  const exportedHasPersonName = Boolean(input.exportedFirst || input.exportedLast);
  const localHasPersonName = Boolean(input.localFirst || input.localLast);
  const exportedDisplay = input.exportedDisplayName;
  const localDisplay = input.localDisplayName;

  if (exportedHasPersonName && localHasPersonName) {
    const sameDirect = input.exportedFirst === input.localFirst && input.exportedLast === input.localLast;
    const sameSwapped = input.exportedFirst === input.localLast && input.exportedLast === input.localFirst;
    return !sameDirect && !sameSwapped;
  }

  if (exportedDisplay && localDisplay) return exportedDisplay !== localDisplay;
  return false;
}
