import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { EqualizationProcessRecord, EqualizationStatus } from '../src/app/core/models/equalization.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapEqualization(row: any): EqualizationProcessRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    applicationStatus: row.application_status,
    agencyReference: row.agency_reference ?? undefined,
    applicationSubmittedAt: row.application_submitted_at ?? undefined,
    decisionReceivedAt: row.decision_received_at ?? undefined,
    objectionDueAt: row.objection_due_at ?? undefined,
    outcome: row.outcome ?? undefined,
    notes: row.notes ?? undefined
  };
}

export class EqualizationService {
  constructor(private readonly db: DatabaseAdapter) {}

  createForCase(caseId: string): EqualizationProcessRecord {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO equalization_processes (id, case_id, application_status, created_at, updated_at)
      VALUES (?, ?, 'beratung', ?, ?)
    `).run(id, caseId, timestamp, timestamp);
    return this.getById(id)!;
  }

  getById(id: string): EqualizationProcessRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM equalization_processes WHERE id = ?').get(id);
    return row ? mapEqualization(row) : undefined;
  }

  setStatus(id: string, status: EqualizationStatus): EqualizationProcessRecord {
    this.db.prepare('UPDATE equalization_processes SET application_status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
    const updated = this.getById(id);
    if (!updated) throw new Error(`Equalization process not found: ${id}`);
    return updated;
  }
}
