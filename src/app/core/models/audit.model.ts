export type PersonalDataAuditAction =
  | 'read'
  | 'search'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'open'
  | 'anonymize'
  | 'restore'
  | 'backup'
  | 'security';

export interface PersonalDataAuditRecord {
  id: string;
  sequence: number;
  occurredAt: string;
  actor: string;
  action: PersonalDataAuditAction;
  subjectType: string;
  subjectId?: string;
  caseId?: string;
  purpose: string;
  metadataJson: string;
  previousHash: string;
  entryHash: string;
}

export interface CreatePersonalDataAuditInput {
  actor?: string;
  action: PersonalDataAuditAction;
  subjectType: string;
  subjectId?: string;
  caseId?: string;
  purpose: string;
  metadata?: Record<string, unknown>;
}


export interface PersonalDataAuditChainIssue {
  kind: string;
  sequence: number;
  expected?: string;
  actual?: string;
  message: string;
}

export interface PersonalDataAuditChainStatus {
  ok: boolean;
  checked: number;
  firstSequence?: number;
  lastSequence?: number;
  firstBrokenSequence?: number;
  latestHash: string;
  algorithm: string;
  chainVersion: number;
  issues: PersonalDataAuditChainIssue[];
}
