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
import { buildDefaultMapping } from '../../../src/app/features/persons/personImportUi';
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
      { Name: 'Beispiel, Erika', 'schwerbehindert seit': '01.02.2020', 'Gleichstellung vorgelegt': '', Abteilung: 'Produktion' },
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

  it('wertet Nein in der Schwerbehinderten-Spalte nicht als Nachweis einer Schwerbehinderung', () => {
    const mapped = buildPersonInput(
      { Name: 'Beispiel, Erika', 'Schwerbehindert seit': 'Nein', 'Gleichstellung vorgelegt': '12.03.2021' },
      { fullName: 'Name', fullNameMode: 'last_comma_first', severelyDisabledSince: 'Schwerbehindert seit', equivalentPresentedAt: 'Gleichstellung vorgelegt' },
    );
    expect(mapped.input.protectionStatus).toBe('equivalent');
    expect(mapped.input.statusValidFrom).toBe('2021-03-12');
    expect(mapped.input.evidenceCheckedAt).toBe('2021-03-12');
  });

  it.each([
    ['Gleichstellung beantragt', 'application_pending'],
    ['Gleichstellung abgelaufen', 'expired'],
    ['Gleichstellung nicht mehr gültig', 'expired'],
    ['nicht schwerbehindert', 'unclear'],
    ['nicht gleichgestellt', 'unclear'],
    ['schwerbehindert / gleichgestellt', 'unclear'],
    ['gleichgestellt', 'equivalent'],
    ['schwerbehindert', 'severely_disabled'],
  ] as const)('ordnet den Statuswert %s fachlich als %s ein', (value, expected) => {
    expect(normalizeProtectionStatus(value)).toBe(expected);
  });

  it('stoppt widersprüchliche Nachweise oder einen widersprechenden Statuswert vor dem Speichern', () => {
    const mapping = { fullName: 'Name', severelyDisabledSince: 'schwerbehindert seit', equivalentPresentedAt: 'gleichgestellt ab', protectionStatus: 'Status' };
    const both = buildPersonInput({ Name: 'Beispiel, Erika', 'schwerbehindert seit': '01.02.2020', 'gleichgestellt ab': '12.03.2021' }, mapping);
    expect(both.validationErrors).toEqual(expect.arrayContaining([expect.stringMatching(/widersprüch/i)]));
    const contrary = buildPersonInput({ Name: 'Beispiel, Erika', 'schwerbehindert seit': '01.02.2020', Status: 'gleichgestellt' }, mapping);
    expect(contrary.validationErrors).toEqual(expect.arrayContaining([expect.stringMatching(/widersprüch/i)]));
  });

  it('akzeptiert kein ungültiges Nachweis- oder Gültigkeitsdatum als Schutzstatus', () => {
    const mapped = buildPersonInput({ Name: 'Beispiel, Erika', 'schwerbehindert seit': '31.02.2020', 'gültig bis': '31.02.2027' }, {
      fullName: 'Name', severelyDisabledSince: 'schwerbehindert seit', statusValidUntil: 'gültig bis',
    });
    expect(mapped.input.protectionStatus).toBe('unclear');
    expect(mapped.validationErrors).toEqual(expect.arrayContaining([expect.stringMatching(/ungültig/i)]));
    expect(mapped.input.statusValidUntil).toBeUndefined();
  });

  it('weist ein Gültigkeitsende vor dem Statusbeginn zurück', () => {
    const mapped = buildPersonInput({ Vorname: 'Erika', Nachname: 'Beispiel', Status: 'gleichgestellt', 'Gültig ab': '01.06.2026', 'Gültig bis': '31.05.2026' }, {
      firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status', statusValidFrom: 'Gültig ab', statusValidUntil: 'Gültig bis',
    });
    expect(mapped.validationErrors).toEqual(expect.arrayContaining([expect.stringMatching(/vor dem Statusbeginn/i)]));
  });

  it('importiert gemischte CSV-Zeilen mit genau einem jeweils gefüllten Statusfeld getrennt', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const csvText = 'Personalnummer;Vorname;Nachname;schwerbehindert seit;gleichgestellt ab\nP-1;Max;Muster;01.02.2020;\nP-2;Erika;Beispiel;;12.03.2021';
      const result = await new PersonImportService(database).execute({ fileType: 'csv', sourceFileName: 'liste.csv', csvText, mapping: buildDefaultMapping(parseDelimitedText(csvText)[0]) });
      expect(result.run.createdCount).toBe(2);
      const people = new ProtectedPersonService(database).list();
      expect(people.find((person) => person.personnelNumber === 'P-1')).toMatchObject({ protectionStatus: 'severely_disabled', statusValidFrom: '2020-02-01' });
      expect(people.find((person) => person.personnelNumber === 'P-2')).toMatchObject({ protectionStatus: 'equivalent', statusValidFrom: '2021-03-12' });
    } finally { raw.close(); }
  });

  it('ersetzt beim Wechsel zur Schwerbehinderung die Gleichstellungsdaten und entfernt deren alte Befristung', () => {
    const update = planPersonImportUpdate({ ...existing, statusValidFrom: '2020-01-01', evidenceCheckedAt: '2020-01-01', statusValidUntil: '2026-12-31' }, {
      firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'severely_disabled', statusValidFrom: '2022-03-12', evidenceCheckedAt: '2022-03-12', statusSource: 'employer_list',
    });
    expect(update.update).toMatchObject({ protectionStatus: 'severely_disabled', statusValidFrom: '2022-03-12', evidenceCheckedAt: '2022-03-12' });
    expect(update.changed).toContain('statusValidUntil');
    expect(update.update.statusValidUntil).toBeUndefined();
  });

  it('übernimmt ein korrigiertes Nachweisdatum aus derselben Arbeitgeberquelle bei unverändertem Status', () => {
    const update = planPersonImportUpdate({ ...existing, statusValidFrom: '2020-01-01', evidenceCheckedAt: '2020-01-01' }, {
      firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'equivalent', statusValidFrom: '2021-03-12', evidenceCheckedAt: '2021-03-12', statusSource: 'employer_list',
    });
    expect(update.update).toMatchObject({ statusValidFrom: '2021-03-12', evidenceCheckedAt: '2021-03-12' });
  });

  it('korrigiert einen zuvor falsch als schwerbehindert importierten Status bei eindeutigem Gleichstellungsnachweis', () => {
    const update = planPersonImportUpdate({ ...existing, protectionStatus: 'severely_disabled', statusValidFrom: '2020-01-01', evidenceCheckedAt: '2020-01-01' }, {
      firstName: 'Max', lastName: 'Mustermann', protectionStatus: 'equivalent', statusValidFrom: '2021-03-12', evidenceCheckedAt: '2021-03-12', statusSource: 'employer_list',
    });
    expect(update.update).toMatchObject({ protectionStatus: 'equivalent', statusValidFrom: '2021-03-12', evidenceCheckedAt: '2021-03-12' });
  });

  it('übernimmt bei leerer Schwerbehindert-Spalte und Gleichgestellt-ab-Datum den Gleichstellungsstatus', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const people = new ProtectedPersonService(database);
      const person = people.create({ firstName: 'Erika', lastName: 'Beispiel', personnelNumber: 'P-2', protectionStatus: 'severely_disabled', statusSource: 'employer_list' });
      const csvText = 'Personalnummer;Vorname;Nachname;schwerbehindert seit;gleichgestellt ab\nP-2;Erika;Beispiel;;12.03.2021';
      const mapping = buildDefaultMapping(parseDelimitedText(csvText)[0]);
      const result = await new PersonImportService(database).execute({ fileType: 'csv', sourceFileName: 'liste.csv', csvText, mapping });
      expect(result.run.updatedCount).toBe(1);
      expect(people.get(person.id)).toMatchObject({ protectionStatus: 'equivalent', statusValidFrom: '2021-03-12' });
    } finally { raw.close(); }
  });

  it('legt widersprechende manuell bestätigte Schwerbehinderung zur Prüfung vor', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const people = new ProtectedPersonService(database);
      const person = people.create({ firstName: 'Erika', lastName: 'Beispiel', personnelNumber: 'P-2', protectionStatus: 'severely_disabled', statusSource: 'manual' });
      const csvText = 'Personalnummer;Vorname;Nachname;schwerbehindert seit;gleichgestellt ab\nP-2;Erika;Beispiel;;12.03.2021';
      const result = await new PersonImportService(database).execute({ fileType: 'csv', sourceFileName: 'liste.csv', csvText, mapping: buildDefaultMapping(parseDelimitedText(csvText)[0]) });
      expect(result.run.conflictCount).toBe(1);
      expect(result.run.items).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'conflict', protectedPersonId: person.id })]));
      expect(people.get(person.id)?.protectionStatus).toBe('severely_disabled');
    } finally { raw.close(); }
  });

  it('vermerkt fehlende Personen einer ausdrücklich vollständigen Arbeitgeberliste zur manuellen Prüfung', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const people = new ProtectedPersonService(database);
      const present = people.create({ firstName: 'Max', lastName: 'Muster', personnelNumber: 'P-1', protectionStatus: 'equivalent', statusSource: 'employer_list' });
      const missing = people.create({ firstName: 'Erika', lastName: 'Beispiel', personnelNumber: 'P-2', protectionStatus: 'equivalent', statusSource: 'employer_list' });
      const manual = people.create({ firstName: 'Manu', lastName: 'Eintrag', protectionStatus: 'equivalent', statusSource: 'manual' });
      const result = await new PersonImportService(database).execute({
        fileType: 'csv', sourceFileName: 'liste.csv', csvText: 'Personalnummer;Vorname;Nachname;Status\nP-1;Max;Muster;gleichgestellt',
        mapping: { personnelNumber: 'Personalnummer', firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
        reconcileMissingPersons: true,
      });
      expect(result.run.missingCount).toBe(1);
      expect(result.run.items).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'not_in_list', protectedPersonId: missing.id })]));
      expect(result.run.items?.some((item) => item.protectedPersonId === present.id && item.action === 'not_in_list')).toBe(false);
      expect(result.run.items?.some((item) => item.protectedPersonId === manual.id)).toBe(false);
      expect(people.get(missing.id)?.lifecycleState).toBe('active');
      expect(raw.prepare("SELECT COUNT(*) AS count FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.missing_from_employer_list'").get(missing.id)).toMatchObject({ count: 1 });
      await new PersonImportService(database).execute({
        fileType: 'csv', sourceFileName: 'liste-neu.csv', csvText: 'Personalnummer;Vorname;Nachname;Status\nP-1;Max;Muster;gleichgestellt\nP-2;Erika;Beispiel;gleichgestellt',
        mapping: { personnelNumber: 'Personalnummer', firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
        reconcileMissingPersons: true,
      });
      expect(raw.prepare("SELECT status FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.missing_from_employer_list'").get(missing.id)).toMatchObject({ status: 'cancelled' });
    } finally { raw.close(); }
  });

  it('leitet aus einem Teilimport keine fehlenden Personen ab', async () => {
    const { raw, database } = openPersonImportDatabase();
    try {
      const people = new ProtectedPersonService(database);
      const missing = people.create({ firstName: 'Erika', lastName: 'Beispiel', personnelNumber: 'P-2', protectionStatus: 'equivalent', statusSource: 'employer_list' });
      const result = await new PersonImportService(database).execute({
        fileType: 'csv', sourceFileName: 'abteilung.csv', csvText: 'Personalnummer;Vorname;Nachname;Status\nP-1;Max;Muster;gleichgestellt',
        mapping: { personnelNumber: 'Personalnummer', firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status' },
      });
      expect(result.run.missingCount).toBe(0);
      expect(raw.prepare("SELECT COUNT(*) AS count FROM deadlines WHERE process_id = ? AND source_event = 'protected_person.missing_from_employer_list'").get(missing.id)).toMatchObject({ count: 0 });
    } finally { raw.close(); }
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

  it('ändert den Beschäftigungsstatus nicht, wenn die CSV keine Beschäftigungsspalte enthält', () => {
    const mapped = buildPersonInput({ Vorname: 'Max', Nachname: 'Mustermann', Status: 'gleichgestellt' }, {
      firstName: 'Vorname', lastName: 'Nachname', protectionStatus: 'Status',
    });
    const update = planPersonImportUpdate({ ...existing, employmentState: 'left_company', leftCompanyAt: '2025-01-01' }, mapped.input);
    expect(update.changed).not.toContain('employmentState');
    expect(update.changed).not.toContain('leftCompanyAt');
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
