import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import type {
  CreateTerminationHearingInput,
  TerminationHearingRecord,
  TerminationHearingStatus,
  UpdateTerminationHearingInput
} from '../src/app/core/models/termination.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function optionalIso(value?: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function mapTermination(row: any): TerminationHearingRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    status: row.status,
    terminationType: row.termination_type,
    protectionStatus: row.protection_status,
    receivedAt: row.received_at ?? undefined,
    employerDeadlineAt: row.employer_deadline_at ?? undefined,
    sbvStatementDueAt: row.sbv_statement_due_at ?? undefined,
    worksCouncilHearingAt: row.works_council_hearing_at ?? undefined,
    integrationOfficeRequestedAt: row.integration_office_requested_at ?? undefined,
    integrationOfficeDecisionAt: row.integration_office_decision_at ?? undefined,
    integrationOfficeDecision: row.integration_office_decision ?? undefined,
    employerReason: row.employer_reason ?? undefined,
    missingInformation: row.missing_information ?? undefined,
    sbvAssessment: row.sbv_assessment ?? undefined,
    statement: row.statement ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TerminationService {
  constructor(private readonly db: DatabaseAdapter) {}

  list(caseId?: string): TerminationHearingRecord[] {
    const sql = caseId
      ? 'SELECT * FROM termination_hearings WHERE case_id = ? ORDER BY updated_at DESC'
      : 'SELECT * FROM termination_hearings ORDER BY updated_at DESC';
    const rows = caseId ? this.db.prepare<any>(sql).all(caseId) : this.db.prepare<any>(sql).all();
    return rows.map(mapTermination);
  }

  getById(id: string): TerminationHearingRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM termination_hearings WHERE id = ?').get(id);
    return row ? mapTermination(row) : undefined;
  }

  create(input: CreateTerminationHearingInput): TerminationHearingRecord {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO termination_hearings (
        id, case_id, status, termination_type, protection_status, received_at, employer_deadline_at,
        sbv_statement_due_at, works_council_hearing_at, integration_office_requested_at,
        integration_office_decision_at, integration_office_decision, employer_reason,
        missing_information, sbv_assessment, statement, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.status ?? 'eingang',
      input.terminationType ?? 'sonstiges',
      input.protectionStatus ?? 'unklar',
      optionalIso(input.receivedAt),
      optionalIso(input.employerDeadlineAt),
      optionalIso(input.sbvStatementDueAt),
      optionalIso(input.worksCouncilHearingAt),
      optionalIso(input.integrationOfficeRequestedAt),
      optionalIso(input.integrationOfficeDecisionAt),
      input.integrationOfficeDecision ?? null,
      input.employerReason ?? null,
      input.missingInformation ?? null,
      input.sbvAssessment ?? null,
      input.statement ?? null,
      timestamp,
      timestamp
    );
    return this.getById(id)!;
  }

  update(id: string, input: UpdateTerminationHearingInput): TerminationHearingRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Termination hearing not found: ${id}`);

    const next = {
      status: input.status ?? existing.status,
      terminationType: input.terminationType ?? existing.terminationType,
      protectionStatus: input.protectionStatus ?? existing.protectionStatus,
      receivedAt: input.receivedAt !== undefined ? input.receivedAt : existing.receivedAt,
      employerDeadlineAt: input.employerDeadlineAt !== undefined ? input.employerDeadlineAt : existing.employerDeadlineAt,
      sbvStatementDueAt: input.sbvStatementDueAt !== undefined ? input.sbvStatementDueAt : existing.sbvStatementDueAt,
      worksCouncilHearingAt: input.worksCouncilHearingAt !== undefined ? input.worksCouncilHearingAt : existing.worksCouncilHearingAt,
      integrationOfficeRequestedAt: input.integrationOfficeRequestedAt !== undefined ? input.integrationOfficeRequestedAt : existing.integrationOfficeRequestedAt,
      integrationOfficeDecisionAt: input.integrationOfficeDecisionAt !== undefined ? input.integrationOfficeDecisionAt : existing.integrationOfficeDecisionAt,
      integrationOfficeDecision: input.integrationOfficeDecision !== undefined ? input.integrationOfficeDecision : existing.integrationOfficeDecision,
      employerReason: input.employerReason !== undefined ? input.employerReason : existing.employerReason,
      missingInformation: input.missingInformation !== undefined ? input.missingInformation : existing.missingInformation,
      sbvAssessment: input.sbvAssessment !== undefined ? input.sbvAssessment : existing.sbvAssessment,
      statement: input.statement !== undefined ? input.statement : existing.statement
    };

    this.db.prepare(`
      UPDATE termination_hearings
      SET status = ?, termination_type = ?, protection_status = ?, received_at = ?, employer_deadline_at = ?,
          sbv_statement_due_at = ?, works_council_hearing_at = ?, integration_office_requested_at = ?,
          integration_office_decision_at = ?, integration_office_decision = ?, employer_reason = ?,
          missing_information = ?, sbv_assessment = ?, statement = ?, updated_at = ?
      WHERE id = ?
    `).run(
      next.status,
      next.terminationType,
      next.protectionStatus,
      optionalIso(next.receivedAt),
      optionalIso(next.employerDeadlineAt),
      optionalIso(next.sbvStatementDueAt),
      optionalIso(next.worksCouncilHearingAt),
      optionalIso(next.integrationOfficeRequestedAt),
      optionalIso(next.integrationOfficeDecisionAt),
      next.integrationOfficeDecision ?? null,
      next.employerReason ?? null,
      next.missingInformation ?? null,
      next.sbvAssessment ?? null,
      next.statement ?? null,
      nowIso(),
      id
    );
    return this.getById(id)!;
  }

  setStatus(id: string, status: TerminationHearingStatus): TerminationHearingRecord {
    return this.update(id, { status });
  }
}
