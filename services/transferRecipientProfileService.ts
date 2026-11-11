import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type {
  SaveTransferRecipientProfileInput,
  TransferRecipientProfile,
} from '../src/domain/models/transfer-recipient-profile.model.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';
import { createTransferCapabilityDocument, verifyTransferCapabilityDocument, type TransferCapabilityDocument } from './transferCapabilityDocument.js';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';

type RecipientProfileRow = {
  id: string;
  label: string;
  instance_id: string;
  key_fingerprint: string;
  recipient_token: string;
  active: number;
  capabilities_json: string | null;
  capability_revision: number | null;
  capability_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Bitte eine Bezeichnung für das Empfängerprofil angeben.');
  if (label.length > 120) throw new Error('Die Bezeichnung des Empfängerprofils darf höchstens 120 Zeichen enthalten.');
  if (/\p{Cc}/u.test(label)) throw new Error('Die Bezeichnung des Empfängerprofils enthält unzulässige Steuerzeichen.');
  return label;
}

function mapProfile(row: RecipientProfileRow): TransferRecipientProfile {
  return {
    id: row.id,
    label: row.label,
    instanceId: row.instance_id,
    keyFingerprint: row.key_fingerprint,
    recipientToken: row.recipient_token,
    active: Boolean(row.active),
    capabilities: row.capabilities_json ? JSON.parse(row.capabilities_json) as TransferRecipientProfile['capabilities'] : null,
    capabilityStatus: row.capabilities_json ? 'verified' : 'unknown',
    capabilityConfirmedAt: row.capability_confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TransferRecipientProfileService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly auditLog?: PersonalDataAuditLogService,
  ) {}

  list(): TransferRecipientProfile[] {
    return this.database.prepare<RecipientProfileRow>(`
      SELECT * FROM transfer_recipient_profiles
      ORDER BY active DESC, label COLLATE NOCASE, instance_id
    `).all().map(mapProfile);
  }

  createCapability(id: string, sender: TransferInstancePrivateIdentity, buildVersion: string): TransferCapabilityDocument {
    const profile = this.requireProfile(id);
    if (!profile.active) throw new Error('Für ein deaktiviertes Empfängerprofil kann keine Fähigkeitsdatei erstellt werden.');
    const recipient = parseTransferRecipientToken(profile.recipientToken);
    const row = this.database.prepare<{ value: string }>(`
      INSERT INTO settings (key, value, updated_at) VALUES ('transfer.capability.revision.v1', '1', ?)
      ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = excluded.updated_at
      RETURNING value
    `).get(nowIso());
    const revision = Number(row?.value);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Fähigkeitsrevision konnte nicht vergeben werden.');
    return createTransferCapabilityDocument(sender, recipient, {
      protocolVersion: 1, readFormats: [1, 2, 3, 4], writeFormats: [2, 4],
      features: ['manual_capability_exchange'], buildVersion, revision, issuedAt: nowIso(),
    });
  }

  acceptCapability(id: string, document: TransferCapabilityDocument, recipient: TransferInstancePrivateIdentity): TransferRecipientProfile {
    const profile = this.requireProfile(id);
    const knownSender = parseTransferRecipientToken(profile.recipientToken);
    const capabilities = verifyTransferCapabilityDocument(document, recipient, knownSender);
    const result = this.database.prepare(`
      UPDATE transfer_recipient_profiles
      SET capabilities_json = ?, capability_revision = ?, capability_confirmed_at = ?, updated_at = ?
      WHERE id = ? AND (capability_revision IS NULL OR capability_revision < ?)
    `).run(JSON.stringify(capabilities), capabilities.revision, nowIso(), nowIso(), id, capabilities.revision) as { changes?: number };
    if (!result.changes) throw new Error('Der Fähigkeitsstand ist nicht neuer als der bereits bestätigte Stand.');
    this.auditLog?.append({
      action: 'update', subjectType: 'transfer_recipient_profile', subjectId: id,
      purpose: 'Übergabefähigkeiten verifiziert', metadata: { revision: capabilities.revision },
    });
    return this.requireProfile(id);
  }

  save(input: SaveTransferRecipientProfileInput): TransferRecipientProfile {
    const label = normalizeLabel(input.label);
    const recipient = parseTransferRecipientToken(input.recipientToken);
    const timestamp = nowIso();
    const existing = this.database.prepare<RecipientProfileRow>(`
      SELECT * FROM transfer_recipient_profiles WHERE key_fingerprint = ?
    `).get(recipient.keyFingerprint);
    const id = existing?.id ?? randomUUID();
    this.database.prepare(`
      INSERT INTO transfer_recipient_profiles (
        id, label, instance_id, key_fingerprint, recipient_token, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(key_fingerprint) DO UPDATE SET
        label = excluded.label,
        instance_id = excluded.instance_id,
        recipient_token = excluded.recipient_token,
        active = transfer_recipient_profiles.active,
        updated_at = excluded.updated_at
    `).run(id, label, recipient.instanceId, recipient.keyFingerprint, recipient.recipientToken, existing?.created_at ?? timestamp, timestamp);
    this.auditLog?.append({
      action: existing ? 'update' : 'create',
      subjectType: 'transfer_recipient_profile',
      subjectId: id,
      purpose: existing ? 'Empfängerprofil aktualisiert' : 'Empfängerprofil angelegt',
      metadata: { active: existing ? Boolean(existing.active) : true },
    });
    return this.requireProfile(id);
  }

  setActive(id: string, active: boolean): TransferRecipientProfile {
    const result = this.database.prepare(`
      UPDATE transfer_recipient_profiles SET active = ?, updated_at = ? WHERE id = ?
    `).run(active ? 1 : 0, nowIso(), id) as { changes?: number };
    if (!result.changes) throw new Error('Empfängerprofil wurde nicht gefunden.');
    this.auditLog?.append({
      action: 'update',
      subjectType: 'transfer_recipient_profile',
      subjectId: id,
      purpose: active ? 'Empfängerprofil aktiviert' : 'Empfängerprofil deaktiviert',
      metadata: { active },
    });
    return this.requireProfile(id);
  }

  remove(id: string): { deleted: boolean } {
    const result = this.database.prepare('DELETE FROM transfer_recipient_profiles WHERE id = ?').run(id) as { changes?: number };
    if (result.changes) {
      this.auditLog?.append({
        action: 'delete',
        subjectType: 'transfer_recipient_profile',
        subjectId: id,
        purpose: 'Empfängerprofil gelöscht',
        metadata: { result: 'deleted' },
      });
    }
    return { deleted: Boolean(result.changes) };
  }

  private requireProfile(id: string): TransferRecipientProfile {
    const row = this.database.prepare<RecipientProfileRow>('SELECT * FROM transfer_recipient_profiles WHERE id = ?').get(id);
    if (!row) throw new Error('Empfängerprofil wurde nicht gefunden.');
    return mapProfile(row);
  }
}
