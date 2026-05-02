import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type { TerminationHearingRecord, TerminationStatementStatus, TerminationType } from '../src/app/core/models/termination-hearing.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapTermination(row: any): TerminationHearingRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    hearingReceivedAt: row.hearing_received_at,
    employerDeadlineAt: row.employer_deadline_at ?? undefined,
    terminationType: row.termination_type,
    sbvHearingComplete: Boolean(row.sbv_hearing_complete),
    brHearingKnown: Boolean(row.br_hearing_known),
    integrationOfficeApprovalRequired: Boolean(row.integration_office_approval_required),
    integrationOfficeApprovalStatus: row.integration_office_approval_status,
    statementStatus: row.statement_status,
    statementSentAt: row.statement_sent_at ?? undefined,
    riskNotes: row.risk_notes ?? undefined
  };
}

export class TerminationHearingService {
  constructor(private readonly db: DatabaseAdapter) {}

  create(input: { caseId: string; hearingReceivedAt: string; employerDeadlineAt?: string; terminationType?: TerminationType }): TerminationHearingRecord {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO termination_hearings (
        id, case_id, hearing_received_at, employer_deadline_at, termination_type,
        statement_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'offen', ?, ?)
    `).run(id, input.caseId, input.hearingReceivedAt, input.employerDeadlineAt ?? null, input.terminationType ?? 'unbekannt', timestamp, timestamp);
    return this.getById(id)!;
  }

  getById(id: string): TerminationHearingRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM termination_hearings WHERE id = ?').get(id);
    return row ? mapTermination(row) : undefined;
  }

  setStatementStatus(id: string, status: TerminationStatementStatus): TerminationHearingRecord {
    const sentAt = status === 'abgegeben' ? nowIso() : null;
    this.db.prepare('UPDATE termination_hearings SET statement_status = ?, statement_sent_at = COALESCE(?, statement_sent_at), updated_at = ? WHERE id = ?')
      .run(status, sentAt, nowIso(), id);
    const updated = this.getById(id);
    if (!updated) throw new Error(`Termination hearing not found: ${id}`);
    return updated;
  }
}
