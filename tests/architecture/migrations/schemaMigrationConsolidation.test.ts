import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseRuntimeInitializer } from '../../../services/databaseRuntimeInitializer';
import { getSchemaMigrationHook } from '../../../services/schemaMigrationHooks';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { RetentionService } from '../../../services/retentionService';
import { ensureSbvParticipationViolationSchema } from '../../../services/sbvParticipationViolationSchema';
import { ensureSbvParticipationViolationRuntimeSchema } from '../../../services/runtimeSchemaCompatibility';
import { openTestDatabase } from '../../helpers/openTestDatabase';

function dataOnlyDb(): DatabaseAdapter {
  return new Proxy({} as DatabaseAdapter, {
    get(_target, property) {
      if (property === 'exec') {
        return (sql: string) => {
          if (/\b(?:CREATE|ALTER|DROP)\b/i.test(sql)) {
            throw new Error(`Strukturelles SQL im Runtime-Initializer: ${sql}`);
          }
        };
      }
      if (property === 'prepare') {
        return (sql: string) => {
          if (/\b(?:CREATE|ALTER|DROP)\b/i.test(sql)) {
            throw new Error(`Strukturelles SQL im Runtime-Initializer: ${sql}`);
          }
          return { all: () => [], get: () => undefined, run: vi.fn() };
        };
      }
      return undefined;
    },
  });
}

describe('Schema-Migrationskonsolidierung 0049', () => {
  it('registriert sämtliche Kompatibilitätsschemata in genau einem versionierten Hook', () => {
    const hook = getSchemaMigrationHook('0049');
    expect(hook).toBeDefined();
    expect(new Set(hook?.components).size).toBe(hook?.components.length);
    expect(hook?.components).toEqual(expect.arrayContaining([
      'cases_and_fts',
      'search_index',
      'privacy_review',
      'document_ocr',
      'reports',
      'templates',
    ]));
  });

  it('registriert Komponenten wiederholbar ohne Datenverlust oder Änderung des Schemas', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      db.exec(readFileSync('database/migrations/0049_schema_consolidation.sql', 'utf8'));
      db.prepare(`
        INSERT INTO personal_data_audit_log (
          id, sequence, occurred_at, actor, action, subject_type,
          purpose, metadata_json, previous_hash, entry_hash
        ) VALUES ('audit-1', 1, '2026-01-01T00:00:00.000Z', 'test', 'create', 'measure_lifecycle',
          'lifecycle', '{}', ?, ?)
      `).run('0'.repeat(64), '1'.repeat(64));
      const hook = getSchemaMigrationHook('0049');
      expect(hook).toBeDefined();
      const structureBefore = db.prepare('SELECT * FROM sqlite_schema ORDER BY name').all();
      const originalAuditRows = db.prepare('SELECT * FROM personal_data_audit_log ORDER BY sequence').all();

      for (let application = 0; application < 2; application += 1) {
        hook!.apply(db);
        const registered = db.prepare<{ component: string }>(
          'SELECT component FROM schema_migration_components WHERE migration_version = ? ORDER BY component',
        ).all('0049');
        expect(registered.map((row) => row.component)).toEqual([...hook!.components].sort());
        expect(db.prepare('SELECT * FROM sqlite_schema ORDER BY name').all()).toEqual(structureBefore);
        expect(db.prepare('SELECT * FROM personal_data_audit_log ORDER BY sequence').all()).toEqual(originalAuditRows);
      }
    } finally {
      db.close();
    }
  });

  it('hält die nachgelagerte Runtime-Initialisierung frei von strukturellem SQL', () => {
    expect(() => new DatabaseRuntimeInitializer(dataOnlyDb()).initialize()).not.toThrow(/Strukturelles SQL/);
  });

  it('führt auch während fachlicher Retention-Abfragen kein strukturelles SQL aus', () => {
    const service = new RetentionService(dataOnlyDb(), () => '');

    expect(() => service.getSettings()).not.toThrow(/Strukturelles SQL/);
  });

  it.each([
    { name: 'domain schema facade', ensureSchema: ensureSbvParticipationViolationSchema },
    { name: 'runtime compatibility facade', ensureSchema: ensureSbvParticipationViolationRuntimeSchema },
  ])('repariert über $name fehlende Tabellen und erhält bestehende Verstoßdaten', async ({ ensureSchema }) => {
    const db = await openTestDatabase();
    try {
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      db.exec(`
        DROP TABLE sbv_participation_violation_documents;
        DROP TABLE sbv_participation_violation_events;
        DROP TABLE sbv_participation_violations;
      `);
      ensureSchema(db);
      db.prepare(`
        INSERT INTO sbv_participation_violations (
          id, stage, status, violation_type, source_context_type, source_context_id,
          subject, measure_description, wrong_behavior, required_behavior, created_at, updated_at
        ) VALUES ('violation-1', 'request', 'draft', 'not_heard', 'general_employer_practice', '',
          'Prüfung', 'Maßnahme', 'Anhörung fehlt', 'Anhörung nachholen', ?, ?)
      `).run('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      db.prepare(`
        INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, created_at)
        VALUES ('event-1', 'violation-1', 'created', ?)
      `).run('2026-01-01T00:00:00.000Z');
      const violationBefore = db.prepare('SELECT * FROM sbv_participation_violations').all();
      const eventsBefore = db.prepare('SELECT * FROM sbv_participation_violation_events').all();

      ensureSchema(db);
      expect(db.prepare('SELECT * FROM sbv_participation_violations').all()).toEqual(violationBefore);
      expect(db.prepare('SELECT * FROM sbv_participation_violation_events').all()).toEqual(eventsBefore);
      expect(() => db.prepare("UPDATE sbv_participation_violations SET status = 'invalid'").run()).toThrow();
      db.prepare("DELETE FROM sbv_participation_violations WHERE id = 'violation-1'").run();
      expect(db.prepare('SELECT * FROM sbv_participation_violation_events').all()).toEqual([]);
      expect(db.pragma('foreign_key_check')).toEqual([]);
    } finally {
      db.close();
    }
  });
});
