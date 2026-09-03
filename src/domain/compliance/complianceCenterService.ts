import type { GenerateReportInput } from '../models/report.model.js';
import type { ComplianceDocument, ComplianceDocumentDescriptor, ComplianceDocumentType, DataSubjectAccessRequestInput } from '../models/compliance.model.js';
import { COMPLIANCE_DOCUMENTS, complianceDocumentFileName, nowIso, plusDays, toDateInputValue } from './complianceDocumentSupport.js';
import { tomsBody, vvtBody, dsfaBody, matrixBody } from './complianceBodiesCore.js';
import { retentionScheduleBody, dataSubjectRightsBody, dataProtectionNoticeBody, exportPolicyBody } from './complianceBodiesPrivacy.js';
import { approvalBody, dataProtectionStatusBody } from './complianceBodiesRelease.js';
import { dsarBody } from './complianceDsarBody.js';
export { COMPLIANCE_DOCUMENTS } from './complianceDocumentSupport.js';

function bodyFor(type: ComplianceDocumentType, generatedAt: string, dsarInput?: DataSubjectAccessRequestInput): string {
  switch (type) {
    case 'toms': return tomsBody(generatedAt);
    case 'vvt': return vvtBody(generatedAt);
    case 'dsfa': return dsfaBody(generatedAt);
    case 'dsgvo_bdsg_matrix': return matrixBody(generatedAt);
    case 'retention_schedule': return retentionScheduleBody(generatedAt);
    case 'data_subject_rights': return dataSubjectRightsBody(generatedAt);
    case 'data_protection_notice': return dataProtectionNoticeBody(generatedAt);
    case 'export_policy': return exportPolicyBody(generatedAt);
    case 'dsb_it_security_approval': return approvalBody(generatedAt);
    case 'data_protection_status': return dataProtectionStatusBody(generatedAt);
    case 'dsar_response': return dsarBody(dsarInput ?? defaultDsarInput(), generatedAt);
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

export function listComplianceDocuments(): ComplianceDocumentDescriptor[] {
  return COMPLIANCE_DOCUMENTS;
}

export function renderComplianceDocument(type: ComplianceDocumentType): ComplianceDocument {
  const generatedAt = nowIso();
  const descriptor = COMPLIANCE_DOCUMENTS.find((item) => item.type === type) ?? COMPLIANCE_DOCUMENTS[0];
  return {
    type: descriptor.type,
    title: descriptor.title,
    description: descriptor.description,
    filename: complianceDocumentFileName(descriptor.type, generatedAt),
    body: bodyFor(descriptor.type, generatedAt),
    generatedAt
  };
}

export function defaultDsarInput(): DataSubjectAccessRequestInput {
  const received = new Date();
  return {
    requesterName: '',
    requestReceivedAt: toDateInputValue(received),
    responseDueAt: toDateInputValue(plusDays(received, 30)),
    caseReference: '',
    identityVerified: false,
    requestScope: 'Auskunft über die in Gremia.SBV verarbeiteten personenbezogenen Daten.',
    preparedBy: 'Schwerbehindertenvertretung',
    responsibleEntity: '',
    privacyContactRole: 'unknown',
    privacyContactName: '',
    privacyContactEmail: '',
    requestForwardedAt: '',
    sbvReviewCompleted: false,
    handedOverAt: '',
    handoverRecipient: '',
  };
}

export function renderDsarResponseDocument(input: DataSubjectAccessRequestInput): ComplianceDocument {
  const generatedAt = nowIso();
  const descriptor = COMPLIANCE_DOCUMENTS.find((item) => item.type === 'dsar_response')!;
  return {
    type: 'dsar_response',
    title: descriptor.title,
    description: descriptor.description,
    filename: complianceDocumentFileName('dsar_response', generatedAt),
    body: bodyFor('dsar_response', generatedAt, input),
    generatedAt
  };
}

export function complianceClassificationFor(type: ComplianceDocumentType): string {
  switch (type) {
    case 'toms':
    case 'vvt':
    case 'dsgvo_bdsg_matrix':
    case 'retention_schedule':
    case 'data_subject_rights':
    case 'data_protection_notice':
    case 'export_policy':
    case 'data_protection_status':
      return 'Intern / Compliance';
    case 'dsfa':
    case 'dsb_it_security_approval':
      return 'Intern vertraulich';
    case 'dsar_response':
      return 'SBV-Zuarbeit / Datenschutz vertraulich';
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

export function buildComplianceReportInput(document: ComplianceDocument): GenerateReportInput {
  return {
    type: 'compliance_document',
    complianceDocumentType: document.type,
    complianceTitle: document.title,
    complianceSubtitle: document.description,
    complianceClassification: complianceClassificationFor(document.type),
    complianceBody: document.body
  };
}
