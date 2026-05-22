import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { GremiaBrCacheService } from '../services/gremiaBr/gremiaBrCacheService';
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
        if (/DELETE FROM gremia_br_cache_entries/i.test(sql)) self.rows.clear();
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
  async suggestForInlineCommand(_q: string): Promise<unknown[]> { return []; }

  async getNextMeeting(): Promise<unknown | null> {
    this.calls.push('next');
    return { id: 's1', titel: 'Nächste BR-Sitzung' };
  }

  async getUpcomingMeetings(): Promise<unknown[]> {
    this.calls.push('upcoming');
    return [{ id: 's1' }, { id: 's2' }];
  }

  async getMeetingAgenda(id: string): Promise<unknown[]> {
    this.calls.push(`agenda:${id}`);
    return id === 's1' ? [{ titel: 'BEM und Arbeitsplatzgestaltung' }] : [];
  }

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
    expect(result.refreshedKeys).toEqual(['next_meeting', 'upcoming_meetings', 'meeting_agendas', 'decisions', 'due_decisions', 'overdue_decisions']);
    expect(adapter.calls).toEqual(['next', 'upcoming', 'agenda:s1', 'agenda:s2', 'decisions', 'due', 'overdue']);
    expect(result.cached.nextMeeting).toMatchObject({ id: 's1' });
    expect(result.cached.upcomingMeetings).toHaveLength(2);
    expect(result.cached.meetingAgendas.s1).toHaveLength(1);
    expect(result.cached.decisions).toHaveLength(1);
    expect(result.cached.dueDecisions).toHaveLength(1);
    expect(result.cached.overdueDecisions).toHaveLength(1);
    expect(db.rows.size).toBe(6);
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
