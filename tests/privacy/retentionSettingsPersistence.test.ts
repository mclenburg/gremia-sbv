import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../services/databaseService';
import { MigrationService } from '../../services/migrationService';
import { RetentionService } from '../../services/retentionService';
import { openTestDatabase } from '../helpers/openTestDatabase';

let db: DatabaseAdapter;

beforeEach(async () => {
  db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
});

afterEach(() => db.close());

describe('Retention settings persistence', () => {
  it('speichert und normalisiert individuelle Modulfristen in der zentralen Settings-Tabelle', () => {
    const service = new RetentionService(db, () => '');
    const saved = service.updateSettings({
      moduleRules: {
        recruiting: { kind: 'months_after_completion', months: 18 },
        protected_person: { kind: 'months_after_completion', months: 6 },
      },
    });

    expect(saved.moduleRules.recruiting).toEqual({ kind: 'months_after_completion', months: 18 });
    expect(saved.moduleRules.protected_person).toEqual({ kind: 'months_after_completion', months: 6 });
    expect(new RetentionService(db, () => '').getSettings().moduleRules).toMatchObject({
      recruiting: { kind: 'months_after_completion', months: 18 },
      protected_person: { kind: 'months_after_completion', months: 6 },
    });
  });

  it('übernimmt alte numerische Fall- und Verstoßfristen ohne Modulregel-Verlust', () => {
    const service = new RetentionService(db, () => '');
    const saved = service.updateSettings({
      closedCaseReviewMonths: 24,
      participationViolationReviewMonths: 60,
    });

    expect(saved.moduleRules.case_file).toEqual({ kind: 'months_after_completion', months: 24 });
    expect(saved.moduleRules.sbv_participation).toEqual({ kind: 'term_related', months: 60 });
  });
});
