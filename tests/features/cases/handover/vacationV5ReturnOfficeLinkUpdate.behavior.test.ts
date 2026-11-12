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

describe('Format-5-Dokumentbezug-Rückgabe', () => {
  it('übernimmt eine geänderte Zweckangabe ohne den Sitzungs- oder Dokumentbezug auszutauschen', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-office-link-'));
    const originDirectory = path.join(directory, 'origin');
    const deputyDirectory = path.join(directory, 'deputy');
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-source', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`);
      const plain = Buffer.from('Sitzungsprotokoll', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain,
        storageRoot: originDirectory, subdirectory: 'office/meeting', documentId: 'office-source',
        filename: 'Protokoll.txt', mimeType: 'text/plain' });
      origin.raw.prepare(`INSERT INTO generated_documents
        (id, title, storage_path, filename, mime_type, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('office-source', 'Protokoll', ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(stored.storageReference, stored.filename, stored.mimeType, stored.sha256,
          stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes);
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
      deputy.raw.exec("UPDATE sbv_workflow_document_links SET purpose = 'Korrigiertes Protokoll'");
      await new VacationV5ReturnFileService(deputy.adapter, () => deputyDirectory).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
      });
      const service = new VacationV5ReturnFileService(origin.adapter, () => originDirectory);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'workflow_document_link_1', kind: 'workflow_document_link', decision: 'propose_update' }]);
      const baseline = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, originDirectory).items
        .find((item) => item.ref === 'workflow_document_link_1')?.currentSha256 ?? null;
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', [
        { ref: 'workflow_document_link_1', action: 'accept_update', expectedOriginSha256: baseline },
      ])).toMatchObject({ acceptedCount: 1 });
      expect(origin.raw.prepare(`SELECT owner_type, owner_id, document_id, purpose
        FROM sbv_workflow_document_links WHERE id = 'office-link'`).get()).toEqual({
        owner_type: 'meeting', owner_id: 'meeting-source', document_id: 'office-source',
        purpose: 'Korrigiertes Protokoll',
      });
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
