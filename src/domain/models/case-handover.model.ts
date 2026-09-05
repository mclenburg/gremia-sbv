import type { TransferImportConflictLevel, TransferImportPlan } from './transfer.model';

export type CaseHandoverImportMode = 'create_new' | 'merge_existing';

export interface CaseHandoverExportInput {
  caseIds: string[];
  measureIds?: string[];
  expiresAt?: string;
  purpose?: string;
  passphrase: string;
  targetRecipientToken: string;
}

export interface CaseHandoverExportResult {
  exported: boolean;
  filePath: string;
  packageId: string;
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  expiresAt?: string;
  targetInstanceId?: string;
}

export interface CaseHandoverCandidateMatch {
  localCaseId: string;
  caseNumber: string;
  displayName: string;
  reason: 'case_number' | 'name' | 'person_name';
  confidence: 'high' | 'medium';
  conflictLevel?: TransferImportConflictLevel;
  conflictReason?: string;
}

export interface CaseHandoverInspectResult {
  valid: boolean;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  isExpired: boolean;
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  matches: CaseHandoverCandidateMatch[];
  importPlan: TransferImportPlan;
  warnings: string[];
  integrity?: {
    verified: boolean;
    algorithm: 'aes-256-gcm';
    formatVersion: number;
    legacyFormat: boolean;
  };
  targetInstanceId?: string;
  file?: {
    fileName: string;
    sizeBytes: number;
    isNetworkPath: boolean;
  };
}

export interface CaseHandoverImportInput {
  filePath: string;
  passphrase: string;
  mode: CaseHandoverImportMode;
  targetCaseId?: string;
}

export interface CaseHandoverImportResult {
  imported: boolean;
  packageId: string;
  mode: CaseHandoverImportMode;
  createdCaseIds: string[];
  updatedCaseIds: string[];
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  privacyReviewCaseIds: string[];
  expiresAt?: string;
  expired: boolean;
}

export interface CaseHandoverContinueExpiredInput {
  caseId: string;
  reason: string;
}

export interface CaseHandoverContinueExpiredResult {
  caseId: string;
  confirmed: boolean;
  confirmedAt: string;
}
