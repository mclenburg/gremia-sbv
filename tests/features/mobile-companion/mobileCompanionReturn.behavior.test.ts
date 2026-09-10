import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { MobileCompanionService } from '../../../services/mobileCompanionService';
import {
  MOBILE_COMPANION_RETURN_FORMAT,
  MOBILE_COMPANION_RETURN_VERSION,
  MobileCompanionReturnService,
} from '../../../services/mobileCompanionReturnService';
import { encryptTargetBoundTransferPayload } from '../../../services/targetBoundTransferCrypto';
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
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      is_pseudonymized, is_locked, person_binding_state, created_at, updated_at
    ) VALUES (?, ?, ?, 'beteiligung', 'offen', 'hoch', ?, 0, 0, 'active', ?, ?)
  `).run(caseId, 'SBV-2026-MOB-R', 'Mobiler Rückgabefall', now, now, now);
  database.prepare(`
    INSERT INTO deadlines (
      id, case_id, deadline_type, process_type, title, due_at, severity, status,
      calculation_mode, is_legal_deadline, is_user_editable, created_at, updated_at
    ) VALUES ('deadline-mobile-return-1', ?, 'follow_up', 'case', 'Unterlagen nachhalten',
      '2026-09-15T10:00:00.000Z', 'important', 'open', 'manual', 0, 1, ?, ?)
  `).run(caseId, now, now);
}

function encryptedReturnPayload(
  desktop: DatabaseAdapter,
  mobile: DatabaseAdapter,
  payload: Omit<MobileCompanionReturnPayload, 'protocolVersion' | 'schemaVersion' | 'packageId' | 'sourceInstanceId' | 'targetInstanceId' | 'createdAt'> & { packageId?: string },
): string {
  const desktopIdentity = new TransferInstanceIdentityService(desktop).getPublicIdentity();
  const mobileIdentity = new TransferInstanceIdentityService(mobile).getPublicIdentity();
  const packageId = payload.packageId ?? `mobile_return_${randomUUID()}`;
  return JSON.stringify(encryptTargetBoundTransferPayload({
    format: MOBILE_COMPANION_RETURN_FORMAT,
    version: MOBILE_COMPANION_RETURN_VERSION,
    packageId,
    createdAt: '2026-09-10T10:00:00.000Z',
    payloadText: JSON.stringify({
      protocolVersion: '1.0',
      schemaVersion: 1,
      packageId,
      sourceInstanceId: mobileIdentity.instanceId,
      targetInstanceId: desktopIdentity.instanceId,
      sourceSnapshotPackageId: payload.sourceSnapshotPackageId,
      createdAt: '2026-09-10T10:00:00.000Z',
      changes: payload.changes,
    } satisfies MobileCompanionReturnPayload),
    passphrase: '',
    recipient: desktopIdentity,
    protectionMode: 'recipient_key_only',
  }));
}

describe('Mobile Begleit-App Rückgabe', () => {
  it('übernimmt mobile Notizen und Friständerungen erst nach konfliktfreiem Importplan', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      new MobileCompanionService(desktop).saveDevice({
        label: 'Tablet SBV',
        recipientToken: new TransferInstanceIdentityService(mobile).getPublicIdentity().recipientToken,
      });
      const packageId = 'mobile_return_safe';
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId,
        changes: [
          {
            type: 'create_note',
            mobileId: 'mobile-note-1',
            caseId: 'case-mobile-return-1',
            changedAt: '2026-09-10T10:15:00.000Z',
            title: 'Besprechung mit Arbeitgeber',
            content: 'Arbeitgeber sagt Nachteilsausgleich bis Freitag zu.',
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
        createdDeadlineCount: 1,
        completedDeadlineCount: 1,
      });
      expect(desktop.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_notes WHERE case_id = ?').get('case-mobile-return-1')?.count).toBe(1);
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

  it('blockiert die Rückgabe, wenn die Desktop-Frist seit dem Snapshot verändert wurde', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCase(desktop);
      new MobileCompanionService(desktop).saveDevice({
        label: 'Tablet SBV',
        recipientToken: new TransferInstanceIdentityService(mobile).getPublicIdentity().recipientToken,
      });
      desktop.prepare("UPDATE deadlines SET updated_at = '2026-09-10T09:30:00.000Z' WHERE id = 'deadline-mobile-return-1'").run();
      const envelope = encryptedReturnPayload(desktop, mobile, {
        packageId: 'mobile_return_conflict',
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
});
