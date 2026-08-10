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
  cases: Array<{ ref: string; data: Row }>;
  protectedPersons: Array<{ ref: string; data: Row }>;
  notes: Array<{ ref: string; caseRef: string; data: Row }>;
  measures: Array<{ ref: string; caseRef: string; data: Row }>;
  measureNotes: Array<{ ref: string; caseRef: string; measureRef: string; data: Row }>;
  deadlines: Array<{ ref: string; caseRef?: string; measureRef?: string; data: Row }>;
  documents: Array<{ ref: string; caseRef: string; measureRef?: string; data: Row; contentBase64: string }>;
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

