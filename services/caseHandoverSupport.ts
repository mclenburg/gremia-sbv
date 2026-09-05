import { createHash } from 'node:crypto';
export interface HandoverDatabaseRow extends Record<string, unknown> {
  id: string;
  case_id: string;
  measure_id: string;
  protected_person_id: string | null;
  storage_path?: string | null;
  document_key?: string | null;
  iv?: string | null;
  auth_tag?: string | null;
}
export type Row = HandoverDatabaseRow;
export type PackagePayload = {
  format: string;
  version: number;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  purpose: string;
  packageType?: 'vacation_handover' | 'return_delta' | 'office_handover';
  sourcePackageId?: string;
  deltaSince?: string;
  changedRefs?: {
    cases?: string[];
    protectedPersons?: string[];
    notes?: string[];
    measures?: string[];
    measureNotes?: string[];
    deadlines?: string[];
    documents?: string[];
  };
  cases: Array<{ ref: string; data: Row }>;
  protectedPersons: Array<{ ref: string; data: Row }>;
  notes: Array<{ ref: string; caseRef: string; data: Row }>;
  measures: Array<{ ref: string; caseRef: string; data: Row }>;
  measureNotes: Array<{ ref: string; caseRef: string; measureRef: string; data: Row }>;
  deadlines: Array<{ ref: string; caseRef?: string; measureRef?: string; data: Row }>;
  documents: Array<{ ref: string; caseRef: string; measureRef?: string; data: Row; contentBase64: string }>;
  officeData?: OfficeHandoverPayload;
};

export type OfficeHandoverPayload = {
  documentTemplates: Array<{ ref: string; data: Row }>;
  deadlineTemplates: Array<{ ref: string; data: Row }>;
  retentionSettings: Record<string, unknown>;
  privacyReviews: Array<{ ref: string; caseRef: string; data: Row }>;
  elections: Array<{ ref: string; data: import('./electionTransferPolicy.js').ElectionTransferPayload }>;
  electionDocuments: Array<{ ref: string; electionRef: string; data: Row; contentBase64: string }>;
  activityJournalIncluded: false;
};

export type DecryptedPackage = {
  payload: PackagePayload;
  transfer: {
    formatVersion: number;
    legacyFormat: boolean;
    algorithm: 'aes-256-gcm';
  };
};

export function nowIso(): string { return new Date().toISOString(); }
export function sha256(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex'); }
export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export function safeString(value: unknown, fallback = ''): string { return String(value ?? fallback); }
export function ensureArray(value?: string[]): string[] { return [...new Set((value ?? []).filter(Boolean))]; }

export function officeHandoverScope(payload: PackagePayload) {
  if (!payload.officeData) return undefined;
  return {
    templateCount: payload.officeData.documentTemplates.length,
    deadlineTemplateCount: payload.officeData.deadlineTemplates.length,
    electionCount: payload.officeData.elections.length,
    electionDocumentCount: payload.officeData.electionDocuments.length,
    privacyReviewCount: payload.officeData.privacyReviews.length,
    activityJournalIncluded: false as const,
  };
}
