import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import { complaintCanClose, listQuickCaseTemplates } from './complaintWorkflowPolicy.js';
import type {
  ComplaintWorkflowRecord,
  SaveComplaintWorkflowInput,
} from '../src/domain/models/sbv-office-workflow.model.js';

const nowIso = () => new Date().toISOString();
const optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

interface ComplaintWorkflowRow {
  id: string;
  case_id: string;
  received_at: string;
  assessment_status: ComplaintWorkflowRecord['assessmentStatus'];
  employer_contacted_at: string | null;
  negotiation_status: string | null;
  result_summary: string | null;
  person_informed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapComplaintWorkflow(row: ComplaintWorkflowRow): ComplaintWorkflowRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    receivedAt: row.received_at,
    assessmentStatus: row.assessment_status,
    employerContactedAt: row.employer_contacted_at ?? undefined,
    negotiationStatus: row.negotiation_status ?? undefined,
    resultSummary: row.result_summary ?? undefined,
    personInformedAt: row.person_informed_at ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ComplaintWorkflowService {
  constructor(
    private db: DatabaseAdapter,
    private audit?: PersonalDataAuditLogService,
  ) {}

  list(): ComplaintWorkflowRecord[] {
    return this.db
      .prepare<ComplaintWorkflowRow>('SELECT * FROM sbv_complaint_workflows ORDER BY received_at DESC')
      .all()
      .map(mapComplaintWorkflow);
  }

  save(input: SaveComplaintWorkflowInput): ComplaintWorkflowRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
      const existing = this.list().find((workflow) => workflow.caseId === input.caseId);
      const status = input.status ?? existing?.status ?? 'open';
      const resultSummary = input.resultSummary ?? existing?.resultSummary;
      const personInformedAt = input.personInformedAt ?? existing?.personInformedAt;

      if (
        status === 'closed' &&
        !complaintCanClose({ resultSummary, personInformedAt })
      ) {
        throw new Error(
          'Zum Abschluss müssen Ergebnis und Rückmeldung an die betroffene Person dokumentiert sein.',
        );
      }

      const id = existing?.id ?? randomUUID();
      const updatedAt = nowIso();

      if (existing) {
        this.updateExisting(id, existing, input, status, resultSummary, personInformedAt, updatedAt);
      } else {
        this.insertNew(id, input, status, resultSummary, personInformedAt, updatedAt);
      }

      this.audit?.append({
        action: existing ? 'update' : 'create',
        subjectType: 'complaint_workflow',
        subjectId: id,
        caseId: input.caseId,
        purpose: 'Anregung/Beschwerde bearbeiten',
      });

      return this.list().find((workflow) => workflow.id === id)!;
    });
  }

  quickCaseTemplates() {
    return listQuickCaseTemplates();
  }

  private updateExisting(
    id: string,
    existing: ComplaintWorkflowRecord,
    input: SaveComplaintWorkflowInput,
    status: string,
    resultSummary: string | undefined,
    personInformedAt: string | undefined,
    updatedAt: string,
  ): void {
    this.db
      .prepare(
        'UPDATE sbv_complaint_workflows SET received_at=?,assessment_status=?,employer_contacted_at=?,negotiation_status=?,result_summary=?,person_informed_at=?,status=?,updated_at=? WHERE id=?',
      )
      .run(
        input.receivedAt,
        input.assessmentStatus ?? existing.assessmentStatus,
        optionalText(input.employerContactedAt ?? existing.employerContactedAt),
        optionalText(input.negotiationStatus ?? existing.negotiationStatus),
        optionalText(resultSummary),
        optionalText(personInformedAt),
        status,
        updatedAt,
        id,
      );
  }

  private insertNew(
    id: string,
    input: SaveComplaintWorkflowInput,
    status: string,
    resultSummary: string | undefined,
    personInformedAt: string | undefined,
    createdAt: string,
  ): void {
    this.db
      .prepare(
        'INSERT INTO sbv_complaint_workflows(id,case_id,received_at,assessment_status,employer_contacted_at,negotiation_status,result_summary,person_informed_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.caseId,
        input.receivedAt,
        input.assessmentStatus ?? 'open',
        optionalText(input.employerContactedAt),
        optionalText(input.negotiationStatus),
        optionalText(resultSummary),
        optionalText(personInformedAt),
        status,
        createdAt,
        createdAt,
      );
  }
}
