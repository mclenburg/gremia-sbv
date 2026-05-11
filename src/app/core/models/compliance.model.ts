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

export interface DataSubjectAccessRequestInput {
  requesterName: string;
  requestReceivedAt: string;
  responseDueAt: string;
  caseReference: string;
  identityVerified: boolean;
  requestScope: string;
  preparedBy: string;
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
