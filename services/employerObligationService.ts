import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { DeadlineService } from './deadlineService.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import {
  EMPLOYER_OBLIGATION_POLICY,
  annualReportDueAt,
  deriveAnnualReportStatus,
} from './employerObligationPolicy.js';
import type {
  EmployerObligationReviewRecord,
  InclusionOfficerSnapshotRecord,
  SaveEmployerObligationReviewInput,
  SaveInclusionOfficerSnapshotInput,
} from '../src/domain/models/sbv-office-workflow.model.js';

const nowIso = () => new Date().toISOString();
const optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

type ObligationKey = EmployerObligationReviewRecord['obligationKey'];

interface ObligationRow {
  id: string;
  obligation_key: ObligationKey;
  period_year: number;
  scope_key: string;
  due_at: string | null;
  requested_at: string | null;
  received_at: string | null;
  reviewed_at: string | null;
  status: EmployerObligationReviewRecord['status'];
  finding: string | null;
  next_action: string | null;
  follow_up_due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OfficerRow {
  id: string;
  name: string | null;
  function: string | null;
  appointed_at: string | null;
  notification_agency_at: string | null;
  notification_integration_office_at: string | null;
  verified_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapObligation(row: ObligationRow): EmployerObligationReviewRecord {
  return {
    id: row.id,
    obligationKey: row.obligation_key,
    periodYear: row.period_year,
    scopeKey: row.scope_key,
    dueAt: row.due_at ?? undefined,
    requestedAt: row.requested_at ?? undefined,
    receivedAt: row.received_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    status: row.status,
    finding: row.finding ?? undefined,
    nextAction: row.next_action ?? undefined,
    followUpDueAt: row.follow_up_due_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOfficer(row: OfficerRow): InclusionOfficerSnapshotRecord {
  return {
    id: row.id,
    name: row.name ?? undefined,
    function: row.function ?? undefined,
    appointedAt: row.appointed_at ?? undefined,
    notificationAgencyAt: row.notification_agency_at ?? undefined,
    notificationIntegrationOfficeAt: row.notification_integration_office_at ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EmployerObligationService {
  constructor(
    private database: DatabaseAdapter,
    private deadlines: DeadlineService = new DeadlineService(database),
    private audit?: PersonalDataAuditLogService,
  ) {}

  list(): EmployerObligationReviewRecord[] {
    return this.database
      .prepare<ObligationRow>(
        'SELECT * FROM sbv_employer_obligation_reviews ORDER BY period_year DESC, obligation_key',
      )
      .all()
      .map(mapObligation);
  }

  ensureAnnual(periodYear: number): EmployerObligationReviewRecord[] {
    return new DatabaseUnitOfWork(this.database).run(() => {
      for (const key of Object.keys(EMPLOYER_OBLIGATION_POLICY) as ObligationKey[]) {
        if (EMPLOYER_OBLIGATION_POLICY[key].cadence === 'event') continue;
        if (this.annualReviewExists(key, periodYear)) continue;
        this.createAnnualReview(key, periodYear);
      }
      return this.list().filter((review) => review.periodYear === periodYear);
    });
  }

  save(input: SaveEmployerObligationReviewInput): EmployerObligationReviewRecord {
    return new DatabaseUnitOfWork(this.database).run(() => {
      const existing = input.id
        ? this.list().find((review) => review.id === input.id)
        : undefined;
      const id = existing?.id ?? randomUUID();
      const changedAt = nowIso();
      const scopeKey = input.scopeKey ?? existing?.scopeKey ?? '';
      const status = input.status ?? existing?.status ?? 'not_due';
      const dueAt = input.dueAt ?? existing?.dueAt;

      if (existing) {
        this.updateReview(id, existing, input, status, dueAt, changedAt);
      } else {
        this.insertReview(id, input, scopeKey, status, dueAt, changedAt);
      }

      this.ensureFollowUpDeadline(id, input, existing);
      this.audit?.append({
        action: existing ? 'update' : 'create',
        subjectType: 'employer_obligation_review',
        subjectId: id,
        purpose: 'Arbeitgeberpflicht-Prüfvorgang dokumentieren',
      });

      return this.list().find((review) => review.id === id)!;
    });
  }

  listInclusionOfficers(): InclusionOfficerSnapshotRecord[] {
    return this.database
      .prepare<OfficerRow>(
        'SELECT * FROM sbv_inclusion_officer_snapshots ORDER BY COALESCE(verified_at,created_at) DESC',
      )
      .all()
      .map(mapOfficer);
  }

  saveInclusionOfficer(input: SaveInclusionOfficerSnapshotInput): InclusionOfficerSnapshotRecord {
    return new DatabaseUnitOfWork(this.database).run(() => {
      const id = randomUUID();
      const createdAt = nowIso();
      this.database
        .prepare(
          'INSERT INTO sbv_inclusion_officer_snapshots(id,name,function,appointed_at,notification_agency_at,notification_integration_office_at,verified_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          id,
          optionalText(input.name),
          optionalText(input.function),
          optionalText(input.appointedAt),
          optionalText(input.notificationAgencyAt),
          optionalText(input.notificationIntegrationOfficeAt),
          optionalText(input.verifiedAt) ?? createdAt,
          input.status ?? 'unknown',
          createdAt,
          createdAt,
        );

      if (this.audit) this.audit.append({
        action: 'create',
        subjectType: 'inclusion_officer_snapshot',
        subjectId: id,
        purpose: 'Status Inklusionsbeauftragter dokumentieren',
      });
      return this.listInclusionOfficers().find((officer) => officer.id === id)!;
    });
  }

  private annualReviewExists(key: ObligationKey, periodYear: number): boolean {
    return Boolean(
      this.database
        .prepare<{ id: string }>(
          'SELECT id FROM sbv_employer_obligation_reviews WHERE obligation_key=? AND period_year=? AND scope_key=?',
        )
        .get(key, periodYear, ''),
    );
  }

  private createAnnualReview(key: ObligationKey, periodYear: number): void {
    const id = randomUUID();
    const createdAt = nowIso();
    const isEmploymentReport = key === 'employment_report_163_2';
    const dueAt = isEmploymentReport ? annualReportDueAt(periodYear) : null;
    const status = isEmploymentReport
      ? deriveAnnualReportStatus(periodYear, new Date())
      : 'not_due';

    this.database
      .prepare(
        'INSERT INTO sbv_employer_obligation_reviews(id,obligation_key,period_year,scope_key,due_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(id, key, periodYear, '', dueAt, status, createdAt, createdAt);

    if (isEmploymentReport && dueAt) {
      this.deadlines.create({
        processId: id,
        processType: 'employer_obligation_review',
        deadlineType: 'legal_deadline',
        title: 'Arbeitgeberanzeige / Verzeichnis prüfen',
        dueAt,
        legalBasis: '§ 163 Abs. 2 SGB IX',
        severity: 'important',
        calculationMode: 'legal',
        isLegalDeadline: true,
        isUserEditable: false,
        sourceEvent: 'Gesetzlicher Arbeitgebertermin 31.03.',
      });
    }

    if (this.audit) this.audit.append({
      action: 'create',
      subjectType: 'employer_obligation_review',
      subjectId: id,
      purpose: 'Arbeitgeberpflicht-Prüfvorgang anlegen',
    });
  }

  private updateReview(
    id: string,
    existing: EmployerObligationReviewRecord,
    input: SaveEmployerObligationReviewInput,
    status: EmployerObligationReviewRecord['status'],
    dueAt: string | undefined,
    updatedAt: string,
  ): void {
    this.database
      .prepare(
        'UPDATE sbv_employer_obligation_reviews SET due_at=?,requested_at=?,received_at=?,reviewed_at=?,status=?,finding=?,next_action=?,follow_up_due_at=?,updated_at=? WHERE id=?',
      )
      .run(
        optionalText(dueAt),
        optionalText(input.requestedAt ?? existing.requestedAt),
        optionalText(input.receivedAt ?? existing.receivedAt),
        optionalText(input.reviewedAt ?? existing.reviewedAt),
        status,
        optionalText(input.finding ?? existing.finding),
        optionalText(input.nextAction ?? existing.nextAction),
        optionalText(input.followUpDueAt ?? existing.followUpDueAt),
        updatedAt,
        id,
      );
  }

  private insertReview(
    id: string,
    input: SaveEmployerObligationReviewInput,
    scopeKey: string,
    status: EmployerObligationReviewRecord['status'],
    dueAt: string | undefined,
    createdAt: string,
  ): void {
    this.database
      .prepare(
        'INSERT INTO sbv_employer_obligation_reviews(id,obligation_key,period_year,scope_key,due_at,requested_at,received_at,reviewed_at,status,finding,next_action,follow_up_due_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.obligationKey,
        input.periodYear,
        scopeKey,
        optionalText(dueAt),
        optionalText(input.requestedAt),
        optionalText(input.receivedAt),
        optionalText(input.reviewedAt),
        status,
        optionalText(input.finding),
        optionalText(input.nextAction),
        optionalText(input.followUpDueAt),
        createdAt,
        createdAt,
      );
  }

  private ensureFollowUpDeadline(
    id: string,
    input: SaveEmployerObligationReviewInput,
    existing: EmployerObligationReviewRecord | undefined,
  ): void {
    const followUpDueAt = input.followUpDueAt ?? existing?.followUpDueAt;
    if (!followUpDueAt) return;

    const deadline = this.database
      .prepare<{ id: string }>(
        "SELECT id FROM deadlines WHERE process_type='employer_obligation_review' AND process_id=? AND source_event='employer_obligation_follow_up' AND status!='cancelled' AND status!='done'",
      )
      .get(id);
    if (deadline) return;

    this.deadlines.create({
      processId: id,
      processType: 'employer_obligation_review',
      deadlineType: 'follow_up',
      title: 'Arbeitgeberpflicht nachhalten',
      dueAt: followUpDueAt,
      legalBasis: EMPLOYER_OBLIGATION_POLICY[input.obligationKey].legalBasis,
      severity: 'important',
      calculationMode: 'workflow',
      isLegalDeadline: false,
      sourceEvent: 'employer_obligation_follow_up',
    });
  }
}
