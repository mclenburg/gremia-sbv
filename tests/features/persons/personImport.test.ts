import { afterEach, describe, expect, it } from 'vitest';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildPersonInput, planPersonImportUpdate } from '../../../services/personImportService';
import { MAX_PERSON_IMPORT_FILE_BYTES, normalizeProtectionStatus, parseDelimitedText, splitFullName } from '../../../services/personImportParsing';
import { PersonImportService } from '../../../services/personImportService';
import { repairPersonImportRunItemMatchStrategySchema } from '../../../services/personImportRunItemSchemaRepair';
import { ProtectedPersonService } from '../../../services/protectedPersonService';
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

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly database: DatabaseSync) {}

  prepare<T = unknown>(sql: string) {
    const statement = this.database.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }

  exec(sql: string): void { this.database.exec(sql); }
  pragma(sql: string): unknown { return this.database.exec(`PRAGMA ${sql}`); }
  close(): void { this.database.close(); }
}

function openPersonImportDatabase(): { raw: DatabaseSync; database: DatabaseAdapter } {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync('database/schema.sql', 'utf8'));
  return { raw, database: new SqliteAdapter(raw) };
}

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

  it('matched sicher über Personalnummer oder E-Mail und behandelt eindeutige Namensmatches nicht als Massenkonflikt', () => {
    const lookup = {
      findByPersonnelNumber: (value: string) => value === 'P-1' ? existing : undefined,
      findByWorkEmail: (value: string) => value === 'max@example.invalid' ? existing : undefined,
      findNameConflict: (firstName: string, lastName: string) => firstName === 'Max' && lastName === 'Mustermann' ? existing : undefined,
      findNameMatches: (firstName: string, lastName: string) => firstName === 'Max' && lastName === 'Mustermann' ? [existing] : []
    };

    expect(resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', personnelNumber: 'P-1', protectionStatus: 'equivalent' }, lookup).matchStrategy).toBe('personnel_number');
    expect(resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', workEmail: 'max@example.invalid', protectionStatus: 'equivalent' }, lookup).matchStrategy).toBe('work_email');
    const match = resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'equivalent' }, lookup);
    expect(match.matchStrategy).toBe('name_exact_unique');
    expect(match.existing?.id).toBe('p1');
    expect(match.conflict).toBeUndefined();
  });

  it('legt nur echte Namensmehrdeutigkeiten oder widersprechende stabile Kennzeichen als Konflikt vor', () => {
    const second: ProtectedPersonRecord = { ...existing, id: 'p2', personnelNumber: undefined, workEmail: undefined };
    const lookup = {
      findByPersonnelNumber: () => undefined,
      findByWorkEmail: () => undefined,
      findNameConflict: () => existing,
      findNameMatches: () => [existing, second]
    };

    const duplicate = resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'equivalent' }, lookup);
    expect(duplicate.matchStrategy).toBe('name_only_conflict');
    expect(duplicate.conflictReason).toMatch(/mehrere/i);

    const contradictory = resolvePersonImportMatch({ firstName: 'Max', lastName: 'Mustermann', personnelNumber: 'P-NEU', protectionStatus: 'equivalent' }, {
      ...lookup,
      findNameMatches: () => [existing]
    });
    expect(contradictory.matchStrategy).toBe('name_only_conflict');
    expect(contradictory.conflictReason).toMatch(/Personalnummer/i);
  });

  it('ermittelt Schutzstatus wahlweise aus einer Statusspalte oder aus Nachweis-Datumsspalten', () => {
    const statusColumn = buildPersonInput(
      { Name: 'Muster, Max', Status: 'gleichgestellt', Abteilung: 'Vertrieb' },
      { fullName: 'Name', fullNameMode: 'last_comma_first', protectionStatus: 'Status', organizationalUnit: 'Abteilung' }
    );
    expect(statusColumn.input).toMatchObject({
      firstName: 'Max',
      lastName: 'Muster',
      protectionStatus: 'equivalent',
      organizationalUnit: 'Vertrieb'
    });
    expect(statusColumn.validationErrors).toEqual([]);

    const evidenceColumns = buildPersonInput(
      { Name: 'Beispiel, Erika', 'schwerbehindert seit': '01.02.2020', 'Gleichstellung vorgelegt': '12.03.2021', Abteilung: 'Produktion' },
      {
        fullName: 'Name',
        fullNameMode: 'last_comma_first',
        severelyDisabledSince: 'schwerbehindert seit',
        equivalentPresentedAt: 'Gleichstellung vorgelegt',
        organizationalUnit: 'Abteilung'
      }
    );
    expect(evidenceColumns.input).toMatchObject({
      firstName: 'Erika',
      lastName: 'Beispiel',
      protectionStatus: 'severely_disabled',
      statusValidFrom: '2020-02-01',
      evidenceCheckedAt: '2020-02-01',
      organizationalUnit: 'Produktion'
    });
    expect(evidenceColumns.statusReason).toMatch(/schwerbehindert seit/i);
    expect(evidenceColumns.validationErrors).toEqual([]);
  });

  it('bewahrt genauere Bestandsangaben und ergänzt nur sichere Importwerte', () => {
    const update = planPersonImportUpdate(existing, {
      firstName: 'Max',
      lastName: 'Mustermann',
      organizationalUnit: 'Vertrieb',
      protectionStatus: 'unclear',
      statusSource: 'employer_list'
    });

    expect(update.changed).toEqual(['organizationalUnit']);
    expect(update.update).toEqual({ organizationalUnit: 'Vertrieb' });
  });

  it('protokolliert eindeutige Namensmatches im echten Schema ohne Konflikt', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const people = new ProtectedPersonService(database);
      const person = people.create({
        firstName: 'Max',
        lastName: 'Muster',
        protectionStatus: 'equivalent',
        statusSource: 'manual'
      });

      const result = await new PersonImportService(database).execute({
        fileType: 'csv',
        sourceFileName: 'arbeitgeberliste.csv',
        csvText: 'Name;Status;Abteilung\nMuster, Max;schwerbehindert;IT',
        mapping: {
          fullName: 'Name',
          fullNameMode: 'last_comma_first',
          protectionStatus: 'Status',
          organizationalUnit: 'Abteilung',
        },
      });

      expect(result.run).toMatchObject({ createdCount: 0, updatedCount: 1, conflictCount: 0 });
      expect(people.get(person.id)).toMatchObject({ protectionStatus: 'severely_disabled', organizationalUnit: 'IT' });
      expect(raw.prepare('SELECT action, match_strategy FROM person_import_run_items').get()).toMatchObject({
        action: 'updated',
        match_strategy: 'name_exact_unique',
      });
    } finally {
      raw.close();
    }
  });

  it('repariert alte Importprotokoll-Constraints für eindeutige Namensmatches ohne Datenverlust', () => {
    const raw = new DatabaseSync(':memory:');
    const database = new SqliteAdapter(raw);
    try {
      raw.exec(`
        CREATE TABLE person_import_runs (id TEXT PRIMARY KEY);
        CREATE TABLE protected_persons (id TEXT PRIMARY KEY);
        CREATE TABLE person_import_run_items (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES person_import_runs(id) ON DELETE CASCADE,
          row_number INTEGER NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'unchanged', 'conflict', 'skipped', 'not_in_list')),
          protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
          match_strategy TEXT CHECK (match_strategy IN ('personnel_number', 'work_email', 'name_only_conflict', 'none')),
          conflict_reason TEXT,
          validation_message TEXT,
          changed_fields_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL
        );
        INSERT INTO person_import_runs (id) VALUES ('run-1');
        INSERT INTO person_import_run_items (id, run_id, row_number, action, match_strategy, changed_fields_json, created_at)
        VALUES ('item-1', 'run-1', 1, 'unchanged', 'none', '[]', '2026-08-26T10:00:00.000Z');
      `);

      expect(repairPersonImportRunItemMatchStrategySchema(database)).toBe(true);
      raw.prepare(`
        INSERT INTO person_import_run_items (id, run_id, row_number, action, match_strategy, changed_fields_json, created_at)
        VALUES ('item-2', 'run-1', 2, 'updated', 'name_exact_unique', '["organizationalUnit"]', '2026-08-26T10:01:00.000Z')
      `).run();
      expect(raw.prepare('SELECT COUNT(*) AS count FROM person_import_run_items').get()).toMatchObject({ count: 2 });
      expect(repairPersonImportRunItemMatchStrategySchema(database)).toBe(false);
    } finally {
      raw.close();
    }
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
