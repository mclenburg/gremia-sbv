export type ProtectionStatus =
  | 'severely_disabled'
  | 'equivalent'
  | 'application_pending'
  | 'unclear'
  | 'expired'
  | 'inactive';

export type EmploymentState = 'active_employee' | 'left_company' | 'unknown';

export type LeftCompanyReason = 'known_departure' | 'retirement' | 'termination' | 'transfer' | 'unknown';

export type PersonLifecycleState =
  | 'active'
  | 'expiring_soon'
  | 'expired_review_required'
  | 'retention_documented'
  | 'anonymization_pending'
  | 'anonymized'
  | 'deleted_marker';

export type ProtectedPersonStatusSource =
  | 'employer_list'
  | 'manual'
  | 'self_disclosure'
  | 'document_presented'
  | 'unknown';

export interface ProtectedPersonRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  personnelNumber?: string;
  workEmail?: string;
  organizationalUnit?: string;
  location?: string;
  employmentState: EmploymentState;
  leftCompanyAt?: string;
  leftCompanyReason?: LeftCompanyReason;
  protectionStatus: ProtectionStatus;
  statusValidFrom?: string;
  statusValidUntil?: string;
  evidenceCheckedAt?: string;
  statusSource: ProtectedPersonStatusSource;
  lifecycleState: PersonLifecycleState;
  expiryWarningCreatedAt?: string;
  expiryReviewDueAt?: string;
  retentionReason?: string;
  retentionReviewAt?: string;
  anonymizedAt?: string;
  anonymizationReason?: string;
  notes?: string;
}

export interface CreateProtectedPersonInput {
  firstName: string;
  lastName: string;
  personnelNumber?: string;
  workEmail?: string;
  organizationalUnit?: string;
  location?: string;
  employmentState?: EmploymentState;
  leftCompanyAt?: string;
  leftCompanyReason?: LeftCompanyReason;
  protectionStatus: ProtectionStatus;
  statusValidFrom?: string;
  statusValidUntil?: string;
  evidenceCheckedAt?: string;
  statusSource?: ProtectedPersonStatusSource;
  notes?: string;
}

export interface UpdateProtectedPersonInput extends Partial<CreateProtectedPersonInput> {
  lifecycleState?: PersonLifecycleState;
  expiryWarningCreatedAt?: string;
  expiryReviewDueAt?: string;
  retentionReason?: string;
  retentionReviewAt?: string;
  anonymizationReason?: string;
}

export interface ProtectedPersonListFilters {
  query?: string;
  protectionStatus?: ProtectionStatus[];
  employmentState?: EmploymentState[];
  lifecycleState?: PersonLifecycleState[];
  expiringWithinDays?: number;
}

export interface PersonCaseLinkRecord {
  id: string;
  protectedPersonId: string;
  caseFileId: string;
  linkState: 'active' | 'person_anonymized' | 'removed';
  createdAt: string;
  anonymizedAt?: string;
  linkReason?: string;
}

export interface PersonImportColumnMapping {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  fullNameMode?: 'first_last' | 'last_comma_first';
  personnelNumber?: string;
  workEmail?: string;
  organizationalUnit?: string;
  location?: string;
  protectionStatus?: string;
  statusValidFrom?: string;
  statusValidUntil?: string;
  evidenceCheckedAt?: string;
  employmentState?: string;
  leftCompanyAt?: string;
  notes?: string;
  ignoredColumns?: string[];
}

export interface PersonImportProfileRecord {
  id: string;
  name: string;
  fileType: 'csv' | 'xlsx';
  sheetName?: string;
  headerRowIndex: number;
  firstDataRowIndex: number;
  csvDelimiter?: string;
  csvEncoding?: string;
  columnMapping: PersonImportColumnMapping;
  createdAt: string;
  updatedAt: string;
}

export interface PersonImportPreviewRow {
  rowNumber: number;
  firstName?: string;
  lastName?: string;
  personnelNumber?: string;
  workEmail?: string;
  protectionStatus?: ProtectionStatus;
  statusValidUntil?: string;
  validationErrors: string[];
  rawPreview: Record<string, string>;
}

export type PersonImportAction = 'created' | 'updated' | 'unchanged' | 'conflict' | 'skipped' | 'not_in_list';
export type PersonImportMatchStrategy = 'personnel_number' | 'work_email' | 'name_only_conflict' | 'none';

export interface PersonImportRunItemRecord {
  id: string;
  runId: string;
  rowNumber: number;
  action: PersonImportAction;
  protectedPersonId?: string;
  matchStrategy?: PersonImportMatchStrategy;
  conflictReason?: string;
  validationMessage?: string;
  changedFields: string[];
  createdAt: string;
}

export interface PersonImportRunRecord {
  id: string;
  profileId?: string;
  sourceFileName: string;
  sourceFileHash: string;
  importedAt: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  conflictCount: number;
  skippedCount: number;
  missingCount: number;
  items?: PersonImportRunItemRecord[];
}

export interface PersonImportPreviewInput {
  sourceFileName: string;
  fileType: 'csv' | 'xlsx';
  csvText?: string;
  filePath?: string;
  sheetName?: string;
  delimiter?: string;
  headerRowIndex?: number;
  firstDataRowIndex?: number;
  mapping: PersonImportColumnMapping;
}

export interface PersonImportPreviewResult {
  columns: string[];
  rows: PersonImportPreviewRow[];
  warnings: string[];
}

export interface PersonImportExecuteInput extends PersonImportPreviewInput {
  profileId?: string;
  profileName?: string;
}

export interface PersonImportExecuteResult {
  run: PersonImportRunRecord;
  imported: ProtectedPersonRecord[];
}

export interface PersonStatusExpirySummary {
  expiringSoon: ProtectedPersonRecord[];
  expiredReviewRequired: ProtectedPersonRecord[];
}

export interface PersonAnonymizationResult {
  person: ProtectedPersonRecord;
  affectedCaseIds: string[];
  anonymizedLinks: number;
}

export const protectionStatusLabels: Record<ProtectionStatus, string> = {
  severely_disabled: 'schwerbehindert',
  equivalent: 'gleichgestellt',
  application_pending: 'Antrag läuft',
  unclear: 'Status unklar',
  expired: 'abgelaufen',
  inactive: 'nicht aktiv'
};

export const employmentStateLabels: Record<EmploymentState, string> = {
  active_employee: 'aktiv beschäftigt',
  left_company: 'ausgeschieden',
  unknown: 'unbekannt'
};

export const lifecycleStateLabels: Record<PersonLifecycleState, string> = {
  active: 'aktuell',
  expiring_soon: 'läuft bald ab',
  expired_review_required: 'Datenschutzprüfung erforderlich',
  retention_documented: 'Fortspeicherung begründet',
  anonymization_pending: 'Anonymisierung vorgemerkt',
  anonymized: 'anonymisiert',
  deleted_marker: 'gelöscht'
};
