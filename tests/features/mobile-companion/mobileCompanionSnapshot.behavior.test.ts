import { randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import {
  createMobileCompanionQrFrames,
  decodeMobileCompanionSnapshotPayload,
  MOBILE_COMPANION_SNAPSHOT_FORMAT,
  MOBILE_COMPANION_SNAPSHOT_VERSION,
  MobileCompanionService,
} from '../../../services/mobileCompanionService';
import { decryptTargetBoundTransferPayload, sha256 } from '../../../services/targetBoundTransferCrypto';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

async function migratedDatabase() {
  const database = await openTestDatabase();
  new MigrationService(database, 'database/schema.sql', 'database/migrations').migrate();
  return database;
}

function insertCaseWithSensitiveAdjacentData(database: Awaited<ReturnType<typeof migratedDatabase>>) {
  const now = '2026-09-10T08:00:00.000Z';
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      summary, is_pseudonymized, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).run(
    'case-mobile-1',
    'SBV-2026-MOB-1',
    'Mobiler Kontextfall',
    'beteiligung',
    'offen',
    'hoch',
    now,
    'Diese Fallzusammenfassung darf nicht in den Mobile-MVP-Snapshot.',
    now,
    now,
  );
  database.prepare(`
    INSERT INTO deadlines (
      id, case_id, deadline_type, process_type, title, confidential_title, description,
      due_at, reminder_at, legal_basis, severity, status, calculation_mode,
      is_legal_deadline, is_user_editable, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'deadline-mobile-1',
    'case-mobile-1',
    'legal_deadline',
    'case',
    'Stellungnahmefrist',
    'Vertrauliche Beteiligungsfrist',
    'Diese Fristbeschreibung bleibt auf dem Desktop.',
    '2026-09-12T10:00:00.000Z',
    '2026-09-11T10:00:00.000Z',
    '§ 178 Abs. 2 SGB IX',
    'critical',
    'open',
    'manual',
    1,
    1,
    now,
    now,
  );
  database.prepare(`
    INSERT INTO case_notes (
      id, case_id, title, note_date, note_type, content, contains_health_data,
      confidential_level, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    'note-mobile-1',
    'case-mobile-1',
    'Geheime Gesprächsnotiz',
    now,
    'sonstiges',
    'Gesundheitsbezogener Inhalt bleibt sicher im Desktop-Vault.',
    'sensibel',
    now,
    now,
  );
  database.prepare(`
    INSERT INTO case_documents (
      id, case_id, filename, display_title, storage_path, sha256,
      contains_health_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    'doc-mobile-1',
    'case-mobile-1',
    'arztbericht.pdf',
    'Ärztlicher Bericht',
    'documents/case-mobile-1/doc.gsbvdoc',
    'a'.repeat(64),
    now,
  );
}

function decodeQrFrame(frame: string) {
  const encoded = frame.replace('gsbvmobile://v1/', '');
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
    transferSessionId: string;
    encryptionMode: string;
    packageId: string;
    frameIndex: number;
    frameCount: number;
    payloadLength: number;
    chunkChecksum: string;
    packageSha256: string;
    payload: string;
  };
}

describe('Mobile Begleit-App Snapshot', () => {
  it('exportiert eine reduzierte, zielgebundene Mobile-Projektion ohne Notizen oder Dokumentinhalte', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      insertCaseWithSensitiveAdjacentData(desktop);
      const mobileIdentity = new TransferInstanceIdentityService(mobile);
      const mobileService = new MobileCompanionService(desktop);
      const device = mobileService.saveDevice({
        label: 'Diensthandy SBV',
        recipientToken: mobileIdentity.getPublicIdentity().recipientToken,
      });

      const exported = mobileService.createSnapshot({
        deviceId: device.id,
        caseIds: ['case-mobile-1'],
        uiThemeMode: 'dark',
      });

      expect(exported).toMatchObject({
        targetInstanceId: mobileIdentity.getPublicIdentity().instanceId,
        caseCount: 1,
        deadlineCount: 1,
      });
      expect(exported.qrFrames.length).toBeGreaterThan(0);
      expect(exported.qrFrames.every((frame) => frame.startsWith('gsbvmobile://v1/'))).toBe(true);
      const decodedFrames = exported.qrFrames.map(decodeQrFrame);
      expect(new Set(decodedFrames.map((frame) => frame.transferSessionId))).toHaveLength(1);
      expect(decodedFrames.every((frame) => frame.encryptionMode === 'recipient_key_only')).toBe(true);
      expect(decodedFrames.map((frame) => frame.frameIndex)).toEqual(decodedFrames.map((_, index) => index));
      expect(decodedFrames.every((frame) => frame.frameCount === decodedFrames.length)).toBe(true);
      expect(decodedFrames.every((frame) => frame.payloadLength === Buffer.byteLength(frame.payload, 'utf8'))).toBe(true);
      expect(decodedFrames.every((frame) => frame.chunkChecksum === sha256(frame.payload))).toBe(true);

      const envelope = JSON.parse(exported.serializedEnvelope);
      expect(envelope).toMatchObject({
        format: MOBILE_COMPANION_SNAPSHOT_FORMAT,
        version: MOBILE_COMPANION_SNAPSHOT_VERSION,
        recipientBinding: {
          targetInstanceId: mobileIdentity.getPublicIdentity().instanceId,
        },
        crypto: {
          kdf: 'hkdf-sha256',
        },
      });

      const decrypted = decryptTargetBoundTransferPayload(envelope, '', mobileIdentity.getPrivateIdentity(), {
        format: MOBILE_COMPANION_SNAPSHOT_FORMAT,
        version: MOBILE_COMPANION_SNAPSHOT_VERSION,
      });
      const payload = decodeMobileCompanionSnapshotPayload(decrypted.payloadText);
      expect(payload.uiPreferences.themeMode).toBe('dark');
      expect(payload.cases).toEqual([
        expect.objectContaining({
          id: 'case-mobile-1',
          caseNumber: 'SBV-2026-MOB-1',
          displayName: 'Mobiler Kontextfall',
        }),
      ]);
      expect(payload.deadlines).toEqual([
        expect.objectContaining({
          id: 'deadline-mobile-1',
          caseId: 'case-mobile-1',
          title: 'Stellungnahmefrist',
          legalBasis: '§ 178 Abs. 2 SGB IX',
          severity: 'critical',
        }),
      ]);

      const serializedPayload = JSON.stringify(payload);
      expect(serializedPayload).not.toContain('Geheime Gesprächsnotiz');
      expect(serializedPayload).not.toContain('Gesundheitsbezogener Inhalt');
      expect(serializedPayload).not.toContain('arztbericht.pdf');
      expect(serializedPayload).not.toContain('Fallzusammenfassung');

      const audit = desktop.prepare<{ metadata_json: string }>(
        "SELECT metadata_json FROM personal_data_audit_log WHERE subject_type = 'mobile_companion_transfer' ORDER BY sequence DESC LIMIT 1",
      ).get();
      expect(audit).toBeTruthy();
      expect(audit?.metadata_json).toContain('"caseCount":1');
      expect(audit?.metadata_json).toContain('"deadlineCount":1');
      expect(audit?.metadata_json).not.toMatch(/Mobiler Kontextfall|Stellungnahmefrist|Geheime Gesprächsnotiz|arztbericht/i);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('weist zu große interne Payloads vor dem QR-Framing kontrolliert ab', async () => {
    const database = await migratedDatabase();
    try {
      const hugeText = Buffer.concat([
        deflateSync(JSON.stringify({ id: randomUUID(), content: 'x'.repeat(1_200_000) })),
      ]).toString('base64');
      expect(() => decodeMobileCompanionSnapshotPayload(JSON.stringify({
        protocolVersion: '1.0',
        schemaVersion: 1,
        payloadCompression: 'deflate',
        payloadBase64: hugeText,
      }))).toThrow(/zu groß/i);
    } finally {
      database.close();
    }
  });

  it('überträgt nur aktive Arbeitsfälle in die mobile Besprechungsprojektion', async () => {
    const desktop = await migratedDatabase();
    const mobile = await migratedDatabase();
    try {
      const now = '2026-09-10T08:00:00.000Z';
      desktop.prepare(`
        INSERT INTO cases (
          id, case_number, display_name, category, status, priority, opened_at,
          is_pseudonymized, is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, 'beteiligung', ?, 'normal', ?, 0, 0, ?, ?)
      `).run('case-closed-mobile', 'SBV-2026-CLOSED', 'Abgeschlossener Fall', 'abgeschlossen', now, now, now);
      desktop.prepare(`
        INSERT INTO cases (
          id, case_number, display_name, category, status, priority, opened_at,
          is_pseudonymized, is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, 'beteiligung', 'offen', 'normal', ?, 0, 0, ?, ?)
      `).run('case-done-measure-mobile', 'SBV-2026-DONE', 'Nur erledigte Maßnahme', now, now, now);
      desktop.prepare(`
        INSERT INTO cases (
          id, case_number, display_name, category, status, priority, opened_at,
          is_pseudonymized, is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, 'beteiligung', 'offen', 'normal', ?, 0, 0, ?, ?)
      `).run('case-legacy-open-mobile', 'SBV-2026-LEGACY', 'Offene Alt-Beteiligung', now, now, now);
      desktop.prepare(`
        INSERT INTO case_measures (
          id, case_id, type, title, status, risk_level, created_from,
          opened_at, closed_at, created_at, updated_at
        ) VALUES ('measure-done-mobile', 'case-done-measure-mobile', 'sbv_participation',
          'Erledigte Maßnahme', 'completed', 'normal', 'manual', ?, ?, ?, ?)
      `).run(now, now, now, now);
      desktop.prepare(`
        INSERT INTO case_measures (
          id, case_id, type, title, status, risk_level, created_from,
          opened_at, created_at, updated_at
        ) VALUES ('measure-legacy-open-mobile', 'case-legacy-open-mobile', 'sbv_participation',
          'Offene Alt-Maßnahme', 'neu', 'normal', 'manual', ?, ?, ?)
      `).run(now, now, now);
      const mobileService = new MobileCompanionService(desktop);
      const device = mobileService.saveDevice({
        label: 'Diensthandy SBV',
        recipientToken: new TransferInstanceIdentityService(mobile).getPublicIdentity().recipientToken,
      });

      expect(() => mobileService.createSnapshot({
        deviceId: device.id,
        caseIds: ['case-closed-mobile'],
        uiThemeMode: 'dark',
      })).toThrow(/nicht gefunden/i);
      expect(() => mobileService.createSnapshot({
        deviceId: device.id,
        caseIds: ['case-done-measure-mobile'],
        uiThemeMode: 'dark',
      })).toThrow(/nicht gefunden/i);
      const exported = mobileService.createSnapshot({
        deviceId: device.id,
        caseIds: ['case-legacy-open-mobile'],
        uiThemeMode: 'dark',
      });
      expect(exported.caseCount).toBe(1);
    } finally {
      desktop.close();
      mobile.close();
    }
  });

  it('erzeugt selbstprüfbare QR-Frames mit gemeinsamer Sitzung und vollständiger Reihenfolge', () => {
    const frames = createMobileCompanionQrFrames('abcdefghijklmnopqrstuvwxyz'.repeat(120), 'mobile-test-package', 'qr-session-test');
    const decoded = frames.map(decodeQrFrame);

    expect(decoded.length).toBeGreaterThan(1);
    expect(decoded.every((frame) => frame.transferSessionId === 'qr-session-test')).toBe(true);
    expect(decoded.every((frame) => frame.packageId === 'mobile-test-package')).toBe(true);
    expect(decoded.map((frame) => frame.frameIndex)).toEqual(decoded.map((_, index) => index));
    expect(decoded.map((frame) => frame.payload).join('')).toBe('abcdefghijklmnopqrstuvwxyz'.repeat(120));
  });
});
