import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { ensureCaseHandoverRuntimeSchema } from '../../../services/runtimeSchemaCompatibility';
import { ensureCaseHandoverExportLedgerSchema } from '../../../services/caseHandoverExportLedger';

describe('Format-5-Ledger-Migration 0071', () => {
  it('ergänzt Paketbindung und Import-Baseline in bestehendem 0070-Bestand verlustfrei und wiederholbar', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      for (const [table, columns] of [
        ['case_handover_exports', ['target_key_fingerprint', 'format_version']],
        ['case_handover_imports', ['origin_key_fingerprint', 'target_key_fingerprint', 'format_version', 'source_package_id']],
        ['case_handover_import_items', ['baseline_sha256']],
      ] as const) for (const column of columns) db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
      db.prepare(`INSERT INTO case_handover_exports (id, package_id, exported_at, metadata_json) VALUES ('old-export', 'handover_old_export', '2026-11-01', '{}')`).run();
      db.prepare(`INSERT INTO case_handover_imports (id, package_id, imported_at, metadata_json) VALUES ('old-import', 'handover_old_import', '2026-11-01', '{}')`).run();
      db.prepare(`INSERT INTO case_handover_import_items (id, handover_import_id, local_entity_type, local_entity_id, package_ref, created_at)
        VALUES ('old-item', 'old-import', 'deadline', 'local-deadline', 'deadline_1', '2026-11-01')`).run();
      const migration = new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations'));
      expect(migration.migrate().currentSchemaVersion).toBe('0071');
      expect(migration.migrate().currentSchemaVersion).toBe('0071');
      expect(db.prepare('SELECT package_id, target_key_fingerprint, format_version FROM case_handover_exports WHERE id = ?').get('old-export'))
        .toEqual({ package_id: 'handover_old_export', target_key_fingerprint: null, format_version: null });
      expect(db.prepare('SELECT local_entity_id, baseline_sha256 FROM case_handover_import_items WHERE id = ?').get('old-item'))
        .toEqual({ local_entity_id: 'local-deadline', baseline_sha256: null });
      db.exec('ALTER TABLE case_handover_import_items DROP COLUMN baseline_sha256');
      db.exec('ALTER TABLE case_handover_exports DROP COLUMN format_version');
      ensureCaseHandoverRuntimeSchema(db);
      ensureCaseHandoverExportLedgerSchema(db);
      expect(db.prepare('SELECT local_entity_id, baseline_sha256 FROM case_handover_import_items WHERE id = ?').get('old-item'))
        .toEqual({ local_entity_id: 'local-deadline', baseline_sha256: null });
      expect(db.prepare('SELECT package_id, format_version FROM case_handover_exports WHERE id = ?').get('old-export'))
        .toEqual({ package_id: 'handover_old_export', format_version: null });
    } finally { db.close(); }
  });
});
