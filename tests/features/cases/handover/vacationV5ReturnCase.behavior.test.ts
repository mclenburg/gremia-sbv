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

  it('ordnet neue Fallakte, geschützte Person und Fallnotiz atomar zu', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-new-case-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-46', 'Ausgangsfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11'),
          ('other-case', 'SBV-47', 'Lokaler Fall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`);
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
      deputy.raw.exec(`INSERT INTO protected_persons
        (id, first_name, last_name, protection_status, created_at, updated_at)
        VALUES ('new-person', 'Alex', 'Neu', 'unclear', '2026-11-12', '2026-11-12');
        INSERT INTO cases
        (id, case_number, protected_person_id, person_binding_state, display_name, category, opened_at, created_at, updated_at)
        VALUES ('new-case', 'SBV-47', 'new-person', 'active', 'Neuer Fall', 'sonstiges', '2026-11-12', '2026-11-12', '2026-11-12');
        INSERT INTO case_notes (id, case_id, title, note_date, note_type, content, created_at, updated_at)
        VALUES ('new-case-note', 'new-case', 'Gespräch', '2026-11-12', 'conversation', 'Verlauf', '2026-11-12', '2026-11-12')`);
      await new VacationV5ReturnFileService(deputy.adapter).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
        additionalItems: [{ kind: 'case_note', localId: 'new-case-note' },
          { kind: 'case', localId: 'new-case' }, { kind: 'protected_person', localId: 'new-person' }],
      });
      const service = new VacationV5ReturnFileService(origin.adapter);
      const review = service.previewFromFile(returnPath, 'lange Transport-Passphrase');
      expect(review.items.map((item) => [item.kind, item.decision])).toEqual([
        ['case', 'review_addition'], ['case_note', 'review_addition'], ['protected_person', 'review_addition'],
      ]);
      const choices = review.items.map((item) => ({ ref: item.ref, action: 'accept_addition' as const,
        expectedOriginSha256: null }));
      origin.raw.exec(`CREATE TRIGGER reject_new_case_note BEFORE INSERT ON case_notes
        BEGIN SELECT RAISE(ABORT, 'new case note failed'); END`);
      expect(() => service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choices))
        .toThrow(/new case note failed/);
      expect(origin.raw.prepare('SELECT COUNT(*) AS count FROM protected_persons').get()).toEqual({ count: 0 });
      expect(origin.raw.prepare('SELECT COUNT(*) AS count FROM cases').get()).toEqual({ count: 2 });
      origin.raw.exec('DROP TRIGGER reject_new_case_note');
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choices))
        .toMatchObject({ acceptedCount: 3 });
      const row = origin.raw.prepare(`SELECT c.case_number, c.display_name, c.privacy_review_required,
        c.person_binding_state, p.first_name, n.content
        FROM cases c JOIN protected_persons p ON p.id = c.protected_person_id
        JOIN case_notes n ON n.case_id = c.id WHERE n.title = 'Gespräch'`).get();
      expect(row).toEqual({ case_number: 'SBV-47-IMPORT', display_name: 'Neuer Fall',
        privacy_review_required: 1, person_binding_state: 'active', first_name: 'Alex', content: 'Verlauf' });
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('übernimmt geänderte Personendaten mit Datenschutzprüfung und erhält lokale Aufbewahrungsangaben', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-person-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO protected_persons
        (id, first_name, last_name, protection_status, retention_reason, created_at, updated_at)
        VALUES ('source-person', 'Alex', 'Beispiel', 'unclear', 'Lokale Entscheidung', '2026-11-11', '2026-11-11');
        INSERT INTO cases
        (id, case_number, protected_person_id, person_binding_state, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-48', 'source-person', 'active', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11')`);
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
      deputy.raw.exec("UPDATE protected_persons SET notes = 'Rückmeldung' WHERE first_name = 'Alex'");
      await new VacationV5ReturnFileService(deputy.adapter).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
      });
      const service = new VacationV5ReturnFileService(origin.adapter);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'person_1', kind: 'protected_person', decision: 'propose_update' }]);
      const baseline = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .find((item) => item.ref === 'person_1')?.currentSha256 ?? null;
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', [
        { ref: 'person_1', action: 'accept_update', expectedOriginSha256: baseline },
      ])).toMatchObject({ acceptedCount: 1 });
      expect(origin.raw.prepare('SELECT notes, retention_reason FROM protected_persons WHERE id = ?')
        .get('source-person')).toEqual({ notes: 'Rückmeldung', retention_reason: 'Lokale Entscheidung' });
      expect(origin.raw.prepare('SELECT privacy_review_required FROM cases WHERE id = ?')
        .get('source-case')).toEqual({ privacy_review_required: 1 });
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
