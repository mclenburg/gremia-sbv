import { randomUUID } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { TransferInstanceIdentityService } from './transferInstanceIdentityService.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import {
  encryptTargetBoundTransferPayload,
  sha256,
  type TargetBoundTransferEnvelope,
} from './targetBoundTransferCrypto.js';
import type {
  MobileCompanionCaseProjection,
  MobileCompanionDeadlineProjection,
  MobileCompanionDevice,
  MobileCompanionDeviceStatus,
  MobileCompanionQrFrame,
  MobileCompanionSnapshotInput,
  MobileCompanionSnapshotPayload,
  MobileCompanionSnapshotResult,
  SaveMobileCompanionDeviceInput,
} from '../src/domain/models/mobile-companion.model.js';

export const MOBILE_COMPANION_SNAPSHOT_FORMAT = 'gremia-sbv-mobile-snapshot';
export const MOBILE_COMPANION_SNAPSHOT_VERSION = 1;
export const MOBILE_COMPANION_PROTOCOL_VERSION = '1.0' as const;

const MAX_MOBILE_SNAPSHOT_BYTES = 1_000_000;
const MAX_MOBILE_QR_FRAME_PAYLOAD_CHARS = 900;
const MAX_MOBILE_QR_FRAMES = 300;

type MobileCompanionDeviceRow = {
  id: string;
  label: string;
  instance_id: string;
  key_fingerprint: string;
  recipient_token: string;
  status: MobileCompanionDeviceStatus;
  created_at: string;
  updated_at: string;
  last_snapshot_at: string | null;
};

type CaseRow = {
  id: string;
  case_number: string;
  display_name: string;
  category: string;
  status: string;
  priority: string;
  opened_at: string | null;
  updated_at: string;
};

type DeadlineRow = {
  id: string;
  case_id: string;
  deadline_type: string;
  title: string;
  confidential_title: string | null;
  due_at: string;
  reminder_at: string | null;
  legal_basis: string | null;
  severity: string;
  status: string;
  is_legal_deadline: number;
  updated_at: string;
};

type AuditSequenceRow = { sequence: number | string | null };

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Bitte eine Bezeichnung für das Mobilgerät angeben.');
  if (label.length > 120) throw new Error('Die Bezeichnung des Mobilgeräts darf höchstens 120 Zeichen enthalten.');
  if (/\p{Cc}/u.test(label)) throw new Error('Die Bezeichnung des Mobilgeräts enthält unzulässige Steuerzeichen.');
  return label;
}

function assertDeviceStatus(value: string): asserts value is MobileCompanionDeviceStatus {
  if (value !== 'active' && value !== 'disabled') throw new Error('Ungültiger Mobilgeräte-Status.');
}

