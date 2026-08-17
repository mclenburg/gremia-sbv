export const RETENTION_OWNER_TYPES = [
  'case',
  'election',
  'meeting',
  'assembly',
  'inclusion_agreement',
  'employer_obligation_review',
] as const;

export type RetentionOwnerType = (typeof RETENTION_OWNER_TYPES)[number];

export interface RetentionOwnerSnapshot {
  ownerType: RetentionOwnerType;
  ownerId: string;
  reference?: string;
  status?: string;
  retentionUntil?: string | null;
  legalHoldActive: boolean;
  legalHoldReasonKey?: string;
  legalHoldUntil?: string | null;
}

export interface RetentionLegalHoldRecord {
  id: string;
  ownerType: RetentionOwnerType;
  ownerId: string;
  reasonKey: string;
  legalReference?: string;
  startsAt: string;
  untilAt?: string;
  releasedAt?: string;
  releaseReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionOwnerRef {
  type: RetentionOwnerType;
  id: string;
}
