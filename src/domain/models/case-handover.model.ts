import type { TransferImportConflictLevel, TransferImportPlan } from './transfer.model';

export type CaseHandoverImportMode = 'create_new' | 'merge_existing';
export type CaseHandoverPackageType = 'vacation_handover' | 'return_delta' | 'office_handover';

export interface OfficeHandoverScope {
  templateCount: number;
  deadlineTemplateCount: number;
  electionCount: number;
  electionDocumentCount: number;
  privacyReviewCount: number;
  activityJournalIncluded: false;
}

export interface CaseHandoverExportInput {
  caseIds: string[];
  measureIds?: string[];
  packageType?: 'vacation_handover' | 'office_handover';
  expiresAt?: string;
  purpose?: string;
  passphrase: string;
  targetRecipientToken: string;
}

export interface CaseHandoverReturnDeltaExportInput {
  sourcePackageId: string;
  caseIds: string[];
  passphrase: string;
  targetRecipientToken: string;
}

export interface CaseHandoverExportResult {
  exported: boolean;
  filePath: string;
  packageId: string;
  packageType?: CaseHandoverPackageType;
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  expiresAt?: string;
  targetInstanceId?: string;
  officeScope?: OfficeHandoverScope;
  legacyImportConfirmationRequired?: boolean;
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
  packageType: CaseHandoverPackageType;
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
  officeScope?: OfficeHandoverScope;
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
  applyOfficeConfiguration?: boolean;
  allowLegacyPackage?: boolean;
}

export interface OfficeHandoverImportSummary {
  templateCount: number;
  deadlineTemplateCount: number;
  electionCount: number;
  electionDocumentCount: number;
  privacyReviewCount: number;
  officeConfigurationApplied: boolean;
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
  officeImport?: OfficeHandoverImportSummary;
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

export interface CaseHandoverCockpitItem {
  id: string;
  direction: 'outgoing' | 'incoming';
  packageId: string;
  packageType: CaseHandoverPackageType;
  status: 'active' | 'expired' | 'returned' | 'open' | 'completed';
  createdAt: string;
  validUntil?: string;
  caseCount: number;
  caseIds: string[];
  caseLabels: string[];
  targetInstanceId?: string;
  canExportReturnDelta: boolean;
}

export interface CaseHandoverCockpit {
  activeVacationCount: number;
  expiredVacationCount: number;
  returnableCount: number;
  officeHandoverCount: number;
  officeInventory: OfficeHandoverScope;
  outgoing: CaseHandoverCockpitItem[];
  incoming: CaseHandoverCockpitItem[];
}