function uniqueIds(ids: readonly string[], label: string): string[] {
  const cleanIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (!cleanIds.length) throw new Error(`Bitte mindestens ${label} auswählen.`);
  if (cleanIds.length > 500) throw new Error(`Es können höchstens 500 ${label} in einem Mobile-Snapshot übertragen werden.`);
  return cleanIds;
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function mapDevice(row: MobileCompanionDeviceRow): MobileCompanionDevice {
  return {
    id: row.id,
    label: row.label,
    instanceId: row.instance_id,
    keyFingerprint: row.key_fingerprint,
    recipientToken: row.recipient_token,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSnapshotAt: row.last_snapshot_at ?? undefined,
  };
}

function mapCase(row: CaseRow): MobileCompanionCaseProjection {
  return {
    id: row.id,
    caseNumber: row.case_number,
    displayName: row.display_name,
    category: row.category,
    status: row.status,
    priority: row.priority,
    openedAt: row.opened_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapDeadline(row: DeadlineRow): MobileCompanionDeadlineProjection {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.deadline_type,
    title: row.title,
    confidentialTitle: row.confidential_title ?? undefined,
    dueAt: row.due_at,
    reminderAt: row.reminder_at ?? undefined,
    legalBasis: row.legal_basis ?? undefined,
    severity: row.severity,
    status: row.status,
    isLegalDeadline: Boolean(row.is_legal_deadline),
    updatedAt: row.updated_at,
  };
}

function encodeProtocolFrame(frame: MobileCompanionQrFrame): string {
  return `gsbvmobile://v1/${Buffer.from(JSON.stringify(frame), 'utf8').toString('base64url')}`;
}

export function encodeMobileCompanionSnapshotPayload(payload: MobileCompanionSnapshotPayload): string {
  const serializedPayload = JSON.stringify(payload);
  if (Buffer.byteLength(serializedPayload, 'utf8') > MAX_MOBILE_SNAPSHOT_BYTES) {
    throw new Error('Mobile-Snapshot ist zu groß. Bitte weniger Fälle auswählen.');
  }
  return JSON.stringify({
    protocolVersion: MOBILE_COMPANION_PROTOCOL_VERSION,
    schemaVersion: MOBILE_COMPANION_SNAPSHOT_VERSION,
    payloadCompression: 'deflate',
    payloadBase64: deflateSync(serializedPayload).toString('base64'),
  });
}

export function decodeMobileCompanionSnapshotPayload(encoded: string): MobileCompanionSnapshotPayload {
  const wrapper = JSON.parse(encoded) as {
    protocolVersion?: unknown;
    schemaVersion?: unknown;
    payloadCompression?: unknown;
    payloadBase64?: unknown;
  };
  if (
    wrapper.protocolVersion !== MOBILE_COMPANION_PROTOCOL_VERSION ||
    wrapper.schemaVersion !== MOBILE_COMPANION_SNAPSHOT_VERSION ||
    wrapper.payloadCompression !== 'deflate' ||
    typeof wrapper.payloadBase64 !== 'string'
  ) {
    throw new Error('Mobile-Snapshot nutzt kein unterstütztes Format.');
  }
  const compressed = Buffer.from(wrapper.payloadBase64, 'base64');
  if (compressed.byteLength > MAX_MOBILE_SNAPSHOT_BYTES) throw new Error('Mobile-Snapshot ist zu groß.');
  const inflated = inflateSync(compressed);
  try {
    if (inflated.byteLength > MAX_MOBILE_SNAPSHOT_BYTES) throw new Error('Mobile-Snapshot ist zu groß.');
    return JSON.parse(inflated.toString('utf8')) as MobileCompanionSnapshotPayload;
  } finally {
    inflated.fill(0);
  }
}

export function createMobileCompanionQrFrames(serializedEnvelope: string, packageId: string): string[] {
  const packageSha256 = sha256(serializedEnvelope);
  const chunks = serializedEnvelope.match(new RegExp(`.{1,${MAX_MOBILE_QR_FRAME_PAYLOAD_CHARS}}`, 'g')) ?? [];
  if (!chunks.length) throw new Error('Mobile-Snapshot enthält keine übertragbaren Daten.');
  if (chunks.length > MAX_MOBILE_QR_FRAMES) {
    throw new Error('Mobile-Snapshot ist zu groß für die QR-Übertragung. Bitte weniger Fälle auswählen.');
  }
  return chunks.map((payload, index) => encodeProtocolFrame({
    protocolVersion: MOBILE_COMPANION_PROTOCOL_VERSION,
    packageId,
    frameIndex: index,
    frameCount: chunks.length,
    packageSha256,
    payload,
  }));
}

export class MobileCompanionService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly auditLog = new PersonalDataAuditLogService(database),
    private readonly unitOfWork = new DatabaseUnitOfWork(database),
  ) {}

  listDevices(): MobileCompanionDevice[] {
    return this.database.prepare<MobileCompanionDeviceRow>(`
      SELECT * FROM mobile_companion_devices
      ORDER BY status = 'active' DESC, label COLLATE NOCASE, instance_id
    `).all().map(mapDevice);
  }

  saveDevice(input: SaveMobileCompanionDeviceInput): MobileCompanionDevice {
    const label = normalizeLabel(input.label);
    const recipient = parseTransferRecipientToken(input.recipientToken);
    return this.unitOfWork.run(() => {
      const timestamp = nowIso();
      const existing = this.database.prepare<MobileCompanionDeviceRow>(
        'SELECT * FROM mobile_companion_devices WHERE key_fingerprint = ?',
      ).get(recipient.keyFingerprint);
      const id = existing?.id ?? randomUUID();
      this.database.prepare(`
        INSERT INTO mobile_companion_devices (
          id, label, instance_id, key_fingerprint, recipient_token, status, created_at, updated_at, last_snapshot_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
        ON CONFLICT(key_fingerprint) DO UPDATE SET
          label = excluded.label,
          instance_id = excluded.instance_id,
          recipient_token = excluded.recipient_token,
          status = 'active',
          updated_at = excluded.updated_at
      `).run(id, label, recipient.instanceId, recipient.keyFingerprint, recipient.recipientToken, existing?.created_at ?? timestamp, timestamp, existing?.last_snapshot_at ?? null);
      this.auditLog.append({
        action: existing ? 'update' : 'create',
        subjectType: 'mobile_companion_transfer',
        subjectId: id,
        purpose: existing ? 'Mobile-Begleitgerät aktualisiert' : 'Mobile-Begleitgerät gekoppelt',
        metadata: { result: existing ? 'updated' : 'created', targetInstanceId: recipient.instanceId },
      });
      return this.requireDevice(id);
    });
  }

  setDeviceStatus(id: string, status: MobileCompanionDeviceStatus): MobileCompanionDevice {
    assertDeviceStatus(status);
    return this.unitOfWork.run(() => {
      const result = this.database.prepare(`
        UPDATE mobile_companion_devices SET status = ?, updated_at = ? WHERE id = ?
      `).run(status, nowIso(), id) as { changes?: number };
      if (!result.changes) throw new Error('Mobilgerät wurde nicht gefunden.');
      this.auditLog.append({
        action: 'update',
        subjectType: 'mobile_companion_transfer',
        subjectId: id,
        purpose: status === 'active' ? 'Mobile-Begleitgerät aktiviert' : 'Mobile-Begleitgerät deaktiviert',
        metadata: { result: status },
      });
      return this.requireDevice(id);
    });
  }

  createSnapshot(input: MobileCompanionSnapshotInput): MobileCompanionSnapshotResult {
    const caseIds = uniqueIds(input.caseIds, 'Fallakten');
    const device = this.requireActiveDevice(input.deviceId);
    return this.unitOfWork.run(() => {
      const createdAt = nowIso();
      const cases = this.readCaseProjection(caseIds);
      if (cases.length !== caseIds.length) throw new Error('Mindestens eine ausgewählte Fallakte wurde nicht gefunden.');
      const deadlines = this.readDeadlineProjection(caseIds);
      const sourceIdentity = new TransferInstanceIdentityService(this.database).getPublicIdentity();
      const packageId = `mobile_snapshot_${randomUUID()}`;
      const payload: MobileCompanionSnapshotPayload = {
        protocolVersion: MOBILE_COMPANION_PROTOCOL_VERSION,
        schemaVersion: MOBILE_COMPANION_SNAPSHOT_VERSION,
        packageId,
        sourceInstanceId: sourceIdentity.instanceId,
        targetInstanceId: device.instanceId,
        createdAt,
        baseAuditSequence: this.currentAuditSequence(),
        uiPreferences: { themeMode: input.uiThemeMode === 'light' ? 'light' : 'dark' },
        cases,
        deadlines,
      };
      const payloadText = encodeMobileCompanionSnapshotPayload(payload);
      const envelope = encryptTargetBoundTransferPayload({
        format: MOBILE_COMPANION_SNAPSHOT_FORMAT,
        version: MOBILE_COMPANION_SNAPSHOT_VERSION,
        packageId,
        createdAt,
        payloadText,
        passphrase: '',
        recipient: {
          instanceId: device.instanceId,
          keyFingerprint: device.keyFingerprint,
          publicKeyPem: parseTransferRecipientToken(device.recipientToken).publicKeyPem,
          recipientToken: device.recipientToken,
        },
        protectionMode: 'recipient_key_only',
      });
      const serializedEnvelope = JSON.stringify(envelope satisfies TargetBoundTransferEnvelope);
      const qrFrames = createMobileCompanionQrFrames(serializedEnvelope, packageId);
      this.database.prepare('UPDATE mobile_companion_devices SET last_snapshot_at = ?, updated_at = ? WHERE id = ?')
        .run(createdAt, createdAt, device.id);
      this.auditLog.append({
        action: 'export',
        subjectType: 'mobile_companion_transfer',
        subjectId: packageId,
        purpose: 'Mobile-Begleit-App-Snapshot erstellt',
        metadata: {
          packageId,
          caseCount: cases.length,
          deadlineCount: deadlines.length,
          frameCount: qrFrames.length,
          targetInstanceId: device.instanceId,
          result: 'created',
          schemaVersion: MOBILE_COMPANION_SNAPSHOT_VERSION,
        },
      });
      return {
        packageId,
        targetInstanceId: device.instanceId,
        caseCount: cases.length,
        deadlineCount: deadlines.length,
        serializedEnvelope,
        qrFrames,
        createdAt,
      };
    });
  }

  private requireDevice(id: string): MobileCompanionDevice {
    const row = this.database.prepare<MobileCompanionDeviceRow>('SELECT * FROM mobile_companion_devices WHERE id = ?').get(id);
    if (!row) throw new Error('Mobilgerät wurde nicht gefunden.');
    return mapDevice(row);
  }

  private requireActiveDevice(id: string): MobileCompanionDevice {
    const device = this.requireDevice(id);
    if (device.status !== 'active') throw new Error('Mobilgerät ist deaktiviert.');
    return device;
  }

  private readCaseProjection(caseIds: readonly string[]): MobileCompanionCaseProjection[] {
    return this.database.prepare<CaseRow>(`
      SELECT id, case_number, display_name, category, status, priority, opened_at, updated_at
      FROM cases
      WHERE id IN (${placeholders(caseIds)})
      ORDER BY case_number COLLATE NOCASE, display_name COLLATE NOCASE
    `).all(...caseIds).map(mapCase);
  }

  private readDeadlineProjection(caseIds: readonly string[]): MobileCompanionDeadlineProjection[] {
    return this.database.prepare<DeadlineRow>(`
      SELECT id, case_id, deadline_type, title, confidential_title, due_at, reminder_at,
             legal_basis, severity, status, is_legal_deadline, updated_at
      FROM deadlines
      WHERE case_id IN (${placeholders(caseIds)})
        AND status NOT IN ('done', 'erledigt', 'cancelled')
      ORDER BY due_at ASC, title COLLATE NOCASE
    `).all(...caseIds).map(mapDeadline);
  }

  private currentAuditSequence(): number {
    const row = this.database.prepare<AuditSequenceRow>(
      'SELECT COALESCE(MAX(sequence), 0) AS sequence FROM personal_data_audit_log',
    ).get();
    return Number(row?.sequence ?? 0);
  }
}
