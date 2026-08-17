import { afterEach, describe, expect, it } from 'vitest';
import { closeSync, mkdtempSync, openSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MAX_PERSON_IMPORT_FILE_BYTES, normalizeProtectionStatus, parseDelimitedText, splitFullName } from '../../../services/personImportParsing';
import { PersonImportService } from '../../../services/personImportService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { resolvePersonImportMatch } from '../../../services/personMatchingService';
import type { ProtectedPersonRecord } from '../../../src/domain/models/protected-person.model';

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

import { detectCsvEncoding } from '../../../services/csvEncodingDetection';

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


const importTempRoots: string[] = [];
afterEach(() => { while (importTempRoots.length) rmSync(importTempRoots.pop()!, { recursive: true, force: true }); });

const unusedDb = {} as DatabaseAdapter;

describe('Personenimport – feindliche Eingaben', () => {
  it('weist übergroße Importdateien vor dem Einlesen zurück', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-person-import-limit-'));
    importTempRoots.push(root);
    const filePath = path.join(root, 'too-large.csv');
    closeSync(openSync(filePath, 'w'));
    truncateSync(filePath, MAX_PERSON_IMPORT_FILE_BYTES + 1);
    const service = new PersonImportService(unusedDb);

    await expect(service.preview({
      fileType: 'csv',
      filePath,
      sourceFileName: 'too-large.csv',
      mapping: { firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
    })).rejects.toThrow(/zu groß|maximal 25 MB/i);
  });

  it('begrenzt auch direkt eingefügten CSV-Text nach tatsächlicher UTF-8-Bytegröße', async () => {
    const service = new PersonImportService(unusedDb);
    const mapping = { firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' } as const;
    const tooLarge = `${'A'.repeat(MAX_PERSON_IMPORT_FILE_BYTES)}Ä`;

    await expect(service.preview({ fileType: 'csv', csvText: tooLarge, sourceFileName: 'too-large-text.csv', mapping }))
      .rejects.toThrow(/zu groß|maximal 25 MB/i);
  });

  it('weist beschädigte XLSX-Container kontrolliert zurück, bevor Fachdaten verarbeitet werden', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-person-import-xlsx-'));
    importTempRoots.push(root);
    const filePath = path.join(root, 'manipuliert.xlsx');
    writeFileSync(filePath, Buffer.from('PK\u0003\u0004kein gueltiges ZIP'));
    const service = new PersonImportService(unusedDb);

    await expect(service.preview({
      fileType: 'xlsx',
      filePath,
      sourceFileName: 'manipuliert.xlsx',
      mapping: { firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
    })).rejects.toThrow();
  });

  it('weist CSV-Importe mit unvertretbar vielen Zeilen vor der fachlichen Verarbeitung zurück', async () => {
    const service = new PersonImportService(unusedDb);
    const lines = ['Vorname;Nachname;Status'];
    for (let index = 0; index < 20_001; index += 1) lines.push(`Max${index};Muster;gleichgestellt`);

    await expect(service.preview({
      fileType: 'csv',
      csvText: lines.join('\n'),
      sourceFileName: 'rows.csv',
      mapping: { firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
    })).rejects.toThrow(/mehr als 20000 Zeilen/i);
  });
});
