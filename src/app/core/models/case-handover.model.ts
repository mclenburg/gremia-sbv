export type CaseHandoverImportMode = 'create_new' | 'merge_existing';

export interface CaseHandoverExportInput {
  caseIds: string[];
  measureIds?: string[];
  expiresAt?: string;
  purpose?: string;
  passphrase: string;
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
}

export interface CaseHandoverCandidateMatch {
  localCaseId: string;
  caseNumber: string;
  displayName: string;
  reason: 'case_number' | 'name' | 'person_name';
  confidence: 'high' | 'medium';
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
  warnings: string[];
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
