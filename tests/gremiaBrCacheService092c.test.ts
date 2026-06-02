import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { GREMIA_BR_CACHE_TTL_DAYS, GremiaBrCacheService } from '../services/gremiaBr/gremiaBrCacheService';
import type { GremiaBrReadAdapter } from '../services/gremiaBr/gremiaBrTypes';

interface CacheRow {
  id: string;
  cache_key: string;
  source_type: string;
  payload_json: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

class CacheDb implements DatabaseAdapter {
  rows = new Map<string, CacheRow>();

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      get(cacheKey?: string): T | undefined {
        if (/FROM gremia_br_cache_entries/i.test(sql) && /WHERE cache_key = \?/i.test(sql)) {
          return self.rows.get(String(cacheKey)) as T | undefined;
        }
        return undefined;
      },
      all(): T[] { return []; },
      run(...params: unknown[]) {
        if (/INSERT INTO gremia_br_cache_entries/i.test(sql)) {
          const row: CacheRow = {
            id: String(params[0]),
            cache_key: String(params[1]),
            source_type: String(params[2]),
            payload_json: String(params[3]),
            fetched_at: String(params[4]),
            created_at: String(params[5]),
            updated_at: String(params[6]),
          };
          self.rows.set(row.cache_key, row);
        }
        if (/DELETE FROM gremia_br_cache_entries/i.test(sql) && /WHERE fetched_at < \?/i.test(sql)) {
          const cutoff = String(params[0]);
          const before = self.rows.size;
          for (const [key, row] of [...self.rows.entries()]) {
            if (row.fetched_at < cutoff) self.rows.delete(key);
          }
          return { changes: before - self.rows.size };
        }
        if (/DELETE FROM gremia_br_cache_entries/i.test(sql)) {
          const before = self.rows.size;
          self.rows.clear();
          return { changes: before };
        }
        return { changes: 1 };
      },
    };
  }

  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

class FakeReadAdapter implements GremiaBrReadAdapter {
  calls: string[] = [];

  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async listRelevantMeetings(): Promise<unknown[]> { return this.getUpcomingMeetings(); }
  async getReferenceById(_id: string): Promise<unknown | null> { return null; }
  async searchDecisions(_query: string): Promise<unknown[]> { return []; }
  async getDecisionStatistics(): Promise<unknown | null> {
    this.calls.push('stats');
    return { offen: 1 };
  }
  async getExtendedDecisionStatistics(): Promise<unknown | null> {
    this.calls.push('extended-stats');
    return { offen: 1, faellig: 1 };
  }
  async suggestForInlineCommand(_q: string): Promise<unknown[]> { return []; }

  async getNextMeeting(): Promise<unknown | null> {
    this.calls.push('next');
    return { id: 's1', titel: 'Nächste BR-Sitzung' };
  }

  async getCurrentMeeting(): Promise<unknown | null> {
    this.calls.push('current');
    return { id: 's0', titel: 'Aktuelle BR-Sitzung' };
  }

  async getUpcomingMeetings(): Promise<unknown[]> {
    this.calls.push('upcoming');
    return [{ id: 's1' }, { id: 's2' }];
  }

  async getPendingFollowUps(): Promise<unknown[]> {
    this.calls.push('followups');
    return [{ id: 'w1', titel: 'Wiedervorlage BEM' }];
  }

  async getMeetingById(): Promise<unknown | null> { return null; }
  async getMeetingAgenda(id: string): Promise<unknown[]> {
    this.calls.push(`agenda:${id}`);
    return id === 's1' ? [{ titel: 'BEM und Arbeitsplatzgestaltung' }] : [];
  }

  async getMeetingProtocolStatus(): Promise<unknown | null> { return null; }
  async listProtocols(): Promise<unknown[]> { return []; }
  async getProtocolById(): Promise<unknown | null> { return null; }
  async getProtocolByMeeting(): Promise<unknown | null> { return null; }
  async listProtocolDecisions(): Promise<unknown[]> { return []; }
  async listRelevantDecisions(): Promise<unknown[]> {
    this.calls.push('decisions');
    return [{ id: 'b1', titel: 'BEM-Beschluss' }];
  }

  async getDueDecisions(): Promise<unknown[]> {
    this.calls.push('due');
    return [{ id: 'b2', titel: 'Fälliger Beschluss' }];
  }

  async getOverdueDecisions(): Promise<unknown[]> {
    this.calls.push('overdue');
    return [{ id: 'b3', titel: 'Überfälliger Beschluss' }];
  }
}

describe('Gremia.BR Lesecache 0.9.2-C', () => {
  it('aktualisiert den Cache nur über den explizit aufgerufenen ReadAdapter und liefert eine Übersicht', async () => {
    const db = new CacheDb();
    const adapter = new FakeReadAdapter();
    const service = new GremiaBrCacheService(() => db);

    const result = await service.refresh(adapter);

    expect(result.status).toBe('ok');
    expect(result.refreshedKeys).toEqual(['next_meeting', 'current_meeting', 'upcoming_meetings', 'meeting_agendas', 'pending_follow_ups', 'decisions', 'due_decisions', 'overdue_decisions', 'decision_statistics', 'extended_decision_statistics']);
    expect(adapter.calls).toEqual(['next', 'current', 'upcoming', 'followups', 'agenda:s1', 'agenda:s0', 'agenda:s2', 'decisions', 'due', 'overdue', 'stats', 'extended-stats']);
    expect(result.cached.nextMeeting).toMatchObject({ id: 's1' });
    expect(result.cached.currentMeeting).toMatchObject({ id: 's0' });
    expect(result.cached.upcomingMeetings).toHaveLength(2);
    expect(result.cached.meetingAgendas.s1).toHaveLength(1);
    expect(result.cached.pendingFollowUps).toHaveLength(1);
    expect(result.cached.decisions).toHaveLength(1);
    expect(result.cached.dueDecisions).toHaveLength(1);
    expect(result.cached.overdueDecisions).toHaveLength(1);
    expect(result.cached.decisionStatistics).toMatchObject({ offen: 1 });
    expect(db.rows.size).toBe(10);
  });



  it('begrenzt BR-Lesecache technisch auf 30 Tage und entfernt abgelaufene Einträge', () => {
    const db = new CacheDb();
    const service = new GremiaBrCacheService(() => db);

    service.saveEntry('decisions', [{ id: 'alt' }], '2026-04-01T00:00:00.000Z');
    service.saveEntry('due_decisions', [{ id: 'frisch' }], '2026-05-15T00:00:00.000Z');

    const deleted = service.purgeExpiredEntries(new Date('2026-06-01T00:00:00.000Z'));

    expect(GREMIA_BR_CACHE_TTL_DAYS).toBe(30);
    expect(deleted).toBe(1);
    expect(service.getEntry('decisions')).toBeUndefined();
    expect(service.getEntry('due_decisions')?.payload).toEqual([{ id: 'frisch' }]);
  });

  it('löscht gecachte BR-Daten ohne Settings oder Credentials zu berühren', () => {
    const db = new CacheDb();
    const service = new GremiaBrCacheService(() => db);

    service.saveEntry('decisions', [{ id: 'b1' }], '2026-05-22T10:00:00.000Z');
    expect(service.getOverview().decisions).toHaveLength(1);

    service.clear();

    expect(service.getOverview().decisions).toEqual([]);
    expect(db.rows.size).toBe(0);
  });
});
