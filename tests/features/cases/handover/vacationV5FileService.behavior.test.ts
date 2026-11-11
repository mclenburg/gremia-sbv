import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { formatTransferRecipientToken } from '../../../../services/transferInstanceIdentityPolicy';
import { TransferRecipientProfileService } from '../../../../services/transferRecipientProfileService';
import { VacationV5FileService } from '../../../../services/vacationV5FileService';
import { DocumentContainerService } from '../../../../services/documentContainerService';

const empty = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [],
  inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };
const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
  features: ['manual_capability_exchange', 'vacation_scope_v5'], buildVersion: '0.9.9', revision: 1,
  issuedAt: '2026-11-11T10:00:00.000Z' };

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  const identity = new TransferInstanceIdentityService(adapter).getPrivateIdentity();
  return { raw, adapter, identity };
}

describe('Format-5-Dateiservice für fallfreie Arbeit', () => {
  it('überträgt nur das ausgewählte Falldokument und legt es lokal neu verschlüsselt ab', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-file-document-'));
    const sourceDirectory = path.join(directory, 'source');
    const targetDirectory = path.join(directory, 'target');
    const filePath = path.join(directory, 'fall.gsbvtransfer');
    try {
      source.raw.prepare(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-9', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`).run();
      const plain = Buffer.from('Vertraulicher Dokumentinhalt', 'utf8');
      const stored = await new DocumentContainerService().writeEncryptedContainer({ plain, storageRoot: sourceDirectory,
        subdirectory: 'documents', documentId: 'selected', filename: 'Attest.pdf', mimeType: 'application/pdf' });
      source.raw.prepare(`INSERT INTO case_documents (id, case_id, filename, storage_path, sha256, document_key, iv, auth_tag, size_bytes, created_at)
        VALUES ('selected', 'source-case', 'Attest.pdf', ?, ?, ?, ?, ?, ?, '2026-11-11')`)
        .run(stored.storageReference, stored.sha256, stored.documentKey, stored.iv, stored.authTag, stored.sizeBytes);
      const profile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
        .run(JSON.stringify(capabilities), profile.id);
      new TransferRecipientProfileService(target.adapter).save({ label: 'Abgebende SBV',
        recipientToken: formatTransferRecipientToken(source.identity) });
      const exported = await new VacationV5FileService(source.adapter, () => sourceDirectory).exportToFile({
        selection: { ...empty, caseIds: ['source-case'] }, documentIds: ['selected'], profileId: profile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities, targetPath: filePath,
      });
      expect(exported.sectionCounts).toEqual([{ type: 'case', count: 1 }, { type: 'case_document', count: 1 }]);
      expect(fs.readFileSync(filePath, 'utf8')).not.toContain('Vertraulicher Dokumentinhalt');
      const imported = new VacationV5FileService(target.adapter, () => targetDirectory).importFromFile(filePath, 'lange Transport-Passphrase');
      expect(imported.importedCount).toBe(2);
      const document = target.raw.prepare('SELECT storage_path, document_key, iv, auth_tag, sha256 FROM case_documents').get() as {
        storage_path: string; document_key: string; iv: string; auth_tag: string; sha256: string;
      };
      expect(document.storage_path).not.toBe(stored.storagePath);
      const recovered = await new DocumentContainerService().readEncryptedContainer({ storageRoot: targetDirectory,
        storagePath: document.storage_path, documentKey: document.document_key, iv: document.iv,
        authTag: document.auth_tag, expectedSha256: document.sha256 });
      expect(recovered).toEqual(plain);
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('überträgt eine bewusst ausgewählte Fallakte auch ohne fallfreien Abschnitt', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-case-only-'));
    const filePath = path.join(directory, 'fall.gsbvtransfer');
    try {
      source.raw.prepare(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-8', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`).run();
      const targetProfile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
        .run(JSON.stringify(capabilities), targetProfile.id);
      new TransferRecipientProfileService(target.adapter).save({ label: 'Abgebende SBV',
        recipientToken: formatTransferRecipientToken(source.identity) });
      const exported = await new VacationV5FileService(source.adapter).exportToFile({
        selection: { ...empty, caseIds: ['source-case'] }, profileId: targetProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities, targetPath: filePath,
      });
      expect(exported.sectionCounts).toEqual([{ type: 'case', count: 1 }]);
      const imported = new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase');
      expect(imported.importedCount).toBe(1);
      expect(target.raw.prepare('SELECT created_case_count, metadata_json FROM case_handover_imports').get())
        .toMatchObject({ created_case_count: 1, metadata_json: JSON.stringify({ formatVersion: 5,
          sectionCounts: [{ type: 'case', count: 1 }] }) });
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('exportiert und importiert Fall und Sitzung gemeinsam; ein Fallfehler rollt beide zurück', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-mixed-'));
    const filePath = path.join(directory, 'gemischt.gsbvtransfer');
    try {
      source.raw.exec(`
        INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
          VALUES ('source-case', 'SBV-7', 'Anfrage', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11');
        INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
          VALUES ('source-meeting', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11');
      `);
      const targetProfile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
        .run(JSON.stringify(capabilities), targetProfile.id);
      new TransferRecipientProfileService(target.adapter).save({ label: 'Abgebende SBV',
        recipientToken: formatTransferRecipientToken(source.identity) });
      const exported = await new VacationV5FileService(source.adapter).exportToFile({
        selection: { ...empty, caseIds: ['source-case'], meetingIds: ['source-meeting'] }, profileId: targetProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities, targetPath: filePath,
      });
      expect(exported.sectionCounts).toEqual([{ type: 'case', count: 1 }, { type: 'meeting', count: 1 }]);
      expect(source.raw.prepare('SELECT case_count FROM case_handover_exports WHERE package_id = ?').get(exported.packageId))
        .toEqual({ case_count: 1 });
      target.raw.exec(`CREATE TRIGGER reject_case_copy BEFORE INSERT ON case_handover_import_items
        WHEN NEW.local_entity_type = 'case' BEGIN SELECT RAISE(ABORT, 'case copy failed'); END`);
      expect(() => new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase'))
        .toThrow(/case copy failed/);
      expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_meetings').get()).toEqual({ count: 0 });
      expect(target.raw.prepare('SELECT COUNT(*) AS count FROM cases').get()).toEqual({ count: 0 });
      expect(target.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_imports').get()).toEqual({ count: 0 });
      target.raw.exec('DROP TRIGGER reject_case_copy');
      const imported = new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase');
      expect(imported.importedCount).toBe(2);
      expect(target.raw.prepare('SELECT display_name FROM cases').get()).toEqual({ display_name: '[Übergabe] Anfrage' });
      expect(target.raw.prepare('SELECT title FROM sbv_meetings').get()).toEqual({ title: 'Sitzung' });
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('exportiert nur für ein bestätigtes Ziel und importiert verifizierte lokale Kopien', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-file-'));
    const filePath = path.join(directory, 'vertretung.gsbvtransfer');
    try {
      source.raw.prepare(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('source-meeting', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`).run();
      const targetProfile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?').run(JSON.stringify(capabilities), targetProfile.id);
      const service = new VacationV5FileService(source.adapter);
      const exported = await service.exportToFile({ selection: { ...empty, meetingIds: ['source-meeting'] },
        profileId: targetProfile.id, expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: filePath });
      expect(exported.sectionCounts).toEqual([{ type: 'meeting', count: 1 }]);
      expect(source.raw.prepare('SELECT format_version, target_key_fingerprint FROM case_handover_exports WHERE package_id = ?').get(exported.packageId))
        .toEqual({ format_version: 5, target_key_fingerprint: target.identity.keyFingerprint });
      expect(fs.readFileSync(filePath, 'utf8')).not.toContain('Sitzung');
      expect(() => new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase')).toThrow(/nicht als Gegeninstanz bekannt/);
      const senderProfile = new TransferRecipientProfileService(target.adapter).save({ label: 'Abgebende SBV',
        recipientToken: formatTransferRecipientToken(source.identity) });
      expect(() => new VacationV5FileService(target.adapter).importFromFile(filePath, 'falsche Passphrase')).toThrow();
      const imported = new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase');
      expect(imported.importedCount).toBe(1);
      expect(target.raw.prepare('SELECT title FROM sbv_meetings').get()).toEqual({ title: 'Sitzung' });
      expect(target.raw.prepare('SELECT origin_key_fingerprint, target_key_fingerprint FROM case_handover_imports WHERE package_id = ?').get(exported.packageId))
        .toEqual({ origin_key_fingerprint: source.identity.keyFingerprint, target_key_fingerprint: target.identity.keyFingerprint });
      expect(() => new VacationV5FileService(target.adapter).importFromFile(filePath, 'lange Transport-Passphrase')).toThrow(/bereits importiert/);
      expect(senderProfile.active).toBe(true);
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('bewahrt vorhandene Zieldateien und schreibt bei fehlender Format-5-Fähigkeit kein Ledger', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-file-'));
    const filePath = path.join(directory, 'vertretung.gsbvtransfer');
    try {
      source.raw.prepare(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('source-meeting', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`).run();
      const profile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      const input = { selection: { ...empty, meetingIds: ['source-meeting'] }, profileId: profile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities, targetPath: filePath };
      await expect(new VacationV5FileService(source.adapter).exportToFile(input)).rejects.toThrow(/Format 5/);
      expect(fs.existsSync(filePath)).toBe(false);
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
        .run(JSON.stringify({ ...capabilities, features: ['manual_capability_exchange'] }), profile.id);
      await expect(new VacationV5FileService(source.adapter).exportToFile(input)).rejects.toThrow(/Format 5/);
      expect(source.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_exports').get()).toEqual({ count: 0 });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?').run(JSON.stringify(capabilities), profile.id);
      fs.writeFileSync(filePath, 'bestehend');
      await expect(new VacationV5FileService(source.adapter).exportToFile(input)).rejects.toThrow();
      expect(fs.readFileSync(filePath, 'utf8')).toBe('bestehend');
      expect(source.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_exports').get()).toEqual({ count: 0 });
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('entfernt die neue Datei, wenn das Ledger innerhalb der Transaktion scheitert', async () => {
    const source = database(); const target = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-file-'));
    const filePath = path.join(directory, 'vertretung.gsbvtransfer');
    try {
      source.raw.prepare(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('source-meeting', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`).run();
      const profile = new TransferRecipientProfileService(source.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(target.identity) });
      source.raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?').run(JSON.stringify(capabilities), profile.id);
      source.raw.exec(`CREATE TRIGGER reject_v5_ledger BEFORE INSERT ON case_handover_exports
        BEGIN SELECT RAISE(ABORT, 'ledger unavailable'); END`);
      await expect(new VacationV5FileService(source.adapter).exportToFile({ selection: { ...empty, meetingIds: ['source-meeting'] },
        profileId: profile.id, expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: filePath })).rejects.toThrow(/ledger unavailable/);
      expect(fs.existsSync(filePath)).toBe(false);
      expect(source.raw.prepare('SELECT COUNT(*) AS count FROM case_handover_exports').get()).toEqual({ count: 0 });
    } finally { source.raw.close(); target.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
