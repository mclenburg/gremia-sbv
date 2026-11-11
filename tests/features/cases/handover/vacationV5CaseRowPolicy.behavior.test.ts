import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { VACATION_V5_CASE_ROW_FIELDS, assertVacationV5CaseRow, projectVacationV5CaseRow } from '../../../../services/vacationV5CaseRowPolicy';

describe('Format-5-Fallfeldklassifikation', () => {
  it('klassifiziert jede reale Tabellenspalte und trennt Fremdreferenzen sowie lokale Metadaten', () => {
    const database = new DatabaseSync(':memory:');
    try {
      database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      for (const [kind, policy] of Object.entries(VACATION_V5_CASE_ROW_FIELDS)) {
        const actual = database.prepare(`PRAGMA table_info(${policy.table})`).all().map((row) => String(row.name)).sort();
        const classified = [...policy.fields, ...policy.references, ...policy.localOnly].sort();
        expect(classified, kind).toEqual(actual);
        expect(new Set(classified).size, kind).toBe(actual.length);
      }
    } finally { database.close(); }
  });

  it('entfernt lokale IDs, Dateischlüssel, Pfade und Datenschutzstatus vor dem Paket', () => {
    expect(projectVacationV5CaseRow('case_document', {
      id: 'local-doc', case_id: 'local-case', measure_id: 'local-measure', filename: 'Attest.pdf',
      sha256: 'a'.repeat(64), storage_path: '/private/attest', document_key: 'secret', iv: 'secret', auth_tag: 'secret',
      size_bytes: 42, created_at: '2026-11-11',
    })).toEqual({ filename: 'Attest.pdf', sha256: 'a'.repeat(64), size_bytes: 42, created_at: '2026-11-11' });
    expect(projectVacationV5CaseRow('case', {
      id: 'local-case', case_number: 'SBV-17', display_name: 'Anfrage', category: 'sonstiges', status: 'offen',
      opened_at: '2026-11-11', protected_person_id: 'local-person', person_id: 'directory-person',
      handover_import_id: 'old-import', privacy_review_required: 1,
    })).toEqual({ case_number: 'SBV-17', display_name: 'Anfrage', category: 'sonstiges', status: 'offen', opened_at: '2026-11-11' });
    expect(() => assertVacationV5CaseRow('case_document', { filename: 'Attest.pdf', sha256: 'a'.repeat(64), storage_path: '/private/attest' })).toThrow();
  });
});
