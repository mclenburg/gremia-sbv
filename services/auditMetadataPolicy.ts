export const AUDIT_CORE_METADATA_FIELDS = [
  'subjectId',
  'caseId',
  'action',
  'purpose',
  'timestamp',
] as const;

const COMPLIANCE_INCIDENT_METADATA_FIELDS = [
  'category',
  'riskLevel',
  'status',
  'authorityNotificationChecked',
] as const;

const CASE_HANDOVER_METADATA_FIELDS = [
  'packageId',
  'caseCount',
  'measureCount',
  'documentCount',
  'deadlineCount',
  'validUntilPresent',
  'mode',
  'result',
  'reasonCode',
] as const;

const RESOURCE_METADATA_FIELDS = [
  'recordType',
  'status',
] as const;

const CONTROL_PROTOCOL_METADATA_FIELDS = [
  'topic',
  'status',
] as const;

const ACTIVITY_JOURNAL_METADATA_FIELDS = [
  'category',
  'status',
  'entryDate',
  'linkCount',
  'hasTime',
] as const;

const GREMIA_BR_REQUEST_METADATA_FIELDS = [
  'endpoint',
  'outcome',
  'status',
  'statusCode',
] as const;

const PARTICIPATION_VIOLATION_METADATA_FIELDS = [
  'stage',
  'status',
  'violationType',
  'sourceContextType',
  'hasFollowUp',
] as const;

const PARTICIPATION_VIOLATION_DOCUMENT_METADATA_FIELDS = [
  'violationId',
  'stage',
  'templateKey',
  'templateVersion',
  'documentKind',
] as const;

const DEADLINE_METADATA_FIELDS = [
  'processType',
  'deadlineType',
  'isLegalDeadline',
  'measureId',
  'status',
] as const;

const PRIVACY_REVIEW_METADATA_FIELDS = [
  'reason',
  'priority',
  'reviewAt',
  'reasonDocumented',
  'cleared',
  'pendingMarkersApplied',
  'unmarkedFreeTextReviewRequired',
  'reviewed',
  'marked',
  'skipped',
] as const;

const PERSON_BINDING_METADATA_FIELDS = [
  'bindingState',
  'legacyAssignment',
] as const;

const SECURITY_SESSION_METADATA_FIELDS = [
  'eventType',
  'result',
  'reasonCode',
] as const;

const SEARCH_INDEX_METADATA_FIELDS = [
  'documentsIndexed',
  'casesTouched',
  'sourceType',
  'entriesDeleted',
] as const;

const REPORT_METADATA_FIELDS = [
  'reportType',
  'warningCount',
  'complianceDocumentType',
] as const;

export const AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE = {
  compliance_incident: COMPLIANCE_INCIDENT_METADATA_FIELDS,
  case_handover: CASE_HANDOVER_METADATA_FIELDS,
  sbv_resource_record: RESOURCE_METADATA_FIELDS,
  sbv_control_protocol: CONTROL_PROTOCOL_METADATA_FIELDS,
  activity_journal: ACTIVITY_JOURNAL_METADATA_FIELDS,
  gremia_br_http_request: GREMIA_BR_REQUEST_METADATA_FIELDS,
  sbv_participation_violation: PARTICIPATION_VIOLATION_METADATA_FIELDS,
  sbv_participation_violation_document: PARTICIPATION_VIOLATION_DOCUMENT_METADATA_FIELDS,
  generated_document: PARTICIPATION_VIOLATION_DOCUMENT_METADATA_FIELDS,
  deadline: DEADLINE_METADATA_FIELDS,
  privacy_review: PRIVACY_REVIEW_METADATA_FIELDS,
  case_person_binding: PERSON_BINDING_METADATA_FIELDS,
  security_session: SECURITY_SESSION_METADATA_FIELDS,
  case_search_index: SEARCH_INDEX_METADATA_FIELDS,
  report: REPORT_METADATA_FIELDS,
  protected_person: ['reasonCode'] as const,
  contact: ['category'] as const,
  case: ['category', 'bindingState', 'hasCaseFilter'] as const,
  case_content: ['category', 'bindingState', 'hasCaseFilter'] as const,
  case_document: ['category', 'bindingState', 'documentKind'] as const,
  bem_process: [] as const,
  prevention_process: [] as const,
  equalization_process: [] as const,
  termination_hearing: [] as const,
  case_measure: [] as const,
  case_measure_participation: [] as const,
  case_measure_workplace_accommodation: [] as const,
  case_note: [] as const,
  case_note_link: [] as const,
} as const satisfies Record<string, readonly string[]>;

export type AuditMetadataPolicySubjectType = keyof typeof AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE;

export const AUDIT_METADATA_POLICY_SUBJECT_TYPES = Object.keys(
  AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE,
).sort() as AuditMetadataPolicySubjectType[];

function fieldsForSubjectType(subjectType?: string): readonly string[] {
  if (!subjectType) {
    return Array.from(new Set([
      ...AUDIT_CORE_METADATA_FIELDS,
      ...Object.values(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE).flat(),
    ])).sort();
  }
  return AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE[subjectType as AuditMetadataPolicySubjectType] ?? [];
}

export function hasAuditMetadataPolicy(subjectType: string): subjectType is AuditMetadataPolicySubjectType {
  return Object.prototype.hasOwnProperty.call(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE, subjectType);
}

export function allowedAuditMetadataFields(subjectType?: string): Set<string> {
  return new Set([...AUDIT_CORE_METADATA_FIELDS, ...fieldsForSubjectType(subjectType)]);
}

export function auditMetadataPolicyReport(subjectTypes: readonly string[]): {
  covered: string[];
  missing: string[];
} {
  const uniqueSubjectTypes = Array.from(new Set(subjectTypes)).sort();
  return {
    covered: uniqueSubjectTypes.filter(hasAuditMetadataPolicy),
    missing: uniqueSubjectTypes.filter((subjectType) => !hasAuditMetadataPolicy(subjectType)),
  };
}
