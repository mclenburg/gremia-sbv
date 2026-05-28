import type { DatabaseAdapter } from '../databaseService.js';
import type {
  GremiaBrCachedOverview,
  GremiaBrDashboardOverview,
  GremiaBrCacheEntry,
  GremiaBrCacheRefreshResult,
  GremiaBrCacheSourceType,
  GremiaBrRelevanceSettings,
} from '../../src/app/core/models/gremia-br.model.js';
import type { GremiaBrReadAdapter } from './gremiaBrTypes.js';
import { filterRelevantGremiaBrMeetings, getGremiaBrItemId } from './gremiaBrRelevanceService.js';

interface CacheRow {
  cache_key: string;
  source_type: string;
  payload_json: string;
  fetched_at: string;
}

const CACHE_KEYS: readonly GremiaBrCacheSourceType[] = [
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

function parsePayload(row?: CacheRow): unknown {
  if (!row?.payload_json) return undefined;
  try {
    return JSON.parse(row.payload_json) as unknown;
  } catch {
    return undefined;
  }
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
  constructor(private readonly getDb: () => DatabaseAdapter) {}

  private db(): DatabaseAdapter {
    return this.getDb();
  }

  getEntry(cacheKey: GremiaBrCacheSourceType): GremiaBrCacheEntry | undefined {
    const row = this.db().prepare<CacheRow>(`
      SELECT cache_key, source_type, payload_json, fetched_at
      FROM gremia_br_cache_entries
      WHERE cache_key = ?
    `).get(cacheKey);
    if (!row) return undefined;
    return {
      cacheKey: row.cache_key as GremiaBrCacheSourceType,
      sourceType: row.source_type as GremiaBrCacheSourceType,
      payload: parsePayload(row),
      fetchedAt: row.fetched_at,
    };
  }

  getOverview(): GremiaBrCachedOverview {
    const nextMeeting = this.getEntry('next_meeting');
    const currentMeeting = this.getEntry('current_meeting');
    const upcomingMeetings = this.getEntry('upcoming_meetings');
    const meetingAgendas = this.getEntry('meeting_agendas');
    const pendingFollowUps = this.getEntry('pending_follow_ups');
    const decisions = this.getEntry('decisions');
    const dueDecisions = this.getEntry('due_decisions');
    const overdueDecisions = this.getEntry('overdue_decisions');
    const decisionStatistics = this.getEntry('decision_statistics');
    const extendedDecisionStatistics = this.getEntry('extended_decision_statistics');
    const lastFetchedAt = latestTimestamp([
      nextMeeting, currentMeeting, upcomingMeetings, meetingAgendas, pendingFollowUps, decisions, dueDecisions, overdueDecisions, decisionStatistics, extendedDecisionStatistics,
    ]);

    return {
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

  saveEntry(cacheKey: GremiaBrCacheSourceType, payload: unknown, fetchedAt = nowIso()): GremiaBrCacheEntry {
    const payloadJson = JSON.stringify(payload ?? null);
    this.db().prepare(`
      INSERT INTO gremia_br_cache_entries (id, cache_key, source_type, payload_json, fetched_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        source_type = excluded.source_type,
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        updated_at = excluded.updated_at
    `).run(`gremia-br-cache:${cacheKey}`, cacheKey, cacheKey, payloadJson, fetchedAt, fetchedAt, fetchedAt);
    return this.getEntry(cacheKey)!;
  }

  clear(): void {
    this.db().prepare('DELETE FROM gremia_br_cache_entries').run();
  }

  async refresh(adapter: GremiaBrReadAdapter): Promise<GremiaBrCacheRefreshResult> {
    const checkedAt = nowIso();
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
      try {
        meetingAgendas[id] = await adapter.getMeetingAgenda(id);
      } catch {
        meetingAgendas[id] = [];
      }
    }
    const decisions = await adapter.listRelevantDecisions();
    const dueDecisions = await adapter.getDueDecisions();
    const overdueDecisions = await adapter.getOverdueDecisions();
    const decisionStatistics = await adapter.getDecisionStatistics();
    const extendedDecisionStatistics = await adapter.getExtendedDecisionStatistics();

    const writes: Array<[GremiaBrCacheSourceType, unknown]> = [
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
    for (const [key, payload] of writes) this.saveEntry(key, payload, checkedAt);

    return {
      status: 'ok',
      checkedAt,
      message: 'Gremia.BR-Lesecache wurde aktualisiert.',
      refreshedKeys: [...CACHE_KEYS],
      cached: this.getOverview(),
    };
  }
}
