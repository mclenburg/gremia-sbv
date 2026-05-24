import type { PersonalDataAuditChainStatus } from './audit.model';

export type ComplianceDocumentType =
  | 'toms'
  | 'vvt'
  | 'dsfa'
  | 'dsgvo_bdsg_matrix'
  | 'retention_schedule'
  | 'data_subject_rights'
  | 'export_policy'
  | 'dsb_it_security_approval'
  | 'data_protection_status'
  | 'release_readiness_checklist'
  | 'dsar_response';

export interface ComplianceDocument {
  type: ComplianceDocumentType;
  title: string;
  description: string;
  filename: string;
  body: string;
  generatedAt: string;
}

export interface ComplianceDocumentDescriptor {
  type: ComplianceDocumentType;
  title: string;
  description: string;
  buttonLabel: string;
}


export interface DataSubjectAccessPrefillPerson {
  id: string;
  displayName: string;
  recordKind?: string;
  personnelNumber?: string;
  workEmail?: string;
  organizationalUnit?: string;
  location?: string;
  protectionStatus?: string;
  employmentState?: string;
  lifecycleState?: string;
  statusValidFrom?: string;
  statusValidUntil?: string;
  evidenceCheckedAt?: string;
  retentionReviewAt?: string;
  anonymizedAt?: string;
}

export interface DataSubjectAccessPrefillCase {
  id: string;
  caseNumber: string;
  displayName: string;
  category: string;
  status: string;
  priority: string;
  openedAt: string;
  closedAt?: string;
  privacyReviewRequired?: boolean;
}

export interface DataSubjectAccessPrefillDeadline {
  id: string;
  title: string;
  processType: string;
  deadlineType: string;
  status: string;
  severity: string;
  dueAt: string;
  caseId?: string;
  measureId?: string;
  legalBasis?: string;
}

export interface DataSubjectAccessPrefillMeasure {
  id: string;
  caseId: string;
  type: string;
  title: string;
  status: string;
  riskLevel: string;
  openedAt: string;
  dueAt?: string;
  closedAt?: string;
  requiresFollowUp?: boolean;
}

export interface DataSubjectAccessPrefillImportRun {
  id: string;
  sourceFileName: string;
  importedAt: string;
  action: string;
  changedFields: string[];
}

export interface DataSubjectAccessPrefillLifecycleEvent {
  id: string;
  occurredAt: string;
  action: string;
  subjectType: string;
  subjectId?: string;
  caseId?: string;
  purpose: string;
}

export interface DataSubjectAccessPrefillFreeTextMatch {
  id: string;
  sourceType: string;
  sourceLabel: string;
  title: string;
  caseId?: string;
  caseNumber?: string;
  occurredAt?: string;
  matchedTerms: string[];
  matchKind: 'name_or_reference' | 'linked_case';
  excerpt: string;
  requiresManualReview: boolean;
}

export interface DataSubjectAccessPrefill {
  generatedAt: string;
  matchReason: string;
  persons: DataSubjectAccessPrefillPerson[];
  cases: DataSubjectAccessPrefillCase[];
  deadlines: DataSubjectAccessPrefillDeadline[];
  measures: DataSubjectAccessPrefillMeasure[];
  importRuns: DataSubjectAccessPrefillImportRun[];
  lifecycleEvents: DataSubjectAccessPrefillLifecycleEvent[];
  freeTextMatches: DataSubjectAccessPrefillFreeTextMatch[];
}

export interface DataSubjectAccessRequestInput {
  requesterName: string;
  requestReceivedAt: string;
  responseDueAt: string;
  caseReference: string;
  identityVerified: boolean;
  requestScope: string;
  preparedBy: string;
  prefill?: DataSubjectAccessPrefill;
}


export type ComplianceTechnicalStatusLevel = 'ok' | 'warning' | 'problem' | 'info';

export interface ComplianceTechnicalStatusItem {
  id: string;
  label: string;
  level: ComplianceTechnicalStatusLevel;
  summary: string;
  detail?: string;
}

export interface ComplianceManualCheckItem {
  id: string;
  label: string;
  summary: string;
  detail?: string;
}



export type ComplianceAuditChainStatus = PersonalDataAuditChainStatus;

export interface ComplianceStatusOverview {
  generatedAt: string;
  technicalItems: ComplianceTechnicalStatusItem[];
  manualItems: ComplianceManualCheckItem[];
  nextTechnicalActions: string[];
  manualCheckSummary: string;
}

export interface ComplianceDatabaseIntegrityStatus {
  ok: boolean;
  schemaVersion: string;
  appliedSchemaVersion?: string;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
  issueCount: number;
  issues: string[];
  repairRequired: boolean;
}

export type ComplianceSelfCheckStatus = 'ok' | 'warning' | 'problem';

export interface ComplianceSelfCheckItem {
  id: string;
  label: string;
  status: ComplianceSelfCheckStatus;
  summary: string;
  action?: string;
}

export interface ComplianceSelfCheckResult {
  generatedAt: string;
  score: number;
  status: ComplianceSelfCheckStatus;
  items: ComplianceSelfCheckItem[];
  nextActions: string[];
}

export type ComplianceIncidentCategory =
  | 'wrong_export'
  | 'lost_backup'
  | 'unauthorized_access_suspected'
  | 'wrong_recipient'
  | 'vault_integrity'
  | 'temporary_file'
  | 'other';

export type ComplianceIncidentRiskLevel = 'low' | 'medium' | 'high';
export type ComplianceIncidentStatus = 'open' | 'in_review' | 'reported' | 'closed';

export interface ComplianceIncidentRecord {
  id: string;
  occurredAt: string;
  discoveredAt: string;
  category: ComplianceIncidentCategory;
  riskLevel: ComplianceIncidentRiskLevel;
  status: ComplianceIncidentStatus;
  summary: string;
  affectedDataCategories: string;
  immediateMeasures: string;
  dsbNotifiedAt?: string;
  authorityNotificationChecked: boolean;
  dataSubjectsInformedAt?: string;
  closedAt?: string;
  lessonsLearned?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplianceIncidentInput {
  occurredAt: string;
  discoveredAt: string;
  category: ComplianceIncidentCategory;
  riskLevel: ComplianceIncidentRiskLevel;
  summary: string;
  affectedDataCategories?: string;
  immediateMeasures?: string;
}

export interface UpdateComplianceIncidentInput {
  status?: ComplianceIncidentStatus;
  riskLevel?: ComplianceIncidentRiskLevel;
  summary?: string;
  affectedDataCategories?: string;
  immediateMeasures?: string;
  dsbNotifiedAt?: string;
  authorityNotificationChecked?: boolean;
  dataSubjectsInformedAt?: string;
  closedAt?: string;
  lessonsLearned?: string;
}
