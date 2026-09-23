import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { createMobileCompanionPairingResponse, MobileCompanionService } from '../../../services/mobileCompanionService';
import {
  MOBILE_COMPANION_RETURN_FORMAT,
  MOBILE_COMPANION_RETURN_VERSION,
  MobileCompanionReturnService,
} from '../../../services/mobileCompanionReturnService';
import { encryptTargetBoundTransferPayload } from '../../../services/targetBoundTransferCrypto';
import { authenticateMobileTransfer } from '../../../services/mobileTransferOriginProof';
import { formatTransferRecipientToken } from '../../../services/transferInstanceIdentityPolicy';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import type { MobileCompanionReturnPayload } from '../../../src/domain/models/mobile-companion.model';
import { openTestDatabase } from '../../helpers/openTestDatabase';

async function migratedDatabase() {
  const database = await openTestDatabase();
  new MigrationService(database, 'database/schema.sql', 'database/migrations').migrate();
  return database;
}

function insertCase(database: DatabaseAdapter, caseId = 'case-mobile-return-1') {
  const now = '2026-09-10T09:00:00.000Z';
  const caseSuffix = caseId.replace(/^case-mobile-return-?/u, '') || '1';
  const deadlineId = caseId === 'case-mobile-return-1' ? 'deadline-mobile-return-1' : `deadline-${caseId}`;
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, person_binding_state, created_at, updated_at
    ) VALUES (?, ?, ?, 'beteiligung', 'offen', 'hoch', ?, 0, 0, 'active', ?, ?)
  `).run(caseId, `SBV-2026-MOB-${caseSuffix}`, 'Mobiler Rückgabefall', now, now, now);
  database.prepare(`
    INSERT INTO deadlines (
      id, case_id, deadline_type, process_type, title, due_at, severity, status,
      calculation_mode, is_legal_deadline, is_user_editable, created_at, updated_at
    ) VALUES (?, ?, 'follow_up', 'case', 'Unterlagen nachhalten',
      '2026-09-15T10:00:00.000Z', 'important', 'open', 'manual', 0, 1, ?, ?)
  `).run(deadlineId, caseId, now, now);
}

function encryptedReturnPayload(
  desktop: DatabaseAdapter,
  mobile: DatabaseAdapter,
  payload: Omit<MobileCompanionReturnPayload, 'protocolVersion' | 'schemaVersion' | 'packageId' | 'sourceInstanceId' | 'targetInstanceId' | 'createdAt'> & { packageId?: string; sourceInstanceId?: string },
): string {
  const desktopIdentity = new TransferInstanceIdentityService(desktop).getPublicIdentity();
  const mobileIdentity = new TransferInstanceIdentityService(mobile).getPublicIdentity();
  const packageId = payload.packageId ?? `mobile_return_${randomUUID()}`;
  const envelope = encryptTargetBoundTransferPayload({
    format: MOBILE_COMPANION_RETURN_FORMAT,
    version: MOBILE_COMPANION_RETURN_VERSION,
    packageId,
    createdAt: '2026-09-10T10:00:00.000Z',
    payloadText: JSON.stringify({
      protocolVersion: '1.0',
      schemaVersion: 1,
      packageId,
      sourceInstanceId: payload.sourceInstanceId ?? mobileIdentity.instanceId,
      targetInstanceId: desktopIdentity.instanceId,
      sourceSnapshotPackageId: payload.sourceSnapshotPackageId,
      createdAt: '2026-09-10T10:00:00.000Z',
      changes: payload.changes,
    } satisfies MobileCompanionReturnPayload),
    passphrase: '',
    recipient: desktopIdentity,
    protectionMode: 'recipient_key_only',
  });
  return JSON.stringify(authenticateMobileTransfer(envelope,
    new TransferInstanceIdentityService(mobile).getPrivateIdentity(), desktopIdentity.publicKeyPem, 'return'));
}

describe('Mobile Begleit-App Rückgabe', () => {
  it('bindet den Ausgangs-Snapshot an den Kopplungsschlüssel statt nur an die fünfstellige ID', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    const other = await migratedDatabase();
    try {
      insertCase(desktop);
      const companion = new MobileCompanionService(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = companion.createSnapshot({ deviceId: device.id, caseIds: ['case-mobile-return-1'] });
      const payload = { sourceSnapshotPackageId: snapshot.packageId, sourceInstanceId: device.instanceId,
        changes: [{ type: 'create_note' as const, mobileId: 'origin-bound', caseId: 'case-mobile-return-1',
          changedAt: new Date().toISOString(), title: 'Nachweis', content: 'Nur vom ursprünglichen Gerät übernehmen.' }] };
      const service = new MobileCompanionReturnService(desktop);
      const original = encryptedReturnPayload(desktop, mobile, payload);
      expect(service.inspectEnvelopeText(original).canImport).toBe(true);
      const metadata = desktop.prepare<{ metadata_json: string }>('SELECT metadata_json FROM case_handover_exports WHERE package_id = ?').get(snapshot.packageId)!.metadata_json;
      desktop.prepare("UPDATE case_handover_exports SET metadata_json = '{}' WHERE package_id = ?").run(snapshot.packageId);
      expect(service.inspectEnvelopeText(original).canImport).toBe(true); // eindeutig zuordenbarer Altbestand
      pairMobileDevice(desktop, other, 'Zweites Gerät', device.instanceId);
      expect(service.inspectEnvelopeText(original).canImport).toBe(false); // mehrdeutiger Altbestand
      desktop.prepare('UPDATE case_handover_exports SET metadata_json = ? WHERE package_id = ?').run(metadata, snapshot.packageId);
      expect(service.inspectEnvelopeText(original).canImport).toBe(true);
      const substituted = encryptedReturnPayload(desktop, other, payload);
      expect(service.inspectEnvelopeText(substituted).canImport).toBe(false);
      await expect(service.importEnvelopeText(substituted)).rejects.toThrow(/Importplan/);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes').get()?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
      other.close();
    }
  });

  it.each(['widerrufene Kopplung', 'abweichende Quellinstanz'])('weist %s auch beim tatsächlichen Import zurück', async (reason) => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const companion = new MobileCompanionService(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = companion.createSnapshot({ deviceId: device.id, caseIds: ['case-mobile-return-1'] });
      const envelope = encryptedReturnPayload(desktop, mobile, {
        sourceSnapshotPackageId: snapshot.packageId,
        sourceInstanceId: reason === 'abweichende Quellinstanz' ? `${device.instanceId}-other` : undefined,
        changes: [{ type: 'create_note', mobileId: 'rejected-note', caseId: 'case-mobile-return-1',
          changedAt: new Date().toISOString(), title: 'Rückgabe', content: 'Nicht übernehmen.' }],
      });
      const service = new MobileCompanionReturnService(desktop);
      if (reason === 'widerrufene Kopplung') {
        expect(service.inspectEnvelopeText(envelope).canImport).toBe(true);
        companion.setDeviceStatus(device.id, 'disabled');
      }
      expect(() => service.inspectEnvelopeText(envelope)).toThrow(/Herkunftsnachweis/);
      await expect(service.importEnvelopeText(envelope)).rejects.toThrow(/Herkunftsnachweis/);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes').get()?.count).toBe(0);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_handover_imports').get()?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('weist ein nur an den Desktop verschlüsseltes Paket ohne Absendernachweis vor jeder Änderung zurück', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({ deviceId: device.id, caseIds: ['case-mobile-return-1'] });
      const unsigned = JSON.parse(encryptedReturnPayload(desktop, mobile, {
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [{ type: 'create_note', mobileId: 'forged-note', caseId: 'case-mobile-return-1',
          changedAt: new Date().toISOString(), title: 'Behaupteter Absender', content: 'Darf nicht importiert werden.' }],
      }));
      delete unsigned.senderProof;
      const service = new MobileCompanionReturnService(desktop);
      expect(() => service.inspectEnvelopeText(JSON.stringify(unsigned))).toThrow(/Herkunftsnachweis/);
      await expect(service.importEnvelopeText(JSON.stringify(unsigned))).rejects.toThrow(/Herkunftsnachweis/);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes').get()?.count).toBe(0);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_handover_imports').get()?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  function pairMobileDevice(desktop: DatabaseAdapter, mobile: DatabaseAdapter, label = 'Tablet SBV', instanceId?: string) {
    const service = new MobileCompanionService(desktop);
    const request = service.createPairingRequest();
    const mobileIdentity = new TransferInstanceIdentityService(mobile).getPublicIdentity();
    const response = createMobileCompanionPairingResponse(
      request.pairingRequest,
      instanceId ? formatTransferRecipientToken({ ...mobileIdentity, instanceId }) : mobileIdentity.recipientToken,
    );
    return service.saveDevice({
      label,
      pairingResponse: response.pairingResponse,
      securityCode: response.securityCode,
    });
  }

  it('übernimmt mobile Notizen und Friständerungen erst nach konfliktfreiem Importplan', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({
        deviceId: device.id,
        caseIds: ['case-mobile-return-1'],
        uiThemeMode: 'dark',
      });
      const packageId = 'mobile_return_safe';
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId,
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [
          {
            type: 'create_note',
            mobileId: 'mobile-note-1',
            caseId: 'case-mobile-return-1',
            changedAt: '2026-09-10T10:15:00.000Z',
            title: 'Besprechung mit Arbeitgeber',
            content: 'Arbeitgeber sagt Nachteilsausgleich bis Freitag zu.',
            noteType: 'interne_notiz',
            nextSteps: 'Freitag nachhalten',
            containsHealthData: true,
          },
          {
            type: 'create_deadline',
            mobileId: 'mobile-deadline-1',
            caseId: 'case-mobile-return-1',
            changedAt: '2026-09-10T10:16:00.000Z',
            title: 'Zusage Arbeitgeber prüfen',
            dueAt: '2026-09-18T10:00:00.000Z',
            severity: 'important',
          },
          {
            type: 'complete_deadline',
            mobileId: 'mobile-complete-1',
            deadlineId: 'deadline-mobile-return-1',
            changedAt: '2026-09-10T10:17:00.000Z',
            baseUpdatedAt: '2026-09-10T09:00:00.000Z',
            completedNote: 'Unterlagen wurden in der Besprechung vorgelegt.',
          },
        ],
      });
      const service = new MobileCompanionReturnService(desktop);
      const inspection = service.inspectEnvelopeText(envelope);

      expect(inspection).toMatchObject({
        packageId,
        canImport: true,
        noteCount: 1,
        inboxCount: 0,
        deadlineCount: 1,
        completedDeadlineCount: 1,
        conflictCount: 0,
        rejectedCount: 0,
      });

      const imported = await service.importEnvelopeText(envelope);

      expect(imported).toMatchObject({
        imported: true,
        packageId,
        createdNoteCount: 1,
        createdInboxCount: 0,
        createdDeadlineCount: 1,
        completedDeadlineCount: 1,
      });
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes WHERE case_id = ?').get('case-mobile-return-1')?.count).toBe(1);
      expect(desktop.prepare<{ note_type: string; next_steps: string }>('SELECT note_type, next_steps FROM case_notes WHERE case_id = ?').get('case-mobile-return-1')).toMatchObject({
        note_type: 'interne_notiz',
        next_steps: 'Freitag nachhalten',
      });
      expect(desktop.prepare<{ status: string }>('SELECT status FROM deadlines WHERE id = ?').get('deadline-mobile-return-1')?.status).toBe('done');
      expect(desktop.prepare<{ count: number }>("SELECT COUNT(*) AS count FROM privacy_review_items WHERE case_id = ? AND reason = 'handover_imported'").get('case-mobile-return-1')?.count).toBe(1);
      const auditRows = desktop.prepare<{ metadata_json: string }>(
        "SELECT metadata_json FROM personal_data_audit_log WHERE subject_type IN ('mobile_companion_transfer', 'case_handover')",
      ).all();
      const auditMetadata = JSON.stringify(auditRows);
      expect(auditMetadata).toContain(packageId);
      expect(auditMetadata).not.toMatch(/Nachteilsausgleich|Arbeitgeber sagt|Unterlagen wurden/i);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('übernimmt dieselbe mobile Änderung desselben Geräts auch aus einem neuen Paket nur einmal', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({ deviceId: device.id, caseIds: ['case-mobile-return-1'] });
      const repeatedNote = {
        type: 'create_note' as const,
        mobileId: 'stable-mobile-note-id',
        caseId: 'case-mobile-return-1',
        changedAt: '2026-09-10T10:15:00.000Z',
        title: 'Nur einmal übernehmen',
        content: 'Dieser Entwurf bleibt bis zur Desktop-Bestätigung auf dem Gerät.',
      };
      const service = new MobileCompanionReturnService(desktop);
      await service.importEnvelopeText(encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_first_package', sourceSnapshotPackageId: snapshot.packageId, changes: [repeatedNote],
      }));
      const secondEnvelope = encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_second_package',
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [repeatedNote, {
          type: 'create_inbox', mobileId: 'new-mobile-inbox-id', changedAt: '2026-09-10T10:20:00.000Z',
          title: 'Neue Änderung', content: 'Diese Änderung soll zusätzlich übernommen werden.',
        }],
      });

      const inspection = service.inspectEnvelopeText(secondEnvelope);
      expect(inspection).toMatchObject({ canImport: true, applyCount: 1, alreadyDoneCount: 1 });
      expect(inspection.plan).toEqual(expect.arrayContaining([
        expect.objectContaining({ mobileId: repeatedNote.mobileId, disposition: 'already_done', reason: 'mobile_change_already_imported' }),
        expect.objectContaining({ mobileId: 'new-mobile-inbox-id', disposition: 'apply' }),
      ]));
      const result = await service.importEnvelopeText(secondEnvelope);
      expect(result).toMatchObject({ createdNoteCount: 0, createdInboxCount: 1 });
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes').get()?.count).toBe(1);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM mobile_companion_change_imports').get()?.count).toBe(2);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('weist doppelte mobile Änderungskennungen innerhalb eines Pakets ohne Schreiboperation zurück', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({ deviceId: device.id, caseIds: ['case-mobile-return-1'] });
      const duplicate = {
        type: 'create_note' as const, mobileId: 'duplicate-mobile-id', caseId: 'case-mobile-return-1',
        changedAt: '2026-09-10T10:15:00.000Z', title: 'Doppelt', content: 'Nicht übernehmen.',
      };
      const envelope = encryptedReturnPayload(desktop, mobile, {
        sourceSnapshotPackageId: snapshot.packageId, changes: [duplicate, { ...duplicate, title: 'Noch einmal' }],
      });
      const service = new MobileCompanionReturnService(desktop);
      expect(() => service.inspectEnvelopeText(envelope)).toThrow(/Änderungs-ID mehrfach/);
      await expect(service.importEnvelopeText(envelope)).rejects.toThrow(/Änderungs-ID mehrfach/);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes').get()?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('übernimmt fallfreie mobile Inbox-Einträge als Tätigkeitsjournal ohne Fallbezug', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({
        deviceId: device.id,
        caseIds: ['case-mobile-return-1'],
        uiThemeMode: 'dark',
      });
      const packageId = 'mobile_return_inbox';
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId,
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [{
          type: 'create_inbox',
          mobileId: 'mobile-inbox-1',
          changedAt: '2026-09-10T10:20:00.000Z',
          title: 'Spontanes Gespräch',
          content: 'Beschäftigte Person bittet um vertrauliche Rückmeldung zur Versetzung.',
          nextSteps: 'Fallbezug am Desktop prüfen',
          containsHealthData: true,
        }],
      });
      const service = new MobileCompanionReturnService(desktop);

      const inspection = service.inspectEnvelopeText(envelope);

      expect(inspection).toMatchObject({
        packageId,
        canImport: true,
        noteCount: 0,
        inboxCount: 1,
        deadlineCount: 0,
        completedDeadlineCount: 0,
      });
      expect(inspection.plan).toEqual([
        expect.objectContaining({
          type: 'create_inbox',
          disposition: 'apply',
        }),
      ]);
      expect(inspection.plan[0]).not.toHaveProperty('caseId');

      const imported = await service.importEnvelopeText(envelope);

      expect(imported).toMatchObject({
        imported: true,
        packageId,
        createdNoteCount: 0,
        createdInboxCount: 1,
        createdDeadlineCount: 0,
        completedDeadlineCount: 0,
        updatedCaseIds: [],
        privacyReviewCaseIds: [],
      });
      const entry = desktop.prepare<{
        id: string;
        title: string;
        description: string;
        result_note: string;
        confidentiality_level: string;
        created_from: string;
      }>('SELECT id, title, description, result_note, confidentiality_level, created_from FROM activity_journal_entries').get();
      expect(entry).toMatchObject({
        title: 'Spontanes Gespräch',
        description: 'Beschäftigte Person bittet um vertrauliche Rückmeldung zur Versetzung.',
        result_note: 'Fallbezug am Desktop prüfen',
        confidentiality_level: 'highly_confidential',
        created_from: 'import',
      });
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_links WHERE entry_id = ?').get(entry?.id)?.count).toBe(0);
      const auditRows = desktop.prepare<{ metadata_json: string | null }>(
        "SELECT metadata_json FROM personal_data_audit_log WHERE subject_type IN ('mobile_companion_transfer', 'case_handover', 'activity_journal')",
      ).all();
      const auditMetadata = JSON.stringify(auditRows);
      expect(auditMetadata).toContain(packageId);
      expect(auditMetadata).not.toMatch(/Spontanes Gespräch|Versetzung|Fallbezug am Desktop/i);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('blockiert die Rückgabe, wenn die Desktop-Frist seit dem Snapshot verändert wurde', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = new MobileCompanionService(desktop).createSnapshot({
        deviceId: device.id,
        caseIds: ['case-mobile-return-1'],
        uiThemeMode: 'dark',
      });
      desktop.prepare("UPDATE deadlines SET updated_at = '2026-09-10T09:30:00.000Z' WHERE id = 'deadline-mobile-return-1'").run();
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_conflict',
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [{
          type: 'complete_deadline',
          mobileId: 'mobile-complete-conflict',
          deadlineId: 'deadline-mobile-return-1',
          changedAt: '2026-09-10T10:17:00.000Z',
          baseUpdatedAt: '2026-09-10T09:00:00.000Z',
        }],
      });
      const service = new MobileCompanionReturnService(desktop);

      const inspection = service.inspectEnvelopeText(envelope);

      expect(inspection.canImport).toBe(false);
      expect(inspection.conflictCount).toBe(1);
      await expect(service.importEnvelopeText(envelope)).rejects.toThrow(/Konflikte/i);
      expect(desktop.prepare<{ status: string }>('SELECT status FROM deadlines WHERE id = ?').get('deadline-mobile-return-1')?.status).toBe('open');
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('weist Rückgaben ohne bekannten Desktop-Snapshot vor Schreiboperationen zurück', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      pairMobileDevice(desktop, mobile);
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_unknown_snapshot',
        sourceSnapshotPackageId: 'mobile_snapshot_missing',
        changes: [{
          type: 'create_note',
          mobileId: 'mobile-note-unknown-snapshot',
          caseId: 'case-mobile-return-1',
          changedAt: '2026-09-10T10:15:00.000Z',
          title: 'Besprechung',
          content: 'Wird nicht geschrieben.',
        }],
      });
      const service = new MobileCompanionReturnService(desktop);

      const inspection = service.inspectEnvelopeText(envelope);

      expect(inspection.canImport).toBe(false);
      expect(inspection.rejectedCount).toBeGreaterThan(0);
      await expect(service.importEnvelopeText(envelope)).rejects.toThrow(/Importplan/i);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes WHERE case_id = ?').get('case-mobile-return-1')?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('blockiert mobile Änderungen, die nicht im Ausgangs-Snapshot enthalten waren', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop, 'case-mobile-return-allowed');
      insertCase(desktop, 'case-mobile-return-outside');
      const mobileService = new MobileCompanionService(desktop);
      const device = pairMobileDevice(desktop, mobile);
      const snapshot = mobileService.createSnapshot({
        deviceId: device.id,
        caseIds: ['case-mobile-return-allowed'],
        uiThemeMode: 'dark',
      });
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_outside_scope',
        sourceSnapshotPackageId: snapshot.packageId,
        changes: [{
          type: 'create_note',
          mobileId: 'mobile-note-outside-scope',
          caseId: 'case-mobile-return-outside',
          changedAt: '2026-09-10T10:15:00.000Z',
          title: 'Nicht im Snapshot',
          content: 'Wird nicht geschrieben.',
        }],
      });
      const service = new MobileCompanionReturnService(desktop);

      const inspection = service.inspectEnvelopeText(envelope);

      expect(inspection.canImport).toBe(false);
      expect(inspection.rejectedCount).toBeGreaterThan(0);
      await expect(service.importEnvelopeText(envelope)).rejects.toThrow(/Importplan/i);
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes WHERE case_id = ?').get('case-mobile-return-outside')?.count).toBe(0);
    } finally {
      desktop.close();
      mobile.close();
    }
  });
});
