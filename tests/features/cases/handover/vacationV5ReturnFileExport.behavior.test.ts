import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { TransferRecipientProfileService } from '../../../../services/transferRecipientProfileService';
import { formatTransferRecipientToken } from '../../../../services/transferInstanceIdentityPolicy';
import { VacationV5FileService } from '../../../../services/vacationV5FileService';
import { VacationV5ReturnFileService } from '../../../../services/vacationV5ReturnFileService';

const empty = { caseIds: [], standaloneDeadlineIds: [], meetingIds: [], recruitingIds: [], employerObligationIds: [],
  inclusionAgreementIds: [], violationIds: [], assemblyIds: [] };
const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
  features: ['manual_capability_exchange', 'vacation_scope_v5', 'return_scope_v5'], buildVersion: '0.9.9', revision: 1,
  issuedAt: '2026-11-11T10:00:00.000Z' };

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

describe('Format-5-Rückgabedatei', () => {
  it('schreibt nur geänderte Arbeit und setzt den Status erst nach Datei und Ledgererfolg', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-export-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO sbv_meetings (id, meeting_type, title, starts_at, status, created_at, updated_at)
        VALUES ('meeting-source', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11')`);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter).exportToFile({
        selection: { ...empty, meetingIds: ['meeting-source'] }, profileId: deputyProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter).importFromFile(handoverPath, 'lange Transport-Passphrase');
      deputy.raw.prepare("UPDATE sbv_meetings SET title = 'Vertretung hat geändert'").run();
      const service = new VacationV5ReturnFileService(deputy.adapter);
      deputy.raw.exec(`CREATE TRIGGER reject_return_ledger BEFORE INSERT ON case_handover_exports
        BEGIN SELECT RAISE(ABORT, 'return ledger failed'); END`);
      await expect(service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: returnPath })).rejects.toThrow(/return ledger failed/);
      expect(fs.existsSync(returnPath)).toBe(false);
      expect(deputy.raw.prepare('SELECT status FROM case_handover_imports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'active' });
      deputy.raw.exec('DROP TRIGGER reject_return_ledger');
      const returned = await service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: returnPath });
      expect(returned.changeCount).toBe(1);
      expect(deputy.raw.prepare('SELECT status FROM case_handover_imports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'returned' });
      expect(new VacationV5ReturnFileService(origin.adapter).previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'meeting_1', kind: 'meeting', decision: 'propose_update' }]);
      await expect(service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: path.join(directory, 'second.gsbvtransfer') })).rejects.toThrow();
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
