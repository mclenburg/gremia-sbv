export type ComplianceDocumentType =
  | 'toms'
  | 'dsfa'
  | 'dsgvo_bdsg_matrix'
  | 'dsb_it_security_approval'
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
