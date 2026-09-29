import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

describe('Gremia.BR-Verfahrensverknüpfungen im Bestandsschema', () => {
  it('erhält bestehende externe Referenzen und erlaubt den neuen Verfahrensbezug', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys = ON; CREATE TABLE cases (id TEXT PRIMARY KEY); INSERT INTO cases VALUES (\'case-1\');');
      db.exec(readFileSync('database/migrations/0035_gremia_br_external_references.sql', 'utf8'));
      db.exec(`INSERT INTO case_external_references (id, case_id, source_type, source_id, title, fetched_at, created_at, updated_at)
        VALUES ('old-ref', 'case-1', 'beschluss', 'decision-1', 'Bestehender Beschluss', '2026-01-01', '2026-01-01', '2026-01-01')`);

      db.exec(readFileSync('database/migrations/0060_gremia_br_procedure_references.sql', 'utf8'));

      expect(db.prepare('SELECT id, title FROM case_external_references WHERE id = ?').get('old-ref'))
        .toEqual({ id: 'old-ref', title: 'Bestehender Beschluss' });
      db.exec(`INSERT INTO case_external_references (id, case_id, source_type, source_id, title, fetched_at, created_at, updated_at)
        VALUES ('procedure-ref', 'case-1', 'verfahren', 'procedure-1', 'BR-2026-17', '2026-09-29', '2026-09-29', '2026-09-29')`);
      expect(db.prepare('SELECT source_type FROM case_external_references WHERE id = ?').get('procedure-ref'))
        .toEqual({ source_type: 'verfahren' });
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      db.close();
    }
  });
});
