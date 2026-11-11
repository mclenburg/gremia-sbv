import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { collectVacationV5CaseSections } from '../../../../services/vacationV5CaseCollector';
import { importVacationV5CaseSections } from '../../../../services/vacationV5CaseImporter';

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter };
}

function sourceSections() {
  const source = database();
  try {
    source.raw.exec(`
      INSERT INTO protected_persons (id, first_name, last_name, protection_status, created_at, updated_at)
        VALUES ('source-person', 'Alex', 'Beispiel', 'unclear', '2026-11-11', '2026-11-11');
      INSERT INTO cases (id, case_number, display_name, category, status, opened_at, protected_person_id, created_at, updated_at)
        VALUES ('source-case', 'SBV-1', 'Anfrage', 'sonstiges', 'offen', '2026-11-11', 'source-person', '2026-11-11', '2026-11-11');
      INSERT INTO case_measures (id, case_id, type, title, status, opened_at, created_at, updated_at)
        VALUES ('source-measure', 'source-case', 'bem', 'Maßnahme', 'open', '2026-11-11', '2026-11-11', '2026-11-11');
      INSERT INTO case_notes (id, case_id, title, note_date, note_type, content, created_at, updated_at)
        VALUES ('source-note', 'source-case', 'Notiz', '2026-11-11', 'sonstiges', 'Rückruf', '2026-11-11', '2026-11-11');
      INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, content, created_at, updated_at)
        VALUES ('source-measure-note', 'source-case', 'bem', 'source-measure', 'Maßnahmennotiz', '2026-11-11', 'Schritt', '2026-11-11', '2026-11-11');
      INSERT INTO deadlines (id, case_id, measure_id, process_type, title, due_at, status, created_at, updated_at)
        VALUES ('source-deadline', 'source-case', 'source-measure', 'case', 'Rückmeldung', '2099-11-20', 'open', '2026-11-11', '2026-11-11');
    `);
    return collectVacationV5CaseSections(source.adapter, { caseIds: ['source-case'] }).sections;
  } finally { source.raw.close(); }
}

function prepareImport(raw: DatabaseSync) {
  raw.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, valid_until, format_version)
    VALUES ('import-local', 'handover_case_test', '2026-11-11', '2099-11-30', 5)`).run();
}

describe('Format-5-Fallimport', () => {
  it('erzeugt lokale Kopien mit umgebogenen Beziehungen, Baselines und Datenschutzprüfung', () => {
    const destination = database();
    try {
      prepareImport(destination.raw);
      destination.raw.prepare(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('existing-case', 'SBV-1', 'Bestehend', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`).run();
      const result = importVacationV5CaseSections(destination.adapter, 'import-local', 'handover_case_test', '2099-11-30', sourceSections());
      expect(result.importedCount).toBe(6);
      const importedCase = destination.raw.prepare("SELECT id, case_number, protected_person_id, handover_import_id, privacy_review_required FROM cases WHERE id != 'existing-case'").get() as {
        id: string; case_number: string; protected_person_id: string; handover_import_id: string; privacy_review_required: number;
      };
      expect(importedCase).toMatchObject({ case_number: 'SBV-1-IMPORT', handover_import_id: 'import-local', privacy_review_required: 1 });
      expect(importedCase.id).not.toBe('source-case');
      expect(importedCase.protected_person_id).not.toBe('source-person');
      expect(destination.raw.prepare('SELECT case_id FROM case_measures').get()).toEqual({ case_id: importedCase.id });
      expect(destination.raw.prepare('SELECT case_id FROM case_notes').get()).toEqual({ case_id: importedCase.id });
      expect(destination.raw.prepare('SELECT case_id FROM case_measure_notes').get()).toEqual({ case_id: importedCase.id });
      expect(destination.raw.prepare('SELECT case_id FROM deadlines').get()).toEqual({ case_id: importedCase.id });
      expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_import_items WHERE baseline_sha256 IS NOT NULL').get()).toEqual({ count: 6 });
      expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM privacy_review_items WHERE case_id = ?').get(importedCase.id)).toEqual({ count: 1 });
    } finally { destination.raw.close(); }
  });

  it('rollt bei einem späten Schreibfehler alle Fallkopien und Ledgerzeilen zurück', () => {
    const destination = database();
    try {
      prepareImport(destination.raw);
      destination.raw.exec(`CREATE TRIGGER fail_case_ledger BEFORE INSERT ON case_handover_import_items
        WHEN NEW.local_entity_type = 'case_note' BEGIN SELECT RAISE(ABORT, 'ledger failed'); END`);
      expect(() => importVacationV5CaseSections(destination.adapter, 'import-local', 'handover_case_test', '2099-11-30', sourceSections()))
        .toThrow(/ledger failed/);
      expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM cases').get()).toEqual({ count: 0 });
      expect(destination.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_import_items').get()).toEqual({ count: 0 });
    } finally { destination.raw.close(); }
  });
});
