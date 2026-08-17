export type SbvResourceRecordKind = 'training' | 'deputy_involvement' | 'equipment' | 'other';
export type SbvResourceRecordStatus = 'planned' | 'requested' | 'approved' | 'completed' | 'rejected' | 'documented';

export interface SbvResourceRecord {
  id: string;
  kind: SbvResourceRecordKind;
  title: string;
  legalBasis: string;
  startedAt?: string;
  endedAt?: string;
  provider?: string;
  participants?: string;
  taskContext?: string;
  necessityReason?: string;
  employerReaction?: string;
  costNote?: string;
  status: SbvResourceRecordStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSbvResourceRecordInput {
  kind: SbvResourceRecordKind;
  title: string;
  legalBasis?: string;
  startedAt?: string;
  endedAt?: string;
  provider?: string;
  participants?: string;
  taskContext?: string;
  necessityReason?: string;
  employerReaction?: string;
  costNote?: string;
  status?: SbvResourceRecordStatus;
  notes?: string;
}

export type UpdateSbvResourceRecordInput = Partial<CreateSbvResourceRecordInput>;

export interface SbvResourceDashboardSummary {
  total: number;
  trainings: number;
  deputyInvolvements: number;
  openRequests: number;
  rejected: number;
  completed: number;
}
