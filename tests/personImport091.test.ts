import { describe, expect, it } from 'vitest';
import { normalizeProtectionStatus, parseDelimitedText, splitFullName } from '../services/personImportParsing';
import { readNormalizedSourceText } from './helpers/sourceText';

describe('0.9.1 Personenimport', () => {
  it('unterstützt CRLF/LF, optionale Personalnummer und Namen in einer Spalte', () => {
    const csv = 'Name;Status;Gültig bis\r\nMustermann, Max;gleichgestellt;15.06.2026\r\nBeispiel Erika;schwerbehindert;31.12.2026\n';
    const rows = parseDelimitedText(csv, ';');

    expect(rows).toHaveLength(3);
    expect(splitFullName(rows[1][0], 'last_comma_first')).toEqual({ firstName: 'Max', lastName: 'Mustermann' });
    expect(splitFullName(rows[2][0], 'first_last')).toEqual({ firstName: 'Beispiel', lastName: 'Erika' });
    expect(normalizeProtectionStatus(rows[1][1])).toBe('equivalent');
    expect(normalizeProtectionStatus(rows[2][1])).toBe('severely_disabled');
  });

  it('modelliert den Import ohne GdB-Pflicht und ohne Rohdatenspeicherung', () => {
    const model = readNormalizedSourceText('src/app/core/models/protected-person.model.ts');
    const migration = readNormalizedSourceText('database/migrations/0025_protected_persons.sql');

    expect(model).toContain('personnelNumber?: string');
    expect(model).toContain("fullNameMode?: 'first_last' | 'last_comma_first'");
    expect(model).not.toContain('gdb:');
    expect(migration).not.toMatch(/\bgdb\b/i);
    expect(migration).toContain('person_import_run_items');
    expect(migration).toContain('changed_fields_json');
  });
});
