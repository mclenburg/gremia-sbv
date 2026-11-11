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

const empty = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [],
  inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };
const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
  features: ['manual_capability_exchange', 'vacation_scope_v5'], buildVersion: '0.9.9', revision: 1,
  issuedAt: '2026-11-11T10:00:00.000Z' };

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const adapter = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
    all: (...args: unknown[]) => statement.all(...args as []) as T[], run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  const identity = new TransferInstanceIdentityService(adapter).getPrivateIdentity();
  return { raw, adapter, identity };
}

describe('Format-5-Dateiservice für fallfreie Arbeit', () => {
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
