export interface WorksAgreementReference {
  id: string;
  title: string;
  effectiveFrom?: string;
}

export interface BrMeetingReference {
  id: string;
  title: string;
  date: string;
}

export interface GremiaBrReference {
  id: string;
  type: 'works_agreement' | 'meeting' | 'decision' | 'other';
  title: string;
}

export interface GremiaBrReadAdapter {
  listWorksAgreements(): Promise<WorksAgreementReference[]>;
  listRelevantMeetings(): Promise<BrMeetingReference[]>;
  getReferenceById(id: string): Promise<GremiaBrReference | null>;
}

export class NoopGremiaBrReadAdapter implements GremiaBrReadAdapter {
  async listWorksAgreements(): Promise<WorksAgreementReference[]> {
    return [];
  }

  async listRelevantMeetings(): Promise<BrMeetingReference[]> {
    return [];
  }

  async getReferenceById(_id: string): Promise<GremiaBrReference | null> {
    return null;
  }
}
