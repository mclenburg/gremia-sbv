import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { MigrationService } from '../../../../services/migrationService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { CaseHandoverReturnDeltaService } from '../../../../services/caseHandoverReturnDeltaService';
import { recordMobileCompanionSnapshotExport } from '../../../../services/caseHandoverExportLedger';
import type { MobileCompanionSnapshotPayload } from '../../../../src/domain/models/mobile-companion.model';
import type { PackagePayload } from '../../../../services/caseHandoverSupport';
import { CaseHandoverChecklistService } from '../../../../services/caseHandoverChecklistService';
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
  it('übernimmt eine zurückgegebene Frist nicht, wenn die Ausgangsfrist nach dem Export geändert wurde', async () => {
    insertSourceCase(sourceDb, 'source-case-conflict');
    const createdAt = '2026-09-05T09:00:00.000Z';
    sourceDb.prepare(`INSERT INTO deadlines (id, case_id, process_type, deadline_type, title, due_at, status, created_at, updated_at) VALUES (?, ?, 'case', 'follow_up', ?, ?, 'open', ?, ?)`)
      .run('deadline-conflict', 'source-case-conflict', 'Ausgangsfrist', '2099-01-01T09:00:00.000Z', createdAt, createdAt);
    const source = new CaseHandoverService(sourceDb, () => path.join(tempRoot, 'source-data'));
    const substitute = new CaseHandoverService(substituteDb, () => path.join(tempRoot, 'substitute-data'));
    const passphrase = 'lange Transport-Passphrase für Konflikt';
    const handoverFile = path.join(tempRoot, 'conflict-out.gsbvtransfer');
    const returnFile = path.join(tempRoot, 'conflict-return.gsbvtransfer');
    const expiresAt = '2099-12-31T23:59:59.000Z';
    const checklist = new CaseHandoverChecklistService(sourceDb).build({ packageType: 'vacation_handover', caseIds: ['source-case-conflict'], expiresAt });
    const exported = await source.exportToFile({
      caseIds: ['source-case-conflict'], expiresAt, passphrase,
      targetRecipientToken: new TransferInstanceIdentityService(substituteDb).getPublicIdentity().recipientToken,
      checklist: { version: 1, acknowledgedItemIds: checklist.requiredAcknowledgementIds },
    }, handoverFile);
    const imported = await substitute.importFromFile({ filePath: handoverFile, passphrase, mode: 'create_new' });
    const substituteDeadline = substituteDb.prepare<{ id: string }>('SELECT id FROM deadlines WHERE case_id = ?').get(imported.createdCaseIds[0]);
    expect(substituteDeadline).toBeDefined();
    substituteDb.prepare('UPDATE deadlines SET title = ?, updated_at = ? WHERE id = ?')
      .run('Frist der Stellvertretung', '2099-01-02T09:00:00.000Z', substituteDeadline!.id);
    const returnChecklist = new CaseHandoverChecklistService(substituteDb).build({ packageType: 'return_delta', caseIds: imported.createdCaseIds });
    await substitute.exportReturnDeltaToFile({
      sourcePackageId: imported.packageId, caseIds: imported.createdCaseIds, passphrase,
      targetRecipientToken: new TransferInstanceIdentityService(sourceDb).getPublicIdentity().recipientToken,
      checklist: { version: 1, acknowledgedItemIds: returnChecklist.requiredAcknowledgementIds },
    }, returnFile);

    sourceDb.prepare('UPDATE deadlines SET title = ? WHERE id = ?')
      .run('Frist der Ausgangsinstanz', 'deadline-conflict');

    await expect(source.importFromFile({ filePath: returnFile, passphrase, mode: 'merge_existing' })).rejects.toThrow(/beidseitig|Konflikt/);
    expect(sourceDb.prepare<{ title: string }>('SELECT title FROM deadlines WHERE id = ?').get('deadline-conflict')?.title).toBe('Frist der Ausgangsinstanz');
    expect(sourceDb.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_handover_imports WHERE package_id != ?').get(exported.packageId)?.count).toBe(0);
    sourceDb.prepare('UPDATE deadlines SET title = ? WHERE id = ?').run('Ausgangsfrist', 'deadline-conflict');
    await source.importFromFile({ filePath: returnFile, passphrase, mode: 'merge_existing' });
    expect(sourceDb.prepare<{ title: string }>('SELECT title FROM deadlines WHERE id = ?').get('deadline-conflict')?.title).toBe('Frist der Stellvertretung');
  });

  it('verweigert ein Rückgabe-Delta mit einer mobilen Momentaufnahme als Ausgangspaket', () => {
    insertSourceCase(sourceDb, 'source-case-1');
    const snapshot = {
      packageId: 'mobile_snapshot_1', createdAt: '2026-09-05T08:00:00.000Z',
      targetInstanceId: 'desktop-1', schemaVersion: 1,
      cases: [{ id: 'source-case-1' }], deadlines: [],
    } as unknown as MobileCompanionSnapshotPayload;
    recordMobileCompanionSnapshotExport(sourceDb, snapshot, 1, 'a'.repeat(64));
    const delta: PackagePayload = {
      format: 'gremia-sbv-case-handover', version: 2, packageId: 'handover_forged_delta',
      createdAt: '2026-09-06T08:00:00.000Z', purpose: 'Rückgabe', packageType: 'return_delta',
      sourcePackageId: snapshot.packageId,
      cases: [{ ref: 'source-case-1', data: { id: 'source-case-1', case_id: 'source-case-1', measure_id: '', protected_person_id: null } }],
      protectedPersons: [], notes: [], measures: [], measureNotes: [], deadlines: [], documents: [],
    };
    const service = new CaseHandoverReturnDeltaService(sourceDb, () => path.join(tempRoot, 'source-data'));
    expect(() => service.importPayload(delta, { filePath: '', passphrase: '', mode: 'merge_existing' }))
      .toThrow(/Ausgangspaket.*nicht bekannt/);
    expect(countNotes(sourceDb, 'source-case-1')).toBe(1);
    expect(sourceDb.prepare<{ status: string }>('SELECT status FROM case_handover_exports WHERE package_id = ?').get(snapshot.packageId)?.status).toBe('open');
  });
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
      checklist: {
        version: 1,
        acknowledgedItemIds: new CaseHandoverChecklistService(substituteDb).build({
          packageType: 'return_delta',
          caseIds: [substituteCaseId],
        }).requiredAcknowledgementIds,
      },
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

    const auditEntry = sourceDb.prepare<{ action: string; purpose: string; metadata_json: string }>(
      "SELECT action, purpose, metadata_json FROM personal_data_audit_log WHERE subject_type = 'case_handover' ORDER BY sequence DESC LIMIT 1"
    ).get();
    expect(auditEntry).toMatchObject({
      action: 'import',
      purpose: 'Verschlüsseltes Fallübergabepaket importiert.',
    });
    expect(JSON.parse(auditEntry?.metadata_json ?? '{}')).toMatchObject({
      packageId: delta.packageId,
      caseCount: 1,
      documentCount: 1,
      mode: 'return_delta',
      result: 'success',
    });
    expect(auditEntry?.metadata_json).not.toMatch(/Urlaubsvertretung Testfall|Während der Urlaubsvertretung|Rückgabe aus Vertretung/i);
  });
});
