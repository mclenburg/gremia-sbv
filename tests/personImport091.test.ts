import { describe, expect, it } from 'vitest';
import { normalizeProtectionStatus, parseDelimitedText, splitFullName } from '../services/personImportParsing';
import { resolvePersonImportMatch } from '../services/personMatchingService';
import type { ProtectedPersonRecord } from '../src/app/core/models/protected-person.model';

const existing: ProtectedPersonRecord = {
  id: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  firstName: 'Max',
  lastName: 'Mustermann',
  personnelNumber: 'P-1',
  workEmail: 'max@example.invalid',
  employmentState: 'active_employee',
  protectionStatus: 'equivalent',
  statusSource: 'employer_list',
  lifecycleState: 'active'
};

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

  it('matched sicher über Personalnummer oder E-Mail, aber Name/Vorname nur als Konflikt', () => {
    const lookup = {
      findByPersonnelNumber: (value: string) => value === 'P-1' ? existing : undefined,
      findByWorkEmail: (value: string) => value === 'max@example.invalid' ? existing : undefined,
      findNameConflict: (firstName: string, lastName: string) => firstName === 'Max' && lastName === 'Mustermann' ? existing : undefined
    };

    expect(resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', personnelNumber: 'P-1', protectionStatus: 'equivalent' }, lookup).matchStrategy).toBe('personnel_number');
    expect(resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', workEmail: 'max@example.invalid', protectionStatus: 'equivalent' }, lookup).matchStrategy).toBe('work_email');
    const conflict = resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'equivalent' }, lookup);
    expect(conflict.matchStrategy).toBe('name_only_conflict');
    expect(conflict.existing).toBeUndefined();
    expect(conflict.conflict?.id).toBe('p1');
  });
});

import { detectCsvEncoding } from '../services/csvEncodingDetection';

describe('0.9.1 CSV-Zeichenkodierung', () => {
  it('erkennt Windows-1252/ISO-Dateien mit Umlauten ohne UTF-8-Mojibake', () => {
    const buffer = Buffer.from([0x4e,0x61,0x6d,0x65,0x3b,0x53,0x74,0x61,0x74,0x75,0x73,0x0a,0x4d,0xfc,0x6c,0x6c,0x65,0x72,0x2c,0x20,0x4a,0xf6,0x72,0x67,0x3b,0x67,0x6c,0x65,0x69,0x63,0x68,0x67,0x65,0x73,0x74,0x65,0x6c,0x6c,0x74]);
    const detected = detectCsvEncoding(buffer);
    expect(['windows-1252', 'iso-8859-1']).toContain(detected.encoding);
    expect(detected.decodedText).toContain('Müller, Jörg');
    expect(detected.decodedText).not.toContain('M�ller');
  });

  it('erkennt CP850-Umlaute aus älteren CSV-Exporten', () => {
    const buffer = Buffer.from([0x4e,0x61,0x6d,0x65,0x3b,0x53,0x74,0x61,0x74,0x75,0x73,0x0a,0x4d,0x81,0x6c,0x6c,0x65,0x72,0x2c,0x20,0x4a,0x94,0x72,0x67,0x3b,0x67,0x6c,0x65,0x69,0x63,0x68,0x67,0x65,0x73,0x74,0x65,0x6c,0x6c,0x74]);
    const detected = detectCsvEncoding(buffer);
    expect(detected.encoding).toBe('cp850');
    expect(detected.decodedText).toContain('Müller, Jörg');
  });
});
