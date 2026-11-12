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
import { listVacationV5ImportedItemChanges } from '../../../../services/vacationV5ImportedItemChanges';

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

describe('Format-5-Verstoßdokumentrückgabe', () => {
  it('bindet ein neues Verstoßdokument an den Ursprung und speichert die endgültige Baseline', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-violation-doc-'));
    const originDirectory = path.join(directory, 'origin');
    const deputyDirectory = path.join(directory, 'deputy');
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO sbv_participation_violations
        (id, stage, status, violation_type, source_context_type, source_context_id, subject,
          measure_description, wrong_behavior, required_behavior, created_at, updated_at)
        VALUES ('violation-source', 'request', 'open', 'not_informed', 'general_employer_practice',
          'violation-source', 'Anfrage', 'Maßnahme', 'Unterlassung', 'Beteiligung', '2026-11-11', '2026-11-11')`);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter, () => originDirectory).exportToFile({
        selection: { ...empty, violationIds: ['violation-source'] }, profileId: deputyProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter, () => deputyDirectory)
        .importFromFile(handoverPath, 'lange Transport-Passphrase');
      const deputyViolation = deputy.raw.prepare('SELECT id FROM sbv_participation_violations').get() as { id: string };
      const plain = Buffer.from('Verstoßdokument – Rückgabe', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain, storageRoot: deputyDirectory,
        subdirectory: 'office/violation', documentId: 'new-violation-document', filename: 'Anfrage.pdf',
        mimeType: 'application/pdf' });
      deputy.raw.prepare(`INSERT INTO generated_documents
        (id, violation_id, document_kind, title, storage_path, filename, mime_type, sha256,
          document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('new-violation-document', ?, 'sbv_participation_violation', 'Anfrage', ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-12')`)
        .run(deputyViolation.id, stored.storageReference, stored.filename, stored.mimeType, stored.sha256,
          stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes);
      deputy.raw.prepare(`INSERT INTO sbv_participation_violation_documents
        (id, violation_id, document_id, stage, template_key, template_version, created_at)
        VALUES ('new-violation-link', ?, 'new-violation-document', 'request', 'request', '1', '2026-11-12')`)
        .run(deputyViolation.id);
      const returned = await new VacationV5ReturnFileService(deputy.adapter, () => deputyDirectory).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
        additionalItems: [{ kind: 'violation_document_link', localId: 'new-violation-link' },
          { kind: 'generated_document', localId: 'new-violation-document' }],
      });
      const service = new VacationV5ReturnFileService(origin.adapter, () => originDirectory);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items).toEqual([
        { ref: 'return_generated_document_1', kind: 'generated_document', decision: 'review_addition' },
        { ref: 'return_violation_document_link_1', kind: 'violation_document_link', decision: 'review_addition' },
      ]);
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', [
        { ref: 'return_generated_document_1', action: 'accept_addition', expectedOriginSha256: null },
        { ref: 'return_violation_document_link_1', action: 'accept_addition', expectedOriginSha256: null },
      ])).toMatchObject({ acceptedCount: 2 });
      const linked = origin.raw.prepare(`SELECT d.*, l.violation_id AS linked_violation_id FROM generated_documents d
        JOIN sbv_participation_violation_documents l ON l.document_id = d.id`).get() as Record<string, string>;
      expect(linked.violation_id).toBe('violation-source');
      expect(linked.linked_violation_id).toBe('violation-source');
      expect(await new DocumentContainerService().readEncryptedContainer({ storageRoot: originDirectory,
        storagePath: linked.storage_path, documentKey: linked.document_key, iv: linked.iv,
        authTag: linked.auth_tag, expectedSha256: linked.sha256 })).toEqual(plain);
      expect(listVacationV5ImportedItemChanges(origin.adapter, returned.packageId, originDirectory).items
        .map((item) => [item.kind, item.status])).toEqual([
          ['generated_document', 'unchanged'], ['violation_document_link', 'unchanged'],
        ]);
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
