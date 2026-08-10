import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;

beforeEach(async () => { db = await openTestDatabase(); });
afterEach(() => db.close());

function migrator(): MigrationService {
  return new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations'));
}

describe('BEM-Schemamigration – ausführbarer Vertrag', () => {
  it('erzeugt auf einer frischen Datenbank das vollständige BEM-Schema', () => {
    const result = migrator().migrate();
    const columns = db.prepare<{ name: string }>('PRAGMA table_info(bem_processes)').all().map((row) => row.name);

    expect(result.currentSchemaVersion).not.toBe('0000');
    expect(columns).toEqual(expect.arrayContaining([
      'id', 'case_id', 'status', 'title', 'trigger_type', 'employee_response',
      'privacy_notice_at', 'consent_scope', 'measure_owners', 'completion_reason',
      'created_at', 'updated_at',
    ]));
    expect(db.prepare<{ found: number }>("SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='bem_process_events'").get()?.found).toBe(1);
    expect(db.prepare<{ found: number }>("SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='bem_process_contacts'").get()?.found).toBe(1);
  });

  it('ist idempotent und lässt bereits erzeugte BEM-Daten unverändert', () => {
    migrator().migrate();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` )
      .run('case-bem', 'SBV-TEST', 'Testperson', 'bem', 'offen', 'normal', now, 1, 0, now, now);
    db.prepare(`INSERT INTO bem_processes (id, case_id, status, title, trigger_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('bem-1', 'case-bem', 'offered', 'BEM-Test', 'absence', new Date().toISOString(), new Date().toISOString());

    const second = migrator().migrate();
    expect(second.applied).toEqual([]);
    expect(db.prepare<{ title: string }>('SELECT title FROM bem_processes WHERE id = ?').get('bem-1')?.title).toBe('BEM-Test');
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM bem_processes WHERE id = ?').get('bem-1')?.count).toBe(1);
  });
});
