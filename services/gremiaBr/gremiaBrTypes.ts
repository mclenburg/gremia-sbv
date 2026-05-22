export interface GremiaBrStoredSettings {
  id: 'default';
  enabled: boolean;
  serverUrl: string;
  username: string;
  passwordSecret: string;
  lastConnectionTestAt?: string;
  lastSuccessfulLoginAt?: string;
  profileJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GremiaBrServiceSettings {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password: string;
}

export interface GremiaBrProfileSnapshot {
  displayName?: string;
  role?: string;
  email?: string;
}

export interface GremiaBrRequestOptions {
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export interface GremiaBrReadAdapter {
  listWorksAgreements(): Promise<unknown[]>;
  listRelevantMeetings(): Promise<unknown[]>;
  getReferenceById(id: string): Promise<unknown | null>;
  getNextMeeting(): Promise<unknown | null>;
  getUpcomingMeetings(): Promise<unknown[]>;
  getMeetingAgenda(id: string): Promise<unknown[]>;
  listRelevantDecisions(): Promise<unknown[]>;
  getDueDecisions(): Promise<unknown[]>;
  getOverdueDecisions(): Promise<unknown[]>;
  searchDecisions(query: string): Promise<unknown[]>;
  suggestForInlineCommand(q: string): Promise<unknown[]>;
  getDecisionById?(id: string): Promise<unknown | null>;
}

export interface GremiaBrSettingsStore {
  getServiceSettings(): GremiaBrServiceSettings;
  markConnectionFailure(checkedAt: string): void;
  markSuccessfulConnection(checkedAt: string, profile: GremiaBrProfileSnapshot): void;
}
