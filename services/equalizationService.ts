import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { CreateEqualizationProcessInput, EqualizationProcessRecord, EqualizationStatus, UpdateEqualizationProcessInput } from '../src/app/core/models/equalization.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function optionalIso(value?: string): string | null {
  return value ? new Date(value).toISOString() : null;
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
    notes: undefined,
    legacyPlaintextNotesPresent: Boolean(row.notes && String(row.notes).trim()),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class EqualizationService {
  constructor(private readonly db: DatabaseAdapter) {}

  list(caseId?: string): EqualizationProcessRecord[] {
    const sql = caseId
      ? 'SELECT * FROM equalization_processes WHERE case_id = ? ORDER BY updated_at DESC'
      : 'SELECT * FROM equalization_processes ORDER BY updated_at DESC';
    const rows = caseId ? this.db.prepare<any>(sql).all(caseId) : this.db.prepare<any>(sql).all();
    return rows.map(mapEqualization);
  }

  create(input: CreateEqualizationProcessInput): EqualizationProcessRecord {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO equalization_processes (
        id, case_id, application_status, agency_reference, application_submitted_at,
        decision_received_at, objection_due_at, outcome, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.applicationStatus ?? 'beratung',
      input.agencyReference ?? null,
      optionalIso(input.applicationSubmittedAt),
      optionalIso(input.decisionReceivedAt),
      optionalIso(input.objectionDueAt),
      input.outcome ?? null,
      null,
      timestamp,
      timestamp
    );
    return this.getById(id)!;
  }

  createForCase(caseId: string): EqualizationProcessRecord {
    return this.create({ caseId, applicationStatus: 'beratung' });
  }

  getById(id: string): EqualizationProcessRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM equalization_processes WHERE id = ?').get(id);
    return row ? mapEqualization(row) : undefined;
  }

  update(id: string, input: UpdateEqualizationProcessInput): EqualizationProcessRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Equalization process not found: ${id}`);

    const next = {
      applicationStatus: input.applicationStatus ?? existing.applicationStatus,
      agencyReference: input.agencyReference !== undefined ? input.agencyReference : existing.agencyReference,
      applicationSubmittedAt: input.applicationSubmittedAt !== undefined ? input.applicationSubmittedAt : existing.applicationSubmittedAt,
      decisionReceivedAt: input.decisionReceivedAt !== undefined ? input.decisionReceivedAt : existing.decisionReceivedAt,
      objectionDueAt: input.objectionDueAt !== undefined ? input.objectionDueAt : existing.objectionDueAt,
      outcome: input.outcome !== undefined ? input.outcome : existing.outcome,
      notes: undefined
    };

    this.db.prepare(`
      UPDATE equalization_processes
      SET application_status = ?, agency_reference = ?, application_submitted_at = ?,
          decision_received_at = ?, objection_due_at = ?, outcome = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      next.applicationStatus,
      next.agencyReference ?? null,
      optionalIso(next.applicationSubmittedAt),
      optionalIso(next.decisionReceivedAt),
      optionalIso(next.objectionDueAt),
      next.outcome ?? null,
      null,
      nowIso(),
      id
    );

    const updated = this.getById(id);
    if (!updated) throw new Error(`Equalization process not found after update: ${id}`);
    return updated;
  }

  setStatus(id: string, status: EqualizationStatus): EqualizationProcessRecord {
    return this.update(id, { applicationStatus: status });
  }
}
