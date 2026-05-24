import type {
  CreatePersonalDataAuditInput,
  PersonalDataAuditAction,
} from '../src/app/core/models/audit.model.js';

export const AUDIT_SUBJECT_TYPES = {
  complianceIncident: 'compliance_incident',
  caseHandover: 'case_handover',
  sbvResourceRecord: 'sbv_resource_record',
  gremiaBrHttpRequest: 'gremia_br_http_request',
} as const;

export const AUDIT_PURPOSES = {
  complianceIncidentCreated:
    'Dokumentation eines Datenschutz- oder Sicherheitsereignisses ohne personenbezogene Audit-Metadaten.',
  complianceIncidentUpdated:
    'Aktualisierung eines Datenschutz- oder Sicherheitsereignisses ohne inhaltliche Audit-Metadaten.',
  caseHandoverExported: 'Verschlüsseltes Fallübergabepaket erstellt.',
  caseHandoverImportRejected: 'Fallübergabepaket ohne Inhaltsdaten abgelehnt.',
  caseHandoverImportInspected: 'Fallübergabepaket ohne Inhaltsdaten geprüft.',
  caseHandoverImported: 'Verschlüsseltes Fallübergabepaket importiert.',
  caseHandoverContinuedAfterExpiry: 'Weitere Bearbeitung abgelaufener Übergabedaten bestätigt.',
  sbvResourceChanged: 'SBV-Ressourcen- und Heranziehungsnachweis geändert.',
  sbvResourceRead: 'SBV-Ressourcen- und Heranziehungsnachweise anzeigen.',
  gremiaBrRequest: 'Gremia.BR-Lesebrücke: HTTP-Anfrage ohne Inhaltsdaten protokollieren.',
} as const;

export type AuditMetadataValue = string | number | boolean | null | Date | undefined;
export type AuditMetadata = Record<string, AuditMetadataValue>;

export type ComplianceIncidentAuditArgs = {
  incidentId: string;
  category?: string;
  riskLevel?: string;
  status?: string;
  authorityNotificationChecked?: boolean;
};

export type CaseHandoverAuditArgs = {
  packageId?: string;
  caseCount?: number;
  measureCount?: number;
  documentCount?: number;
  deadlineCount?: number;
  validUntilPresent?: boolean;
  mode?: string;
  result?: 'success' | 'failed' | 'confirmed';
  reasonCode?: string;
};

export type SbvResourceAuditArgs = {
  action: Extract<PersonalDataAuditAction, 'read' | 'create' | 'update' | 'delete'>;
  recordId?: string;
  recordType?: string;
  status?: string;
};

export type GremiaBrRequestAuditArgs = {
  endpoint: string;
  outcome: string;
  status?: number;
};

function compactMetadata(metadata: AuditMetadata): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    normalized[key] = value instanceof Date ? value.toISOString() : value;
  }
  return normalized;
}

function boundedCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value ?? 0));
}

export function auditComplianceIncidentCreated(args: ComplianceIncidentAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: 'create',
    subjectType: AUDIT_SUBJECT_TYPES.complianceIncident,
    subjectId: args.incidentId,
    purpose: AUDIT_PURPOSES.complianceIncidentCreated,
    metadata: compactMetadata({
      category: args.category,
      riskLevel: args.riskLevel,
      status: args.status ?? 'open',
    }),
  };
}

export function auditComplianceIncidentUpdated(args: ComplianceIncidentAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: 'update',
    subjectType: AUDIT_SUBJECT_TYPES.complianceIncident,
    subjectId: args.incidentId,
    purpose: AUDIT_PURPOSES.complianceIncidentUpdated,
    metadata: compactMetadata({
      riskLevel: args.riskLevel,
      status: args.status,
      authorityNotificationChecked: args.authorityNotificationChecked,
    }),
  };
}

function handoverMetadata(args: CaseHandoverAuditArgs): Record<string, unknown> {
  return compactMetadata({
    packageId: args.packageId ?? 'unknown',
    caseCount: boundedCount(args.caseCount),
    measureCount: boundedCount(args.measureCount),
    documentCount: boundedCount(args.documentCount),
    deadlineCount: boundedCount(args.deadlineCount),
    validUntilPresent: Boolean(args.validUntilPresent),
    mode: args.mode,
    result: args.result,
    reasonCode: args.reasonCode,
  });
}

export function auditCaseHandoverExported(args: CaseHandoverAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: 'export',
    subjectType: AUDIT_SUBJECT_TYPES.caseHandover,
    purpose: AUDIT_PURPOSES.caseHandoverExported,
    metadata: handoverMetadata({ ...args, result: args.result ?? 'success' }),
  };
}

export function auditCaseHandoverImportInspected(args: CaseHandoverAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: 'import',
    subjectType: AUDIT_SUBJECT_TYPES.caseHandover,
    purpose: args.result === 'failed' ? AUDIT_PURPOSES.caseHandoverImportRejected : AUDIT_PURPOSES.caseHandoverImportInspected,
    metadata: handoverMetadata(args),
  };
}

export function auditCaseHandoverImported(args: CaseHandoverAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: 'import',
    subjectType: AUDIT_SUBJECT_TYPES.caseHandover,
    purpose: args.result === 'failed' ? AUDIT_PURPOSES.caseHandoverImportRejected : AUDIT_PURPOSES.caseHandoverImported,
    metadata: handoverMetadata(args),
  };
}

export function auditCaseHandoverContinuedAfterExpiry(): CreatePersonalDataAuditInput {
  return {
    action: 'update',
    subjectType: AUDIT_SUBJECT_TYPES.caseHandover,
    purpose: AUDIT_PURPOSES.caseHandoverContinuedAfterExpiry,
    metadata: compactMetadata({ result: 'confirmed', reasonCode: 'continued_after_expiry' }),
  };
}

export function auditResourceRecordChanged(args: SbvResourceAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: args.action,
    subjectType: AUDIT_SUBJECT_TYPES.sbvResourceRecord,
    subjectId: args.recordId,
    purpose: args.action === 'read' ? AUDIT_PURPOSES.sbvResourceRead : AUDIT_PURPOSES.sbvResourceChanged,
    metadata: compactMetadata({ recordType: args.recordType, status: args.status }),
  };
}

export function auditGremiaBrReadRequest(args: GremiaBrRequestAuditArgs): CreatePersonalDataAuditInput {
  return {
    action: args.endpoint.startsWith('GET ') ? 'read' : 'security',
    subjectType: AUDIT_SUBJECT_TYPES.gremiaBrHttpRequest,
    subjectId: args.endpoint,
    purpose: AUDIT_PURPOSES.gremiaBrRequest,
    metadata: compactMetadata({ endpoint: args.endpoint, outcome: args.outcome, status: args.status }),
  };
}

export function auditMetadataContainsNoDirectIdentifiers(metadata: Record<string, unknown>): boolean {
  const serialized = JSON.stringify(metadata);
  return !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:P|PNR|Personalnummer)[-\s]*\d{2,}\b|\b[A-ZÄÖÜ][a-zäöüß]+(?:[-\s]+[A-ZÄÖÜ][a-zäöüß]+){1,3}\b/iu.test(serialized);
}
