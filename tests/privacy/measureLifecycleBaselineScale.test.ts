import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeasureLifecycleAuditService } from '../../services/measureLifecycleAuditService.js';
import { PersonalDataAuditLogService } from '../../services/auditLogService.js';
import type { DatabaseAdapter } from '../../services/databaseService.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (file: string) => DatabaseAdapter;

describe('Lifecycle-Baseline bei vorhandenen Maßnahmen', () => {
  it('ergänzt ausschließlich noch fehlende Audit-Baselines und bleibt bei erneutem Start unverändert', () => {
    const db = new Database(':memory:');
    try {
      db.exec(readFileSync(path.join(process.cwd(), 'database/schema.sql'), 'utf8'));
      db.prepare('INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('case-1', 'TEST-1', 'Testfall', 'sonstiges', '2026-01-01', '2026-01-01', '2026-01-01');
      const insert = db.prepare('INSERT INTO case_measures (id, case_id, type, title, status, opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      insert.run('existing', 'case-1', 'other', 'Vorhanden', 'open', '2026-01-01', '2026-01-01', '2026-01-01');
      insert.run('missing', 'case-1', 'other', 'Fehlend', 'open', '2026-01-01', '2026-01-01', '2026-01-01');
      new PersonalDataAuditLogService(db).append({ action: 'create', subjectType: 'measure_lifecycle', subjectId: 'existing', caseId: 'case-1', purpose: 'Maßnahmen-Lifecycle' });

      const lifecycle = new MeasureLifecycleAuditService(db);
      const options = { table: 'case_measures', measureType: 'other' as const, statusColumn: 'status', caseColumn: 'case_id' };
      expect(lifecycle.ensureBaselineForTable(options)).toBe(1);
      expect(lifecycle.ensureBaselineForTable(options)).toBe(0);
      const rows = db.prepare<{ subject_id: string }>('SELECT subject_id FROM personal_data_audit_log WHERE subject_type = ? ORDER BY sequence')
        .all('measure_lifecycle');
      expect(rows.map((row) => row.subject_id)).toEqual(['existing', 'missing']);
    } finally {
      db.close();
    }
  });
});
