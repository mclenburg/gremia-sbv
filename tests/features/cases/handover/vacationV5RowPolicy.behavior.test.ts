import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { assertVacationV5Row, projectVacationV5Row, VACATION_V5_ROW_FIELDS } from '../../../../services/vacationV5RowPolicy';

describe('Format-5-Feldfreigaben', () => {
  it('überträgt nur fachliche Felder und lehnt lokale IDs, Schlüssel und unbekannte Felder beim Empfang ab', () => {
    const source = { id: 'local-id', meeting_id: 'local-parent', title: 'TOP', own_position: 'SBV-Position',
      storage_path: '/private', document_key: 'secret', position: 1, status: 'open', created_at: '2026-11-11', updated_at: '2026-11-11' };
    const data = projectVacationV5Row('meeting_agenda', source);
    expect(data).toMatchObject({ title: 'TOP', own_position: 'SBV-Position', position: 1 });
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('meeting_id');
    expect(data).not.toHaveProperty('storage_path');
    expect(data).not.toHaveProperty('document_key');
    expect(assertVacationV5Row('meeting_agenda', data)).toEqual(data);
    expect(() => assertVacationV5Row('meeting_agenda', { ...data, local_id: 'forbidden' })).toThrow(/Unerwartete/);
  });

  it('entscheidet bei neuen Datenbankspalten bewusst über die Feldfreigabe', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      for (const [kind, configuration] of Object.entries(VACATION_V5_ROW_FIELDS)) {
        const columns = db.prepare(`PRAGMA table_info(${configuration.table})`).all().map((column) => String(column.name));
        expect([...configuration.fields, ...configuration.references].sort(), kind).toEqual(columns.sort());
      }
    } finally { db.close(); }
  });

  it('begrenzt einzelne Freitextzeilen und verwirft verschachtelte Fremddaten', () => {
    const valid = { meeting_type: 'other', title: 'Besprechung', starts_at: '2026-11-11T10:00:00.000Z', status: 'draft' };
    expect(() => assertVacationV5Row('meeting', { ...valid, title: 'A'.repeat(70_000) })).toThrow(/zu groß/);
    expect(() => assertVacationV5Row('meeting', { ...valid, title: { nested: 'payload' } })).toThrow(/Datentyp/);
  });
});
