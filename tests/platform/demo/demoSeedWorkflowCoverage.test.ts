import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { seedDemoDatabase } from '../../../services/demoSeedService';
import { SbvElectionService } from '../../../services/sbvElectionService';
import { SbvParticipationViolationService } from '../../../services/sbvParticipationViolationService';

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly db: DatabaseSync) {}

  prepare<T = unknown>(sql: string) {
    const statement = this.db.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }

  exec(sql: string): void { this.db.exec(sql); }
  pragma(sql: string): unknown { return this.db.exec(`PRAGMA ${sql}`); }
  close(): void { this.db.close(); }
}

function setup() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = new SqliteAdapter(raw);
  seedDemoDatabase(db);
  return { raw, db };
}

describe('Demo-Modus – vollständige fachliche Beispieldaten', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T10:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('enthält eine vorbereitete Wahl mit filterbarer Wählerauswahl und beiden Stimmzettelarten', () => {
    const { raw, db } = setup();
    try {
      const overview = new SbvElectionService(db).overview('demo-election-01');

      expect(overview.election).toMatchObject({ procedure: 'formal', status: 'ballots_ready' });
      expect(new Date(overview.election.electionDate!).getTime()).toBeGreaterThan(Date.now());
      expect(overview.voters.filter((voter) => voter.listStatus === 'eligible').length).toBeGreaterThan(5);
      expect(overview.candidates.map((candidate) => candidate.officeType)).toEqual(
        expect.arrayContaining(['representative', 'deputy']),
      );
    } finally {
      raw.close();
    }
  });

  it('zeigt sowohl einen fallfreien Arbeitgeberverstoß als auch einen Shortlink aus einer Beteiligungsmaßnahme', () => {
    const { raw, db } = setup();
    try {
      const violations = new SbvParticipationViolationService(db).list();

      expect(violations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'demo-violation-general-01',
          sourceContextType: 'general_employer_practice',
          caseId: undefined,
        }),
        expect.objectContaining({
          id: 'demo-violation-measure-01',
          sourceContextType: 'case_measure_participation',
          caseId: 'demo-case-01',
          relatedCaseMeasureId: 'demo-measure-01-sbv_participation',
        }),
      ]));
    } finally {
      raw.close();
    }
  });

  it('behält für Gleichstellung und GdB den sichtbaren Zusammenhang aus Person, Fall und Verfahren', () => {
    const { raw } = setup();
    try {
      const linkedRows = raw.prepare(`
        SELECT ep.id
        FROM equalization_processes ep
        JOIN cases c ON c.id = ep.case_id
        JOIN protected_persons p ON p.id = c.protected_person_id
      `).all();

      expect(linkedRows.length).toBeGreaterThan(0);
    } finally {
      raw.close();
    }
  });
});
