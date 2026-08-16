import type { DatabaseAdapter } from './databaseService.js';
import {
  RETENTION_OWNER_TYPES,
  type RetentionOwnerRef,
  type RetentionOwnerSnapshot,
  type RetentionOwnerType,
} from '../src/app/core/models/retention-owner.model.js';

export interface RetentionOwnerDescriptor {
  type: RetentionOwnerType;
  table: string;
  retentionColumn: string | null;
  referenceExpression: string;
  statusExpression: string;
}

const descriptors: readonly RetentionOwnerDescriptor[] = [
  { type: 'case', table: 'cases', retentionColumn: null, referenceExpression: 'case_number', statusExpression: 'status' },
  { type: 'election', table: 'sbv_elections', retentionColumn: 'retention_until', referenceExpression: 'id', statusExpression: 'status' },
  { type: 'meeting', table: 'sbv_meetings', retentionColumn: 'retention_until', referenceExpression: 'title', statusExpression: 'status' },
  { type: 'assembly', table: 'sbv_assemblies', retentionColumn: 'retention_until', referenceExpression: "CAST(year AS TEXT)", statusExpression: 'status' },
  { type: 'inclusion_agreement', table: 'sbv_inclusion_agreements', retentionColumn: 'retention_until', referenceExpression: 'title', statusExpression: 'status' },
  { type: 'employer_obligation_review', table: 'sbv_employer_obligation_reviews', retentionColumn: 'retention_until', referenceExpression: 'obligation_key', statusExpression: 'status' },
];

interface OwnerRow {
  id: string;
  reference: string | null;
  status: string | null;
  retention_until: string | null;
  hold_reason: string | null;
  hold_until: string | null;
}

function tableExists(db: DatabaseAdapter, table: string): boolean {
  return Boolean(db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

export class RetentionOwnerRegistry {
  private readonly byType = new Map(descriptors.map((descriptor) => [descriptor.type, descriptor] as const));

  list(): readonly RetentionOwnerDescriptor[] {
    return descriptors;
  }

  get(type: RetentionOwnerType): RetentionOwnerDescriptor {
    const descriptor = this.byType.get(type);
    if (!descriptor) throw new Error(`Unbekannter Retention-Owner: ${type}`);
    return descriptor;
  }

  exists(db: DatabaseAdapter, owner: RetentionOwnerRef): boolean {
    const descriptor = this.get(owner.type);
    const row = db.prepare<{ present: number }>(`SELECT 1 AS present FROM ${descriptor.table} WHERE id = ? LIMIT 1`).get(owner.id);
    return Boolean(row?.present);
  }

  listManagedSnapshots(db: DatabaseAdapter, at = new Date()): RetentionOwnerSnapshot[] {
    const result: RetentionOwnerSnapshot[] = [];
    for (const descriptor of descriptors) {
      if (!descriptor.retentionColumn || !tableExists(db, descriptor.table)) continue;
      const rows = db.prepare<OwnerRow>(`
        SELECT o.id,
          ${descriptor.referenceExpression} AS reference,
          ${descriptor.statusExpression} AS status,
          o.${descriptor.retentionColumn} AS retention_until,
          (
            SELECT h.reason_key FROM sbv_retention_legal_holds h
            WHERE h.owner_type = ? AND h.owner_id = o.id AND h.released_at IS NULL
              AND (h.until_at IS NULL OR h.until_at >= ?)
            ORDER BY h.starts_at DESC LIMIT 1
          ) AS hold_reason,
          (
            SELECT h.until_at FROM sbv_retention_legal_holds h
            WHERE h.owner_type = ? AND h.owner_id = o.id AND h.released_at IS NULL
              AND (h.until_at IS NULL OR h.until_at >= ?)
            ORDER BY h.starts_at DESC LIMIT 1
          ) AS hold_until
        FROM ${descriptor.table} o
      `).all(descriptor.type, at.toISOString(), descriptor.type, at.toISOString());
      for (const row of rows) {
        result.push({
          ownerType: descriptor.type,
          ownerId: row.id,
          reference: row.reference ?? undefined,
          status: row.status ?? undefined,
          retentionUntil: row.retention_until,
          legalHoldActive: Boolean(row.hold_reason),
          legalHoldReasonKey: row.hold_reason ?? undefined,
          legalHoldUntil: row.hold_until,
        });
      }
    }
    return result;
  }

  assertSupported(type: string): asserts type is RetentionOwnerType {
    if (!(RETENTION_OWNER_TYPES as readonly string[]).includes(type)) throw new Error(`Nicht unterstützter Retention-Owner: ${type}`);
  }
}
