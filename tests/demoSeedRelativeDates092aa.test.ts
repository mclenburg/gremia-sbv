import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedDemoDatabase } from '../services/demoSeedService';
import type { DatabaseAdapter } from '../services/databaseService';

type CapturedRun = { sql: string; params: unknown[] };

class CapturingDemoDb implements DatabaseAdapter {
  readonly runs: CapturedRun[] = [];

  prepare<T = unknown>(sql: string) {
    return {
      all: () => [] as T[],
      get: () => undefined as T | undefined,
      run: (...params: unknown[]) => {
        this.runs.push({ sql, params });
        return { changes: 1 };
      },
    };
  }

  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

function deadlineRuns(db: CapturingDemoDb): CapturedRun[] {
  return db.runs.filter((run) => run.sql.includes('INSERT INTO deadlines'));
}

describe('DemoSeed relative Datumswerte', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('legt offene Demo-Fristen relativ zu sysdate in der Zukunft an', () => {
    const db = new CapturingDemoDb();
    seedDemoDatabase(db);

    const now = new Date('2026-05-28T12:00:00.000Z').getTime();
    const rows = deadlineRuns(db).map((run) => ({
      id: String(run.params[0]),
      dueAt: String(run.params[9]),
      status: String(run.params[14]),
    }));

    expect(rows.length).toBeGreaterThan(10);
    const openRows = rows.filter((row) => row.status === 'open');
    expect(openRows.length).toBeGreaterThan(10);
    expect(openRows.every((row) => new Date(row.dueAt).getTime() > now)).toBe(true);
  });

  it('erlaubt überfällige Demo-Fristen nur, wenn sie bereits abgeschlossen sind', () => {
    const db = new CapturingDemoDb();
    seedDemoDatabase(db);

    const now = new Date('2026-05-28T12:00:00.000Z').getTime();
    const overdueRows = deadlineRuns(db)
      .map((run) => ({ dueAt: String(run.params[9]), status: String(run.params[14]) }))
      .filter((row) => new Date(row.dueAt).getTime() < now);

    expect(overdueRows.length).toBeGreaterThan(0);
    expect(overdueRows.every((row) => row.status === 'completed')).toBe(true);
  });
});
