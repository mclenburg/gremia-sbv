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

describe('Format-5-Fallaktenrückgabe', () => {
  it('übernimmt den Arbeitsstand, ohne lokale Nummer oder Schutzmetadaten zu überschreiben', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-case-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO cases
        (id, case_number, display_name, category, opened_at, summary, created_at, updated_at)
        VALUES ('source-case', 'SBV-45', 'Einzelfall', 'sonstiges', '2026-11-11', 'Ausgang', '2026-11-11', '2026-11-11')`);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter).exportToFile({
        selection: { ...empty, caseIds: ['source-case'] }, profileId: deputyProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter).importFromFile(handoverPath, 'lange Transport-Passphrase');
      deputy.raw.exec(`UPDATE cases SET display_name = '[Übergabe] Fortschritt', summary = 'Vertretung bearbeitet',
        status = 'in_bearbeitung', priority = 'high'`);
      await new VacationV5ReturnFileService(deputy.adapter).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
      });
      const service = new VacationV5ReturnFileService(origin.adapter);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'case_1', kind: 'case', decision: 'propose_update' }]);
      const baseline = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .find((item) => item.ref === 'case_1')?.currentSha256 ?? null;
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', [
        { ref: 'case_1', action: 'accept_update', expectedOriginSha256: baseline },
      ])).toMatchObject({ acceptedCount: 1 });
      expect(origin.raw.prepare(`SELECT case_number, display_name, summary, status, priority,
        handover_status, privacy_review_required FROM cases WHERE id = 'source-case'`).get()).toEqual({
        case_number: 'SBV-45', display_name: 'Fortschritt', summary: 'Vertretung bearbeitet',
        status: 'in_bearbeitung', priority: 'high', handover_status: 'none', privacy_review_required: 1,
      });
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
