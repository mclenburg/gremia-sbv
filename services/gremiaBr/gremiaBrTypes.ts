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
  getCurrentMeeting(): Promise<unknown | null>;
  getUpcomingMeetings(): Promise<unknown[]>;
  getPendingFollowUps(date?: string): Promise<unknown[]>;
  getMeetingById(id: string): Promise<unknown | null>;
  getMeetingAgenda(id: string): Promise<unknown[]>;
  getMeetingProtocolStatus(id: string): Promise<unknown | null>;
  listProtocols(): Promise<unknown[]>;
  getProtocolById(id: string): Promise<unknown | null>;
  getProtocolByMeeting(sitzungId: string): Promise<unknown | null>;
  listProtocolDecisions(id: string): Promise<unknown[]>;
  listRelevantDecisions(): Promise<unknown[]>;
  getDueDecisions(): Promise<unknown[]>;
  getOverdueDecisions(): Promise<unknown[]>;
  searchDecisions(query: string): Promise<unknown[]>;
  getDecisionStatistics(): Promise<unknown | null>;
  getExtendedDecisionStatistics(): Promise<unknown | null>;
  suggestForInlineCommand(q: string): Promise<unknown[]>;
  getDecisionById?(id: string): Promise<unknown | null>;
}

export interface GremiaBrSettingsStore {
  getServiceSettings(): GremiaBrServiceSettings;
  markConnectionFailure(checkedAt: string): void;
  markSuccessfulConnection(checkedAt: string, profile: GremiaBrProfileSnapshot): void;
}
