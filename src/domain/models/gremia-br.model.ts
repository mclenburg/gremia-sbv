export type GremiaBrApiMode = 'legacy_read_bridge' | 'gremia_br_v2';

export interface GremiaBrSettingsInput {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password?: string;
  apiMode?: GremiaBrApiMode;
  selectedBodyId?: string;
  selectedBodyName?: string;
  selectedOrganizationId?: string;
  selectedSecurityDomain?: string;
  relevanceSettings?: GremiaBrRelevanceSettings;
}

export interface GremiaBrPublicSettings {
  enabled: boolean;
  serverUrl: string;
  username: string;
  hasStoredCredentials: boolean;
  apiMode: GremiaBrApiMode;
  selectedBodyId?: string;
  selectedBodyName?: string;
  selectedOrganizationId?: string;
  selectedSecurityDomain?: string;
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

export interface GremiaBrWorkspaceBody {
  bodyId: string;
  bodyName: string;
  bodyType: string;
  organizationId: string;
  securityDomain?: string;
  contentProtectionClass?: string;
  termValidUntil?: string;
}

export interface GremiaBrPolicyCheckResult {
  allowed: boolean;
  reason?: string;
}


export type GremiaBrCacheSourceType =
  | 'accessible_cases'
  | 'own_tasks'
  | 'own_access_approvals'
  | 'next_meeting'
  | 'current_meeting'
  | 'upcoming_meetings'
  | 'meeting_agendas'
  | 'pending_follow_ups'
  | 'decisions'
  | 'due_decisions'
  | 'overdue_decisions'
  | 'decision_statistics'
  | 'extended_decision_statistics';

export interface GremiaBrCacheEntry {
  cacheKey: GremiaBrCacheSourceType;
  sourceType: GremiaBrCacheSourceType;
  payload: unknown;
  fetchedAt: string;
}

export interface GremiaBrCachedOverview {
  accessibleCases: GremiaBrRemoteCase[];
  ownTasks: GremiaBrOwnTask[];
  ownAccessApprovals: GremiaBrOwnAccessApproval[];
  nextMeeting?: unknown;
  currentMeeting?: unknown;
  upcomingMeetings: unknown[];
  meetingAgendas: Record<string, unknown[]>;
  pendingFollowUps: unknown[];
  decisions: unknown[];
  dueDecisions: unknown[];
  overdueDecisions: unknown[];
  decisionStatistics?: unknown;
  extendedDecisionStatistics?: unknown;
  lastFetchedAt?: string;
  cacheAgeLabel?: string;
}

export interface GremiaBrRemoteCase {
  id: string;
  reference: string;
  subject: string;
  procedureIds: string[];
}

export interface GremiaBrProcedureDetail {
  id: string;
  masterCaseId: string;
  procedureType: string;
  state: string;
  workflow: string;
  openedAt: string;
  version: number;
}

export interface GremiaBrInformationRequest {
  id: string;
  procedureId: string;
  status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'WITHDRAWN';
  requestedAt: string;
  responseDueAt?: string;
  version: number;
}

export interface CreateGremiaBrInformationRequestInput {
  caseId: string;
  procedureId: string;
  items: string;
  reason?: string;
  responseDueAt?: string;
}

export interface CompleteGremiaBrInformationRequestInput {
  caseId: string;
  procedureId: string;
  requestId: string;
  expectedVersion: number;
}

export const GREMIA_BR_OPEN_TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_EXTERNAL', 'QUESTION'] as const;
export type GremiaBrOwnTaskStatus = (typeof GREMIA_BR_OPEN_TASK_STATUSES)[number];
export const GREMIA_BR_TASK_STATUSES = [...GREMIA_BR_OPEN_TASK_STATUSES, 'COMPLETED', 'CANCELLED'] as const;
export type GremiaBrTaskStatus = (typeof GREMIA_BR_TASK_STATUSES)[number];

export interface GremiaBrOwnTask {
  id: string;
  title: string;
  status: GremiaBrOwnTaskStatus;
  dueAt?: string;
  subjectType?: string;
  subjectId?: string;
}

export interface GremiaBrOwnTaskDetail {
  id: string;
  title: string;
  status: GremiaBrTaskStatus;
  version: number;
  description?: string;
  dueAt?: string;
  subjectType?: string;
}

export interface GremiaBrTaskTransitionOptions {
  from: GremiaBrTaskStatus;
  allowed: GremiaBrTaskStatus[];
}

export interface GremiaBrTaskTransitionInput {
  taskId: string;
  to: GremiaBrTaskStatus;
  expectedVersion: number;
}

export interface GremiaBrOwnAccessApproval {
  id: string;
  resourceType: string;
  status: 'PENDING';
  requestedAt: string;
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

export type GremiaBrExternalReferenceType = 'beschluss' | 'sitzung' | 'agenda' | 'protokoll' | 'verfahren';

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

export type GremiaBrProtectionClass = 'INTERNAL' | 'CONFIDENTIAL' | 'HIGH' | 'RESTRICTED';

export interface GremiaBrGeneratedPdfDocument {
  id: string;
  title: string;
  filename: string;
  mimeType: 'application/pdf';
  caseId?: string;
  caseNumber?: string;
  caseDisplayName?: string;
  documentKind: string;
  sha256?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface GremiaBrCreatedPdfDocument {
  id: string;
  title: string;
  filename: string;
  mimeType: 'application/pdf';
  sha256: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CreateGremiaBrCaseSummaryInput {
  caseId: string;
  purpose: string;
  recipientLabel?: string;
}

export interface TransferGremiaBrDocumentInput {
  documentId: string;
  purpose: string;
  targetSecurityDomain: string;
  targetBodyId?: string;
  targetBodyName?: string;
  protectionClass?: GremiaBrProtectionClass;
  validUntil?: string;
  soloJustification?: string;
}

export interface GremiaBrDocumentTransferResult {
  id: string;
  localDocumentId: string;
  localDocumentTitle: string;
  remoteDocumentId: string;
  remoteShareId?: string;
  targetSecurityDomain: string;
  targetBodyName?: string;
  status: 'uploaded' | 'shared' | 'requested';
  message: string;
  createdAt: string;
}

export interface RequestGremiaBrAgendaItemInput {
  meetingId: string;
  title: string;
  description?: string;
  protectionClass?: GremiaBrProtectionClass;
  timeAllocationMinutes?: number;
}

export interface GremiaBrAgendaItemRequestResult {
  id: string;
  meetingId: string;
  agendaVersionId?: string;
  title: string;
  status: 'requested';
  message: string;
  createdAt: string;
}

export interface GremiaBrWorkspaceActionRecord {
  id: string;
  actionType: 'document_uploaded' | 'document_shared' | 'agenda_item_requested' | 'information_requested';
  localDocumentId?: string;
  localDocumentTitle?: string;
  caseId?: string;
  caseNumber?: string;
  targetBodyName?: string;
  targetSecurityDomain?: string;
  remoteDocumentId?: string;
  remoteShareId?: string;
  remoteMeetingId?: string;
  remoteAgendaVersionId?: string;
  purpose: string;
  status: 'uploaded' | 'shared' | 'requested' | 'failed';
  createdAt: string;
}
