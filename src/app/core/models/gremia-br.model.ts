export interface GremiaBrSettingsInput {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password?: string;
  relevanceSettings?: GremiaBrRelevanceSettings;
}

export interface GremiaBrPublicSettings {
  enabled: boolean;
  serverUrl: string;
  username: string;
  hasStoredCredentials: boolean;
  lastConnectionTestAt?: string;
  lastSuccessfulLoginAt?: string;
  profileDisplayName?: string;
  profileRole?: string;
  relevanceSettings: GremiaBrRelevanceSettings;
  updatedAt?: string;
}

export type GremiaBrConnectionStatus = 'disabled' | 'not_configured' | 'ok' | 'failed';

export interface GremiaBrConnectionTestResult {
  status: GremiaBrConnectionStatus;
  message: string;
  profileDisplayName?: string;
  profileRole?: string;
  checkedAt: string;
}

export interface GremiaBrPolicyCheckResult {
  allowed: boolean;
  reason?: string;
}


export type GremiaBrCacheSourceType = 'next_meeting' | 'upcoming_meetings' | 'meeting_agendas' | 'decisions' | 'due_decisions' | 'overdue_decisions';

export interface GremiaBrCacheEntry {
  cacheKey: GremiaBrCacheSourceType;
  sourceType: GremiaBrCacheSourceType;
  payload: unknown;
  fetchedAt: string;
}

export interface GremiaBrCachedOverview {
  nextMeeting?: unknown;
  upcomingMeetings: unknown[];
  meetingAgendas: Record<string, unknown[]>;
  decisions: unknown[];
  dueDecisions: unknown[];
  overdueDecisions: unknown[];
  lastFetchedAt?: string;
  cacheAgeLabel?: string;
}

export interface GremiaBrCacheRefreshResult extends GremiaBrConnectionTestResult {
  refreshedKeys: GremiaBrCacheSourceType[];
  cached: GremiaBrCachedOverview;
}

export interface GremiaBrRelevanceKeywordGroup {
  id: string;
  label: string;
  enabled: boolean;
  keywords: string[];
}

export interface GremiaBrRelevanceSettings {
  groups: GremiaBrRelevanceKeywordGroup[];
}

export interface GremiaBrRelevanceMatch {
  item?: unknown;
  agendaItems?: unknown[];
  matchedGroups: string[];
  matchedKeywords: string[];
}

export interface GremiaBrDashboardOverview extends GremiaBrCachedOverview {
  relevanceSettings: GremiaBrRelevanceSettings;
  relevantMeetings: GremiaBrRelevanceMatch[];
  openDecisionCount: number;
  dueDecisionCount: number;
  overdueDecisionCount: number;
}

export type GremiaBrExternalReferenceType = 'beschluss' | 'sitzung' | 'agenda' | 'protokoll';

export interface GremiaBrExternalReferenceRecord {
  id: string;
  caseId: string;
  sourceSystem: 'gremia_br';
  sourceType: GremiaBrExternalReferenceType;
  sourceId: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  fetchedAt: string;
  snapshot?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGremiaBrExternalReferenceInput {
  caseId: string;
  sourceType: GremiaBrExternalReferenceType;
  sourceId: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  snapshot?: Record<string, unknown>;
}

export interface GremiaBrInlineSuggestion {
  sourceSystem: 'gremia_br';
  sourceType: GremiaBrExternalReferenceType;
  sourceId: string;
  title: string;
  description?: string;
  date?: string;
  label: string;
}
