import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { MigrationService } from '../../../../services/migrationService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { storeImportedCaseDocument } from '../../../../services/caseHandoverImportedDocumentStore';
import { openTestDatabase } from '../../../helpers/openTestDatabase';

let sourceDb: DatabaseAdapter;
let substituteDb: DatabaseAdapter;
let tempRoot: string;

beforeEach(async () => {
  sourceDb = await migratedDatabase();
  substituteDb = await migratedDatabase();
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-sbv-handover-p1-'));
});

afterEach(() => {
  sourceDb.close();
  substituteDb.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

async function migratedDatabase(): Promise<DatabaseAdapter> {
  const database = await openTestDatabase();
  new MigrationService(database, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  return database;
}

function insertSourceCase(database: DatabaseAdapter, id: string, caseNumber = 'SBV-2026-URLAUB-1'): void {
  const now = '2026-09-05T08:00:00.000Z';
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, caseNumber, 'Urlaubsvertretung Testfall', 'sonstiges', 'offen', 'normal', now, 1, 0, now, now);
  database.prepare(`
    INSERT INTO case_notes (
      id, case_id, title, note_date, note_type, content, contains_health_data,
      confidential_level, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('source-note-1', id, 'Ausgangslage', now, 'sonstiges', 'Vor der Übergabe dokumentiert.', 1, 'sensibel', now, now);
}

function countNotes(database: DatabaseAdapter, caseId: string): number {
  return database.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes WHERE case_id = ?').get(caseId)?.count ?? -1;
}

function countDocuments(database: DatabaseAdapter, caseId: string): number {
  return database.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_documents WHERE case_id = ?').get(caseId)?.count ?? -1;
}

describe('Fallübergabe P1 – Rückgabe-Delta', () => {
  it('ordnet ein Rückgabe-Delta über das Ausgangspaket der ursprünglichen Fallakte zu', async () => {
    insertSourceCase(sourceDb, 'source-case-1');
    const source = new CaseHandoverService(sourceDb, () => path.join(tempRoot, 'source-data'));
    const substitute = new CaseHandoverService(substituteDb, () => path.join(tempRoot, 'substitute-data'));
    const substituteRecipient = new TransferInstanceIdentityService(substituteDb).getPublicIdentity();
    const sourceRecipient = new TransferInstanceIdentityService(sourceDb).getPublicIdentity();
    const passphrase = 'lange Transport-Passphrase P1';
    const handoverFile = path.join(tempRoot, 'urlaub.gsbvtransfer');
    const deltaFile = path.join(tempRoot, 'rueckgabe.gsbvtransfer');

    await source.exportToFile({
      caseIds: ['source-case-1'],
      expiresAt: '2026-09-30T21:59:59.000Z',
      purpose: 'Urlaubsvertretung',
      passphrase,
      targetRecipientToken: substituteRecipient.recipientToken,
    }, handoverFile);

    const sourceCockpit = source.listCockpit();
    expect(sourceCockpit.activeVacationCount).toBe(1);
    expect(sourceCockpit.outgoing[0]).toMatchObject({
      direction: 'outgoing',
      packageType: 'vacation_handover',
      caseCount: 1,
      caseIds: ['source-case-1'],
      canExportReturnDelta: false,
    });

    const imported = await substitute.importFromFile({
      filePath: handoverFile,
      passphrase,
      mode: 'create_new',
    });
    const substituteCaseId = imported.createdCaseIds[0];
    expect(countNotes(substituteDb, substituteCaseId)).toBe(1);
    const substituteCockpit = substitute.listCockpit();
    expect(substituteCockpit.returnableCount).toBe(1);
    expect(substituteCockpit.incoming[0]).toMatchObject({
      direction: 'incoming',
      packageType: 'vacation_handover',
      caseCount: 1,
      caseIds: [substituteCaseId],
      canExportReturnDelta: true,
    });

    substituteDb.prepare(`
      INSERT INTO case_notes (
        id, case_id, title, note_date, note_type, content, contains_health_data,
        confidential_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'substitute-note-new',
      substituteCaseId,
      'Rückgabe aus Vertretung',
      '2026-09-12T10:00:00.000Z',
      'sonstiges',
      'Während der Urlaubsvertretung ergänzt.',
      1,
      'sensibel',
      '2026-09-12T10:00:00.000Z',
      '2026-09-12T10:00:00.000Z',
    );
    storeImportedCaseDocument(substituteDb, {
      id: 'substitute-document-new',
      caseId: substituteCaseId,
      data: {
        filename: 'vertretung.pdf',
        display_title: 'Dokument aus der Vertretung',
        mime_type: 'application/pdf',
        created_at: '2026-09-12T10:00:00.000Z',
      },
      contentBase64: Buffer.from('%PDF-1.4\nVertretungsdokument').toString('base64'),
      timestamp: '2026-09-12T10:00:00.000Z',
      dataDirectory: path.join(tempRoot, 'substitute-data'),
      titlePrefix: '',
    });

    const delta = await substitute.exportReturnDeltaToFile({
      sourcePackageId: imported.packageId,
      caseIds: [substituteCaseId],
      passphrase,
      targetRecipientToken: sourceRecipient.recipientToken,
    }, deltaFile);

    expect(delta.caseCount).toBe(1);
    expect(delta.documentCount).toBe(1);
    expect(delta.packageType).toBe('return_delta');
    expect(substitute.listCockpit()).toMatchObject({ returnableCount: 0, incoming: [{ packageType: 'vacation_handover', status: 'returned', canExportReturnDelta: false }] });

    await source.importFromFile({
      filePath: deltaFile,
      passphrase,
      mode: 'merge_existing',
    });

    const sourceNotes = sourceDb.prepare<{ title: string; content: string }>(
      'SELECT title, content FROM case_notes WHERE case_id = ? ORDER BY created_at'
    ).all('source-case-1');
    expect(sourceNotes).toHaveLength(2);
    expect(sourceNotes[1].title).toContain('Rückgabe');
    expect(sourceNotes[1].content).toContain('Während der Urlaubsvertretung ergänzt.');
    expect(countDocuments(sourceDb, 'source-case-1')).toBe(1);
    expect(source.listCockpit().outgoing[0].status).toBe('returned');

    await expect(source.importFromFile({
      filePath: deltaFile,
      passphrase,
      mode: 'merge_existing',
    })).rejects.toThrow('bereits importiert');

    const auditMetadata = sourceDb.prepare<{ metadata_json: string }>(
      "SELECT metadata_json FROM personal_data_audit_log WHERE subject_type = 'case_handover' ORDER BY sequence DESC LIMIT 1"
    ).get()?.metadata_json ?? '';
    expect(auditMetadata).not.toMatch(/Urlaubsvertretung Testfall|Während der Urlaubsvertretung|Rückgabe aus Vertretung/i);
  });
});
