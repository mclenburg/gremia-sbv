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
        VALUES ('meeting-source', 'other', 'Sitzung', '2099-11-20', 'draft', '2026-11-11', '2026-11-11'),
          ('meeting-cancel', 'other', 'Abzusagende Sitzung', '2099-11-21', 'draft', '2026-11-11', '2026-11-11')`);
      const deputyProfile = new TransferRecipientProfileService(origin.adapter).save({ label: 'Vertretung',
        recipientToken: formatTransferRecipientToken(deputy.identity) });
      const originProfile = new TransferRecipientProfileService(deputy.adapter).save({ label: 'Ursprung',
        recipientToken: formatTransferRecipientToken(origin.identity) });
      for (const [raw, id] of [[origin.raw, deputyProfile.id], [deputy.raw, originProfile.id]] as const) {
        raw.prepare('UPDATE transfer_recipient_profiles SET capabilities_json = ? WHERE id = ?')
          .run(JSON.stringify(capabilities), id);
      }
      const handover = await new VacationV5FileService(origin.adapter).exportToFile({
        selection: { ...empty, meetingIds: ['meeting-source', 'meeting-cancel'] }, profileId: deputyProfile.id,
        expiresAt: '2099-11-30T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: handoverPath,
      });
      new VacationV5FileService(deputy.adapter).importFromFile(handoverPath, 'lange Transport-Passphrase');
      deputy.raw.prepare("UPDATE sbv_meetings SET title = 'Vertretung hat geändert' WHERE title = 'Sitzung'").run();
      const deputyMeeting = deputy.raw.prepare("SELECT id FROM sbv_meetings WHERE title = 'Vertretung hat geändert'").get() as { id: string };
      deputy.raw.prepare(`INSERT INTO sbv_meeting_agenda_items
        (id, meeting_id, position, title, status, created_at, updated_at) VALUES (?, ?, 1, 'Neuer TOP', 'open', ?, ?)`)
        .run('new-agenda', deputyMeeting.id, '2026-11-11', '2026-11-11');
      const service = new VacationV5ReturnFileService(deputy.adapter);
      deputy.raw.exec(`CREATE TRIGGER reject_return_ledger BEFORE INSERT ON case_handover_exports
        BEGIN SELECT RAISE(ABORT, 'return ledger failed'); END`);
      await expect(service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: returnPath, cancellationRequests: [{ ref: 'meeting_2', reason: 'Termin entfällt' }],
        additionalItems: [{ kind: 'meeting_agenda', localId: 'new-agenda' }]
      })).rejects.toThrow(/return ledger failed/);
      expect(fs.existsSync(returnPath)).toBe(false);
      expect(deputy.raw.prepare('SELECT status FROM case_handover_imports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'active' });
      deputy.raw.exec('DROP TRIGGER reject_return_ledger');
      const returned = await service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: returnPath, cancellationRequests: [{ ref: 'meeting_2', reason: 'Termin entfällt' }],
        additionalItems: [{ kind: 'meeting_agenda', localId: 'new-agenda' }] });
      expect(returned.changeCount).toBe(3);
      expect(deputy.raw.prepare('SELECT status FROM case_handover_imports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'returned' });
      expect(new VacationV5ReturnFileService(origin.adapter).previewFromFile(returnPath, 'lange Transport-Passphrase').items)
        .toEqual([{ ref: 'meeting_1', kind: 'meeting', decision: 'propose_update' },
          { ref: 'meeting_2', kind: 'meeting', decision: 'review_removal' },
          { ref: 'return_meeting_agenda_1', kind: 'meeting_agenda', decision: 'review_addition' }]);
      const originHash = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .find((item) => item.ref === 'meeting_1')?.currentSha256 ?? null;
      expect(new VacationV5ReturnFileService(origin.adapter).reviewFromFile(returnPath,
        'lange Transport-Passphrase').items).toEqual(expect.arrayContaining([
          expect.objectContaining({ ref: 'meeting_1', expectedOriginSha256: originHash,
            originData: expect.objectContaining({ title: 'Sitzung' }),
            deputyData: expect.objectContaining({ title: 'Vertretung hat geändert' }) }),
          expect.objectContaining({ ref: 'return_meeting_agenda_1', expectedOriginSha256: null,
            originData: null, deputyData: expect.objectContaining({ title: 'Neuer TOP' }) }),
        ]));
      const choice = [{ ref: 'meeting_1', action: 'accept_update' as const, expectedOriginSha256: originHash },
        { ref: 'meeting_2', action: 'acknowledge_cancellation' as const,
          expectedOriginSha256: listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
            .find((item) => item.ref === 'meeting_2')?.currentSha256 ?? null },
        { ref: 'return_meeting_agenda_1', action: 'accept_addition' as const, expectedOriginSha256: null }];
      origin.raw.prepare("UPDATE sbv_meetings SET title = 'Lokal überarbeitet' WHERE id = ?").run('meeting-source');
      expect(new VacationV5ReturnFileService(origin.adapter).previewFromFile(returnPath,
        'lange Transport-Passphrase').items[0].decision).toBe('review_conflict');
      expect(() => new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', choice)).toThrow(/Rückgabebasis/);
      expect(origin.raw.prepare('SELECT title FROM sbv_meetings WHERE id = ?').get('meeting-source'))
        .toEqual({ title: 'Lokal überarbeitet' });
      const conflictHash = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .find((item) => item.ref === 'meeting_1')?.currentSha256 ?? null;
      const conflictChoice = [{ ref: 'meeting_1', action: 'accept_conflict_update' as const,
        expectedOriginSha256: conflictHash }, choice[1], choice[2]];
      expect(() => new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', [{ ...choice[0], expectedOriginSha256: conflictHash }, choice[1], choice[2]]))
        .toThrow(/gesonderter fachlicher Prüfung/);
      origin.raw.exec(`CREATE TRIGGER reject_return_update BEFORE UPDATE ON sbv_meetings
        BEGIN SELECT RAISE(ABORT, 'return update failed'); END`);
      expect(() => new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', conflictChoice)).toThrow(/return update failed/);
      expect(origin.raw.prepare('SELECT title FROM sbv_meetings WHERE id = ?').get('meeting-source'))
        .toEqual({ title: 'Lokal überarbeitet' });
      expect(origin.raw.prepare('SELECT status FROM case_handover_exports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'open' });
      origin.raw.exec('DROP TRIGGER reject_return_update');
      origin.raw.exec(`CREATE TRIGGER reject_return_addition BEFORE INSERT ON sbv_meeting_agenda_items
        BEGIN SELECT RAISE(ABORT, 'return addition failed'); END`);
      expect(() => new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', conflictChoice)).toThrow(/return addition failed/);
      expect(origin.raw.prepare('SELECT title FROM sbv_meetings WHERE id = ?').get('meeting-source'))
        .toEqual({ title: 'Lokal überarbeitet' });
      expect(origin.raw.prepare('SELECT count(*) AS count FROM sbv_meeting_agenda_items').get())
        .toEqual({ count: 0 });
      origin.raw.exec('DROP TRIGGER reject_return_addition');
      expect(new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', conflictChoice)).toMatchObject({ acceptedCount: 2, reviewedCount: 1 });
      expect(origin.raw.prepare('SELECT title FROM sbv_meetings WHERE id = ?').get('meeting-source'))
        .toEqual({ title: 'Vertretung hat geändert' });
      expect(origin.raw.prepare('SELECT meeting_id, title FROM sbv_meeting_agenda_items').all())
        .toEqual([{ meeting_id: 'meeting-source', title: 'Neuer TOP' }]);
      expect(origin.raw.prepare('SELECT title FROM sbv_meetings WHERE id = ?').get('meeting-cancel'))
        .toEqual({ title: 'Abzusagende Sitzung' });
      expect(origin.raw.prepare('SELECT status FROM case_handover_exports WHERE package_id = ?').get(handover.packageId))
        .toEqual({ status: 'taken_over' });
      expect(() => new VacationV5ReturnFileService(origin.adapter).importConfirmedFromFile(returnPath,
        'lange Transport-Passphrase', conflictChoice)).toThrow();
      await expect(service.exportToFile({ sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase', capabilities,
        targetPath: path.join(directory, 'second.gsbvtransfer') })).rejects.toThrow();
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('übernimmt bestehende und neue Fallnotizen nur mit gebundener Fallreferenz', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-notes-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-42', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11');
        INSERT INTO case_notes (id, case_id, title, note_date, note_type, content, created_at, updated_at)
        VALUES ('source-note', 'source-case', 'Gespräch', '2026-11-11', 'conversation', 'Ursprung', '2026-11-11', '2026-11-11')`);
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
      const deputyCase = deputy.raw.prepare('SELECT id FROM cases').get() as { id: string };
      deputy.raw.prepare("UPDATE case_notes SET content = 'Geändert' WHERE title = 'Gespräch'").run();
      deputy.raw.prepare(`INSERT INTO case_notes (id, case_id, title, note_date, note_type, content, created_at, updated_at)
        VALUES ('new-note', ?, 'Nachtrag', '2026-11-12', 'conversation', 'Neu', '2026-11-12', '2026-11-12')`)
        .run(deputyCase.id);
      await new VacationV5ReturnFileService(deputy.adapter).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
        additionalItems: [{ kind: 'case_note', localId: 'new-note' }],
      });
      const service = new VacationV5ReturnFileService(origin.adapter);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items).toEqual([
        { ref: 'note_1', kind: 'case_note', decision: 'propose_update' },
        { ref: 'return_case_note_1', kind: 'case_note', decision: 'review_addition' },
      ]);
      const original = listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .find((item) => item.ref === 'note_1');
      const choices = [
        { ref: 'note_1', action: 'accept_update', expectedOriginSha256: original?.currentSha256 ?? null },
        { ref: 'return_case_note_1', action: 'accept_addition', expectedOriginSha256: null },
      ] as const;
      origin.raw.exec(`CREATE TRIGGER reject_return_note BEFORE INSERT ON case_notes
        BEGIN SELECT RAISE(ABORT, 'note insert failed'); END`);
      expect(() => service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choices))
        .toThrow(/note insert failed/);
      expect(origin.raw.prepare('SELECT content FROM case_notes WHERE id = ?').get('source-note'))
        .toEqual({ content: 'Ursprung' });
      origin.raw.exec('DROP TRIGGER reject_return_note');
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choices))
        .toMatchObject({ acceptedCount: 2 });
      expect(origin.raw.prepare('SELECT case_id, title, content FROM case_notes ORDER BY title').all())
        .toEqual([{ case_id: 'source-case', title: 'Gespräch', content: 'Geändert' },
          { case_id: 'source-case', title: 'Nachtrag', content: 'Neu' }]);
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });

  it('übernimmt Maßnahmennotizen und Fallfristen mit ihren ursprünglichen Fall- und Maßnahmebezügen', async () => {
    const origin = database(); const deputy = database();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-v5-return-measure-'));
    const handoverPath = path.join(directory, 'handover.gsbvtransfer');
    const returnPath = path.join(directory, 'return.gsbvtransfer');
    try {
      origin.raw.exec(`INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('source-case', 'SBV-43', 'Einzelfall', 'sonstiges', '2026-11-11', '2026-11-11', '2026-11-11');
        INSERT INTO case_measures (id, case_id, type, title, opened_at, created_at, updated_at)
        VALUES ('source-measure', 'source-case', 'bem', 'BEM', '2026-11-11', '2026-11-11', '2026-11-11');
        INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, content, created_at, updated_at)
        VALUES ('source-measure-note', 'source-case', 'bem', 'source-measure', 'Gespräch', '2026-11-11', 'Ursprung', '2026-11-11', '2026-11-11');
        INSERT INTO deadlines (id, case_id, measure_id, title, due_at, created_at, updated_at)
        VALUES ('source-deadline', 'source-case', 'source-measure', 'Wiedervorlage', '2099-11-22', '2026-11-11', '2026-11-11')`);
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
      const deputyMeasure = deputy.raw.prepare('SELECT id, case_id FROM case_measures').get() as { id: string; case_id: string };
      deputy.raw.prepare("UPDATE case_measures SET title = 'BEM fortgeführt' WHERE id = ?").run(deputyMeasure.id);
      deputy.raw.prepare("UPDATE case_measure_notes SET content = 'Geändert' WHERE title = 'Gespräch'").run();
      deputy.raw.prepare("UPDATE deadlines SET title = 'Neue Frist' WHERE title = 'Wiedervorlage'").run();
      deputy.raw.prepare(`INSERT INTO case_measures (id, case_id, type, title, opened_at, created_at, updated_at)
        VALUES ('new-measure', ?, 'bem', 'Weitere Maßnahme', '2026-11-12', '2026-11-12', '2026-11-12')`)
        .run(deputyMeasure.case_id);
      deputy.raw.prepare(`INSERT INTO case_measure_notes
        (id, case_id, measure_type, measure_id, title, note_at, content, created_at, updated_at)
        VALUES ('new-measure-note', ?, 'bem', ?, 'Nachtrag', '2026-11-12', 'Neu', '2026-11-12', '2026-11-12')`)
        .run(deputyMeasure.case_id, 'new-measure');
      deputy.raw.prepare(`INSERT INTO deadlines (id, case_id, measure_id, title, due_at, created_at, updated_at)
        VALUES ('new-case-deadline', ?, ?, 'Zusatzfrist', '2099-11-23', '2026-11-12', '2026-11-12')`)
        .run(deputyMeasure.case_id, deputyMeasure.id);
      await new VacationV5ReturnFileService(deputy.adapter).exportToFile({
        sourcePackageId: handover.packageId, profileId: originProfile.id,
        expiresAt: '2099-12-01T00:00:00.000Z', passphrase: 'lange Transport-Passphrase',
        capabilities, targetPath: returnPath,
        additionalItems: [{ kind: 'case_measure_note', localId: 'new-measure-note' },
          { kind: 'case_measure', localId: 'new-measure' },
          { kind: 'case_deadline', localId: 'new-case-deadline' }],
      });
      const service = new VacationV5ReturnFileService(origin.adapter);
      expect(service.previewFromFile(returnPath, 'lange Transport-Passphrase').items).toEqual([
        { ref: 'case_deadline_1', kind: 'case_deadline', decision: 'propose_update' },
        { ref: 'measure_1', kind: 'case_measure', decision: 'propose_update' },
        { ref: 'measure_note_1', kind: 'case_measure_note', decision: 'propose_update' },
        { ref: 'return_case_deadline_1', kind: 'case_deadline', decision: 'review_addition' },
        { ref: 'return_case_measure_1', kind: 'case_measure', decision: 'review_addition' },
        { ref: 'return_case_measure_note_1', kind: 'case_measure_note', decision: 'review_addition' },
      ]);
      const originals = new Map(listVacationV5OriginItemChanges(origin.adapter, handover.packageId, '').items
        .map((item) => [item.ref, item.currentSha256]));
      const choices = service.previewFromFile(returnPath, 'lange Transport-Passphrase').items.map((item) => ({
        ref: item.ref, action: item.decision === 'review_addition' ? 'accept_addition' : 'accept_update',
        expectedOriginSha256: originals.get(item.ref) ?? null,
      })) as Array<{ ref: string; action: 'accept_addition' | 'accept_update'; expectedOriginSha256: string | null }>;
      expect(service.importConfirmedFromFile(returnPath, 'lange Transport-Passphrase', choices))
        .toMatchObject({ acceptedCount: 6 });
      expect(origin.raw.prepare('SELECT title, created_from FROM case_measures ORDER BY title').all())
        .toEqual([{ title: 'BEM fortgeführt', created_from: 'manual' },
          { title: 'Weitere Maßnahme', created_from: 'import' }]);
      expect(origin.raw.prepare(`SELECT n.case_id, m.title AS measure_title, n.title, n.content
        FROM case_measure_notes n JOIN case_measures m ON m.id = n.measure_id ORDER BY n.title`).all())
        .toEqual([{ case_id: 'source-case', measure_title: 'BEM fortgeführt', title: 'Gespräch', content: 'Geändert' },
          { case_id: 'source-case', measure_title: 'Weitere Maßnahme', title: 'Nachtrag', content: 'Neu' }]);
      expect(origin.raw.prepare('SELECT case_id, measure_id, title FROM deadlines ORDER BY title').all())
        .toEqual([{ case_id: 'source-case', measure_id: 'source-measure', title: 'Neue Frist' },
          { case_id: 'source-case', measure_id: 'source-measure', title: 'Zusatzfrist' }]);
    } finally { origin.raw.close(); deputy.raw.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
});
