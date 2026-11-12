import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { TransferRecipientProfileService } from '../../../../services/transferRecipientProfileService';
import { formatTransferRecipientToken } from '../../../../services/transferInstanceIdentityPolicy';
import { DocumentContainerService } from '../../../../services/documentContainerService';
import { VacationV5FileService } from '../../../../services/vacationV5FileService';
import { VacationV5ReturnFileService } from '../../../../services/vacationV5ReturnFileService';
import { listVacationV5OriginItemChanges } from '../../../../services/vacationV5ImportedItemChanges';

const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
  features: ['manual_capability_exchange', 'vacation_scope_v5', 'return_scope_v5'], buildVersion: '0.9.9', revision: 1,
  issuedAt: '2026-11-11T10:00:00.000Z' };
const empty = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [],
  inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, adapter, identity: new TransferInstanceIdentityService(adapter).getPrivateIdentity() };
}

describe('Format-5-Dokumentänderung', () => {
  it('tauscht ein Falldokument erst nach bestätigtem Import aus und erhält das Original bei Fehlern', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-document-update-'));
    const originDirectory = path.join(directory, 'origin');
    const deputyDirectory = path.join(directory, 'deputy');
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-49', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`);
      const originalPlain = Buffer.from('Ursprünglicher Inhalt', 'utf8');
      const originalStored = await new DocumentContainerService().writeEncryptedContainer({ plain: originalPlain,
        storageRoot: originDirectory, subdirectory: 'documents', documentId: 'source-document',
        filename: 'Bericht.txt', mimeType: 'text/plain' });
      origin.raw.prepare(`INSERT INTO case_documents
        (id, case_id, filename, storage_path, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('source-document', 'source-case', 'Bericht.txt', ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(originalStored.storageReference, originalStored.sha256, originalStored.documentKey,
          originalStored.iv, originalStored.authTag, originalStored.sizeBytes);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter, () => originDirectory).exportToFile({
        selection: { ...empty, caseIds: ['source-case'] }, documentIds: ['source-document'],
        profileId: deputyProfile.id, expiresAt: '2099-11-30T00:00:00.000Z',
        passphrase: 'lange Transport-Passphrase', capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter, () => deputyDirectory)
        .importFromFile(handoverPath, 'lange Transport-Passphrase');
      const revisedPlain = Buffer.from('Überarbeiteter Inhalt – äöü', 'utf8');
      const revisedStored = await new DocumentContainerService().writeEncryptedContainer({ plain: revisedPlain,
        storageRoot: deputyDirectory, subdirectory: 'documents', documentId: 'revised-document',
        filename: 'Bericht.txt', mimeType: 'text/plain' });
      deputy.raw.prepare(`UPDATE case_documents SET display_title = 'Überarbeitet', storage_path = ?, sha256 = ?,
        document_key = ?, iv = ?, auth_tag = ?, size_bytes = ?`)
        .run(revisedStored.storageReference, revisedStored.sha256, revisedStored.documentKey,
          revisedStored.iv, revisedStored.authTag, revisedStored.sizeBytes);
      await new VacationV5ReturnFileService(deputy.adapter, () => deputyDirectory).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
      });
      const service = new VacationV5ReturnFileService(origin.adapter, () => originDirectory);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'document_1', kind: 'case_document', decision: 'propose_update' }]);
      const baseline = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, originDirectory).items
        .find((item) => item.ref === 'document_1')?.currentSha256 ?? null;
      const choice = [{ ref: 'document_1', action: 'accept_update' as const, expectedOriginSha256: baseline }];
      origin.raw.exec(`CREATE TRIGGER reject_document_update_ledger BEFORE INSERT ON case_handover_import_items
        WHEN NEW.local_entity_type = 'case_document' BEGIN SELECT RAISE(ABORT, 'update ledger failed'); END`);
      expect(() => service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choice))
        .toThrow(/update ledger failed/);
      expect(origin.raw.prepare('SELECT storage_path FROM case_documents WHERE id = ?').get('source-document'))
        .toEqual({ storage_path: originalStored.storageReference });
      expect(fs.existsSync(originalStored.storagePath)).toBe(true);
      expect(fs.readdirSync(originDirectory, { recursive: true }).filter((entry) => String(entry).endsWith('.gsbvdoc')))
        .toHaveLength(1);
      origin.raw.exec('DROP TRIGGER reject_document_update_ledger');
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choice))
        .toMatchObject({ acceptedCount: 1 });
      const document = origin.raw.prepare('SELECT * FROM case_documents WHERE id = ?').get('source-document') as Record<string, string>;
      expect(document.display_title).toBe('Überarbeitet');
      expect(document.storage_path).not.toBe(originalStored.storageReference);
      expect(fs.existsSync(originalStored.storagePath)).toBe(false);
      expect(await new DocumentContainerService().readEncryptedContainer({ storageRoot: originDirectory,
        storagePath: document.storage_path, documentKey: document.document_key, iv: document.iv,
        authTag: document.auth_tag, expectedSha256: document.sha256 })).toEqual(revisedPlain);
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('ersetzt ein geändertes Amtsdokument bei erhaltenem Sitzungsbezug', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-office-update-'));
    const originDirectory = path.join(directory, 'origin');
    const deputyDirectory = path.join(directory, 'deputy');
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-source', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`);
      const originalPlain = Buffer.from('Altes Protokoll', 'utf8');
      const originalStored = await new DocumentContainerService().writeEncryptedContainer({ plain: originalPlain,
        storageRoot: originDirectory, subdirectory: 'office/meeting', documentId: 'office-source',
        filename: 'Protokoll.txt', mimeType: 'text/plain' });
      origin.raw.prepare(`INSERT INTO generated_documents
        (id, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('office-source', 'Protokoll', ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(originalStored.storageReference, originalStored.filename, originalStored.mimeType,
          originalStored.sha256, originalStored.documentKey, originalStored.iv,
          originalStored.authTag, originalStored.sizeBytes);
      origin.raw.exec(`INSERT INTO sbv_workflow_document_links
        (id, owner_type, owner_id, document_id, purpose, created_at)
        VALUES ('office-link', 'meeting', 'meeting-source', 'office-source', 'Protokoll', '2026-11-11')`);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter, () => originDirectory).exportToFile({
        selection: { ...empty, meetingIds: ['meeting-source'] }, officeDocumentIds: ['office-source'],
        profileId: deputyProfile.id, expiresAt: '2099-11-30T00:00:00.000Z',
        passphrase: 'lange Transport-Passphrase', capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter, () => deputyDirectory)
        .importFromFile(handoverPath, 'lange Transport-Passphrase');
      const revisedPlain = Buffer.from('Neues Protokoll – Sitzung', 'utf8');
      const revisedStored = await new DocumentContainerService().writeEncryptedContainer({ plain: revisedPlain,
        storageRoot: deputyDirectory, subdirectory: 'office/meeting', documentId: 'office-revised',
        filename: 'Protokoll.txt', mimeType: 'text/plain' });
      deputy.raw.prepare(`UPDATE generated_documents SET title = 'Überarbeitetes Protokoll',
        storage_path = ?, sha256 = ?, document_key = ?, iv = ?, auth_tag = ?, size_bytes = ?`)
        .run(revisedStored.storageReference, revisedStored.sha256, revisedStored.documentKey,
          revisedStored.iv, revisedStored.authTag, revisedStored.sizeBytes);
      await new VacationV5ReturnFileService(deputy.adapter, () => deputyDirectory).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
      });
      const service = new VacationV5ReturnFileService(origin.adapter, () => originDirectory);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'generated_document_1', kind: 'generated_document', decision: 'propose_update' }]);
      const baseline = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, originDirectory).items
        .find((item) => item.ref === 'generated_document_1')?.currentSha256 ?? null;
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', [
        { ref: 'generated_document_1', action: 'accept_update', expectedOriginSha256: baseline },
      ])).toMatchObject({ acceptedCount: 1 });
      const document = origin.raw.prepare('SELECT * FROM generated_documents WHERE id = ?').get('office-source') as Record<string, string>;
      expect(document.title).toBe('Überarbeitetes Protokoll');
      expect(fs.existsSync(originalStored.storagePath)).toBe(false);
      expect(origin.raw.prepare('SELECT document_id FROM sbv_workflow_document_links WHERE id = ?')
        .get('office-link')).toEqual({ document_id: 'office-source' });
      expect(await new DocumentContainerService().readEncryptedContainer({ storageRoot: originDirectory,
        storagePath: document.storage_path, documentKey: document.document_key, iv: document.iv,
        authTag: document.auth_tag, expectedSha256: document.sha256 })).toEqual(revisedPlain);
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
