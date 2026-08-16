import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { RetentionLegalHoldService } from '../../../services/retentionLegalHoldService';

class LegalHoldDb implements DatabaseAdapter {
  holds = new Map<string, Record<string, unknown>>();
  released = false;
  auditWrites = 0;
  prepare<T = unknown>(sql: string) {
    return {
      all: (..._params: unknown[]) => [] as T[],
      get: (...params: unknown[]) => {
        if (sql.includes('FROM sbv_elections')) return { present: 1 } as T;
        if (sql.includes('FROM sbv_retention_legal_holds') && sql.includes('COUNT(*)')) return { count: this.released ? 0 : this.holds.size } as T;
        if (sql.includes('FROM sbv_retention_legal_holds') && sql.includes('WHERE id = ?')) return this.holds.get(String(params[0])) as T | undefined;
        if (sql.includes('personal_data_audit_log') && sql.includes('ORDER BY sequence')) return undefined;
        return undefined;
      },
      run: (...params: unknown[]) => {
        if (sql.includes('INSERT INTO sbv_retention_legal_holds')) {
          const [id, ownerType, ownerId, reasonKey, legalReference, startsAt, untilAt, createdAt, updatedAt] = params;
          this.holds.set(String(id), { id, owner_type: ownerType, owner_id: ownerId, reason_key: reasonKey, legal_reference: legalReference, starts_at: startsAt, until_at: untilAt, released_at: null, created_at: createdAt, updated_at: updatedAt });
        } else if (sql.includes('UPDATE sbv_retention_legal_holds')) {
          const [releasedAt, _reason, updatedAt, id] = params;
          const row = this.holds.get(String(id));
          if (row) this.holds.set(String(id), { ...row, released_at: releasedAt, updated_at: updatedAt });
          this.released = true;
        } else if (sql.includes('INSERT INTO personal_data_audit_log')) this.auditWrites += 1;
        return {};
      },
    };
  }
  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('RetentionLegalHoldService', () => {
  it('places and releases a hold on a real non-case owner and audits both mutations', () => {
    const db = new LegalHoldDb();
    const service = new RetentionLegalHoldService(db);
    const placed = service.place({ type: 'election', id: 'e-1' }, 'election_challenge', '§ 16 SchwbVWO');
    expect(placed).toMatchObject({ owner: { type: 'election', id: 'e-1' }, reasonKey: 'election_challenge' });
    expect(service.hasActiveHold({ type: 'election', id: 'e-1' })).toBe(true);
    const released = service.release(placed.id, 'Anfechtungsrisiko beendet');
    expect(released.releasedAt).toBeTruthy();
    expect(service.hasActiveHold({ type: 'election', id: 'e-1' })).toBe(false);
    expect(db.auditWrites).toBe(2);
  });
});
