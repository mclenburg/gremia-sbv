import type {
  GremiaBrCachedOverview,
  GremiaBrDashboardOverview,
  GremiaBrCacheEntry,
  GremiaBrCacheRefreshResult,
  GremiaBrCacheSourceType,
  GremiaBrRelevanceSettings,
  GremiaBrOwnTask,
  GremiaBrOwnAccessApproval,
} from '../../src/domain/models/gremia-br.model.js';
import type { GremiaBrReadAdapter } from './gremiaBrTypes.js';
import { filterRelevantGremiaBrMeetings, getGremiaBrItemId } from './gremiaBrRelevanceService.js';

const CACHE_KEYS: readonly GremiaBrCacheSourceType[] = [
  'own_tasks',
  'own_access_approvals',
  'next_meeting',
  'current_meeting',
  'upcoming_meetings',
  'meeting_agendas',
  'pending_follow_ups',
  'decisions',
  'due_decisions',
  'overdue_decisions',
  'decision_statistics',
  'extended_decision_statistics',
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asAgendaMap(value: unknown): Record<string, unknown[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, unknown[]> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    if (Array.isArray(nested)) result[key] = nested;
  });
  return result;
}

function latestTimestamp(entries: Array<GremiaBrCacheEntry | undefined>): string | undefined {
  return entries
    .map((entry) => entry?.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

function cacheAgeLabel(fetchedAt?: string): string | undefined {
  if (!fetchedAt) return undefined;
  const then = Date.parse(fetchedAt);
  if (!Number.isFinite(then)) return undefined;
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (minutes < 1) return 'gerade aktualisiert';
  if (minutes === 1) return 'vor 1 Minute aktualisiert';
  if (minutes < 60) return `vor ${minutes} Minuten aktualisiert`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'vor 1 Stunde aktualisiert';
  if (hours < 48) return `vor ${hours} Stunden aktualisiert`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'vor 1 Tag aktualisiert' : `vor ${days} Tagen aktualisiert`;
}

export class GremiaBrCacheService {
  private entries = new Map<GremiaBrCacheSourceType, GremiaBrCacheEntry>();

  private readEntry(cacheKey: GremiaBrCacheSourceType): GremiaBrCacheEntry | undefined {
    return this.entries.get(cacheKey);
  }

  getEntry(cacheKey: GremiaBrCacheSourceType): GremiaBrCacheEntry | undefined {
    return this.readEntry(cacheKey);
  }

  getOverview(): GremiaBrCachedOverview {
    const ownTasks = this.readEntry('own_tasks');
    const ownAccessApprovals = this.readEntry('own_access_approvals');
    const nextMeeting = this.readEntry('next_meeting');
    const currentMeeting = this.readEntry('current_meeting');
    const upcomingMeetings = this.readEntry('upcoming_meetings');
    const meetingAgendas = this.readEntry('meeting_agendas');
    const pendingFollowUps = this.readEntry('pending_follow_ups');
    const decisions = this.readEntry('decisions');
    const dueDecisions = this.readEntry('due_decisions');
    const overdueDecisions = this.readEntry('overdue_decisions');
    const decisionStatistics = this.readEntry('decision_statistics');
    const extendedDecisionStatistics = this.readEntry('extended_decision_statistics');
    const lastFetchedAt = latestTimestamp([
      ownTasks, ownAccessApprovals, nextMeeting, currentMeeting, upcomingMeetings, meetingAgendas, pendingFollowUps, decisions, dueDecisions, overdueDecisions, decisionStatistics, extendedDecisionStatistics,
    ]);

    return {
      ownTasks: asArray(ownTasks?.payload) as GremiaBrOwnTask[],
      ownAccessApprovals: asArray(ownAccessApprovals?.payload) as GremiaBrOwnAccessApproval[],
      nextMeeting: nextMeeting?.payload,
      currentMeeting: currentMeeting?.payload,
      upcomingMeetings: asArray(upcomingMeetings?.payload),
      meetingAgendas: asAgendaMap(meetingAgendas?.payload),
      pendingFollowUps: asArray(pendingFollowUps?.payload),
      decisions: asArray(decisions?.payload),
      dueDecisions: asArray(dueDecisions?.payload),
      overdueDecisions: asArray(overdueDecisions?.payload),
      decisionStatistics: decisionStatistics?.payload,
      extendedDecisionStatistics: extendedDecisionStatistics?.payload,
      lastFetchedAt,
      cacheAgeLabel: cacheAgeLabel(lastFetchedAt),
    };
  }

  getDashboardOverview(relevanceSettings: GremiaBrRelevanceSettings): GremiaBrDashboardOverview {
    const overview = this.getOverview();
    return {
      ...overview,
      relevanceSettings,
      relevantMeetings: filterRelevantGremiaBrMeetings(overview.upcomingMeetings, overview.meetingAgendas, relevanceSettings),
      openDecisionCount: overview.decisions.length,
      dueDecisionCount: overview.dueDecisions.length,
      overdueDecisionCount: overview.overdueDecisions.length,
    };
  }

  clear(): void {
    this.entries.clear();
  }

  async refresh(adapter: GremiaBrReadAdapter): Promise<GremiaBrCacheRefreshResult> {
    const checkedAt = nowIso();
    const ownTasks = await adapter.listOwnTasks();
    const ownAccessApprovals = await adapter.listOwnPendingAccessApprovals();
    const nextMeeting = await adapter.getNextMeeting();
    const currentMeeting = await adapter.getCurrentMeeting();
    const upcomingMeetings = await adapter.getUpcomingMeetings();
    const pendingFollowUps = await adapter.getPendingFollowUps();
    const meetingIds = Array.from(new Set([nextMeeting, currentMeeting, ...upcomingMeetings]
      .map((item) => getGremiaBrItemId(item))
      .filter((id): id is string => Boolean(id))))
      .slice(0, 12);
    const meetingAgendas: Record<string, unknown[]> = {};
    for (const id of meetingIds) {
      meetingAgendas[id] = await adapter.getMeetingAgenda(id);
    }
    const decisions = await adapter.listRelevantDecisions();
    const dueDecisions = await adapter.getDueDecisions();
    const overdueDecisions = await adapter.getOverdueDecisions();
    const decisionStatistics = await adapter.getDecisionStatistics();
    const extendedDecisionStatistics = await adapter.getExtendedDecisionStatistics();

    const writes: Array<[GremiaBrCacheSourceType, unknown]> = [
      ['own_tasks', ownTasks],
      ['own_access_approvals', ownAccessApprovals],
      ['next_meeting', nextMeeting],
      ['current_meeting', currentMeeting],
      ['upcoming_meetings', upcomingMeetings],
      ['meeting_agendas', meetingAgendas],
      ['pending_follow_ups', pendingFollowUps],
      ['decisions', decisions],
      ['due_decisions', dueDecisions],
      ['overdue_decisions', overdueDecisions],
      ['decision_statistics', decisionStatistics],
      ['extended_decision_statistics', extendedDecisionStatistics],
    ];
    this.entries = new Map(writes.map(([key, payload]) => [key, {
      cacheKey: key,
      sourceType: key,
      payload,
      fetchedAt: checkedAt,
    }]));

    return {
      status: 'ok',
      checkedAt,
      message: 'Gremia.BR-Arbeitsstand wurde aktualisiert.',
      refreshedKeys: [...CACHE_KEYS],
      cached: this.getOverview(),
    };
  }
}
