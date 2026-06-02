export type SbvControlProtocolPartner = 'employer' | 'works_council' | 'joint' | 'other';
export type SbvControlProtocolStatus = 'draft' | 'documented' | 'follow_up_open' | 'closed';
export type SbvControlProtocolTopic = 'workplace_rules' | 'inclusion_agreement' | 'accessibility' | 'procedure' | 'cooperation' | 'other';

export interface SbvControlProtocolRecord {
  id: string;
  title: string;
  partner: SbvControlProtocolPartner;
  topic: SbvControlProtocolTopic;
  meetingAt: string;
  participants?: string;
  legalContext?: string;
  discussion?: string;
  result?: string;
  nextSteps?: string;
  status: SbvControlProtocolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSbvControlProtocolInput {
  title: string;
  partner?: SbvControlProtocolPartner;
  topic?: SbvControlProtocolTopic;
  meetingAt?: string;
  participants?: string;
  legalContext?: string;
  discussion?: string;
  result?: string;
  nextSteps?: string;
  status?: SbvControlProtocolStatus;
}

export type UpdateSbvControlProtocolInput = Partial<CreateSbvControlProtocolInput>;
