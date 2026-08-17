import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditRetentionLegalHoldChanged } from './auditEventBuilders.js';
import { RetentionOwnerRegistry } from './retentionOwnerRegistry.js';
import type { RetentionOwnerRef } from '../src/domain/models/retention-owner.model.js';

export interface RetentionLegalHoldRecord {
  id: string;
  owner: RetentionOwnerRef;
  reasonKey: string;
  legalReference?: string;
  startsAt: string;
  untilAt?: string;
  releasedAt?: string;
}

interface Row {
  id: string; owner_type: RetentionOwnerRef['type']; owner_id: string; reason_key: string; legal_reference: string | null;
  starts_at: string; until_at: string | null; released_at: string | null;
}

function mapRow(row: Row): RetentionLegalHoldRecord {
  return {
    id: row.id,
    owner: { type: row.owner_type, id: row.owner_id },
    reasonKey: row.reason_key,
    legalReference: row.legal_reference ?? undefined,
    startsAt: row.starts_at,
    untilAt: row.until_at ?? undefined,
    releasedAt: row.released_at ?? undefined,
  };
}

export class RetentionLegalHoldService {
  constructor(private readonly db: DatabaseAdapter, private readonly owners = new RetentionOwnerRegistry()) {}

  place(owner: RetentionOwnerRef, reasonKey: string, legalReference?: string, untilAt?: string): RetentionLegalHoldRecord {
    if (!this.owners.exists(this.db, owner)) throw new Error('Legal Hold kann nur für einen vorhandenen Amtsvorgang gesetzt werden.');
    const normalizedReason = reasonKey.trim();
    if (!/^[a-z0-9_.-]{2,80}$/i.test(normalizedReason)) throw new Error('Legal Hold benötigt einen technischen Grundschlüssel ohne Freitext.');
    const id = randomUUID();
    const now = new Date().toISOString();
    new DatabaseUnitOfWork(this.db).run(() => {
      this.db.prepare(`
        INSERT INTO sbv_retention_legal_holds (
          id, owner_type, owner_id, reason_key, legal_reference, starts_at, until_at,
          released_at, release_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      `).run(id, owner.type, owner.id, normalizedReason, legalReference?.trim() || null, now, untilAt ?? null, now, now);
      new PersonalDataAuditLogService(this.db).append(auditRetentionLegalHoldChanged({
        action: 'create', holdId: id, ownerType: owner.type, ownerId: owner.id, reasonKey: normalizedReason,
      }));
    });
    const row = this.db.prepare<Row>('SELECT * FROM sbv_retention_legal_holds WHERE id = ?').get(id);
    if (!row) throw new Error('Legal Hold konnte nicht gelesen werden.');
    return mapRow(row);
  }

  release(holdId: string, releaseReason: string): RetentionLegalHoldRecord {
    const normalized = releaseReason.trim();
    if (!normalized) throw new Error('Freigabe eines Legal Hold benötigt eine Begründung.');
    const current = this.db.prepare<Row>('SELECT * FROM sbv_retention_legal_holds WHERE id = ?').get(holdId);
    if (!current) throw new Error('Legal Hold wurde nicht gefunden.');
    if (current.released_at) return mapRow(current);
    const now = new Date().toISOString();
    new DatabaseUnitOfWork(this.db).run(() => {
      this.db.prepare('UPDATE sbv_retention_legal_holds SET released_at = ?, release_reason = ?, updated_at = ? WHERE id = ?')
        .run(now, normalized, now, holdId);
      new PersonalDataAuditLogService(this.db).append(auditRetentionLegalHoldChanged({
        action: 'update', holdId, ownerType: current.owner_type, ownerId: current.owner_id, reasonKey: current.reason_key, released: true,
      }));
    });
    const updated = this.db.prepare<Row>('SELECT * FROM sbv_retention_legal_holds WHERE id = ?').get(holdId);
    if (!updated) throw new Error('Legal Hold konnte nach Freigabe nicht gelesen werden.');
    return mapRow(updated);
  }

  hasActiveHold(owner: RetentionOwnerRef, at = new Date()): boolean {
    const row = this.db.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM sbv_retention_legal_holds
      WHERE owner_type = ? AND owner_id = ? AND released_at IS NULL
        AND (until_at IS NULL OR until_at >= ?)
    `).get(owner.type, owner.id, at.toISOString());
    return Number(row?.count ?? 0) > 0;
  }
}
