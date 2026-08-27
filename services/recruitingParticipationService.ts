import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { MeasureLifecycleAuditService } from './measureLifecycleAuditService.js';
import type { CreateRecruitingInterviewEventInput, CreateRecruitingParticipationInput, RecruitingInterviewEventRecord, RecruitingParticipationRecord, UpdateRecruitingInterviewEventInput, UpdateRecruitingParticipationInput } from '../src/domain/models/recruiting-participation.model.js';
import { defaultApplicantReference, normalizeAccessibilityCheckStatus, normalizeApplicantReferenceMode, normalizeApplicantStatus, normalizeBoolean, normalizeNonNegativeInteger, normalizeOptionalIso, normalizeOptionalText, normalizeRecruitingParticipationStatus, normalizeRequiredIso, normalizeViolationReviewReason } from './recruitingParticipationValidation.js';
import { RecruitingParticipationRow, RecruitingInterviewRow, nowIso, sqliteOptionalBoolean, mapParticipation, mapInterview } from './recruitingParticipationSupport.js';
import { ensureRecruitingParticipationRuntimeSchema } from './runtimeSchemaCompatibility.js';
export class RecruitingParticipationService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly auditLog: PersonalDataAuditLogService = new PersonalDataAuditLogService(database),
    private readonly lifecycleAudit: MeasureLifecycleAuditService = new MeasureLifecycleAuditService(database, auditLog),
  ) {}

  ensureSchema(): void {
    ensureRecruitingParticipationRuntimeSchema(this.database);
    this.auditLog;
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, purpose: string, metadata?: Record<string, unknown>): void {
    try {
      this.auditLog.append({
        action,
        subjectType: 'recruiting_participation',
        subjectId,
        purpose,
        metadata,
      });
    } catch (error) {
      console.warn('Gremia.SBV recruiting participation audit write failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }

  private tableExists(tableName: string): boolean {
    const row = this.database.prepare<{ value: number }>("SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
    return Boolean(row);
  }

  private ensureParticipationExists(id: string): void {
    const row = this.database.prepare<{ value: number }>('SELECT 1 AS value FROM recruiting_participations WHERE id = ?').get(id);
    if (!row) throw new Error(`Stellenbesetzung nicht gefunden: ${id}`);
  }

  private ensureParticipationCanBeDeleted(id: string): void {
    const dependencyChecks: Array<{ table: string; sql: string; label: string }> = [
      { table: 'sbv_participation_violations', sql: "SELECT COUNT(*) AS count FROM sbv_participation_violations WHERE related_recruiting_participation_id = ? OR (source_context_type = 'recruiting_participation' AND source_context_id = ?)", label: 'Beteiligungsverstöße' },
      { table: 'deadlines', sql: "SELECT COUNT(*) AS count FROM deadlines WHERE process_type = 'recruiting_participation' AND process_id = ?", label: 'Wiedervorlagen/Fristen' },
      { table: 'activity_journal_links', sql: "SELECT COUNT(*) AS count FROM activity_journal_links WHERE target_type = 'recruiting_participation' AND target_id = ?", label: 'Tätigkeitsjournal-Verknüpfungen' },
    ];
    const blocking = dependencyChecks
      .filter((check) => this.tableExists(check.table))
      .map((check) => {
        const params = check.sql.includes('source_context_type') ? [id, id] : [id];
        const row = this.database.prepare<{ count: number }>(check.sql).get(...params);
        return { label: check.label, count: Number(row?.count ?? 0) };
      })
      .filter((check) => check.count > 0);
    if (blocking.length > 0) {
      throw new Error(`Stellenbesetzung kann nicht gelöscht werden, weil abhängige Nachweisobjekte existieren: ${blocking.map((item) => `${item.label} (${item.count})`).join(', ')}.`);
    }
  }

  private interviewCount(participationId: string): number {
    const row = this.database.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM recruiting_interview_events WHERE recruiting_participation_id = ?').get(participationId);
    return Number(row?.count ?? 0);
  }

  private refreshInterviewCount(participationId: string): void {
    const count = this.interviewCount(participationId);
    this.database.prepare('UPDATE recruiting_participations SET interview_count = ?, updated_at = ? WHERE id = ?').run(count, nowIso(), participationId);
  }

  list(): RecruitingParticipationRecord[] {
    this.audit('read', undefined, 'Stellenbesetzungen anzeigen', { scope: 'list' });
    return this.database.prepare<RecruitingParticipationRow>(`
      SELECT * FROM recruiting_participations
      ORDER BY COALESCE(employer_notice_date, created_at) DESC, updated_at DESC
    `).all().map(mapParticipation);
  }

  getById(id: string): RecruitingParticipationRecord | undefined {
    this.audit('read', id, 'Stellenbesetzung anzeigen', { scope: 'detail' });
    const row = this.database.prepare<RecruitingParticipationRow>('SELECT * FROM recruiting_participations WHERE id = ?').get(id);
    return row ? mapParticipation(row) : undefined;
  }

  create(input: CreateRecruitingParticipationInput): RecruitingParticipationRecord {
    const vacancyTitle = normalizeOptionalText(input.vacancyTitle);
    if (!vacancyTitle) throw new Error('Eine Stellenbesetzung benötigt eine Stellenbezeichnung.');
    const id = randomUUID();
    const timestamp = nowIso();
    const flaggedForViolationReview = normalizeBoolean(input.flaggedForViolationReview);
    const violationReviewReason = flaggedForViolationReview ? normalizeViolationReviewReason(input.violationReviewReason) ?? 'manual_review' : null;

    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
      INSERT INTO recruiting_participations (
        id, vacancy_title, vacancy_reference, department, location, status,
        employer_notice_date, documents_received_date, documents_complete,
        has_severely_disabled_applicants, severely_disabled_applicant_count,
        interview_count, sbv_invited_to_all_known_interviews, sbv_participated,
        hearing_requested_date, hearing_due_date, statement_submitted_date,
        decision_known_date, decision_before_hearing, br_procedure_date,
        flagged_for_violation_review, violation_review_reason, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      vacancyTitle,
      normalizeOptionalText(input.vacancyReference),
      normalizeOptionalText(input.department),
      normalizeOptionalText(input.location),
      normalizeRecruitingParticipationStatus(input.status),
      normalizeOptionalIso(input.employerNoticeDate),
      normalizeOptionalIso(input.documentsReceivedDate),
      input.documentsComplete ? 1 : 0,
      input.hasSeverelyDisabledApplicants ? 1 : 0,
      normalizeNonNegativeInteger(input.severelyDisabledApplicantCount),
      sqliteOptionalBoolean(input.sbvInvitedToAllKnownInterviews),
      sqliteOptionalBoolean(input.sbvParticipated),
      normalizeOptionalIso(input.hearingRequestedDate),
      normalizeOptionalIso(input.hearingDueDate),
      normalizeOptionalIso(input.statementSubmittedDate),
      normalizeOptionalIso(input.decisionKnownDate),
      input.decisionBeforeHearing ? 1 : 0,
      normalizeOptionalIso(input.brProcedureDate),
      flaggedForViolationReview ? 1 : 0,
      violationReviewReason,
      normalizeOptionalText(input.notes),
      timestamp,
      timestamp
    );
      this.lifecycleAudit.created('recruiting', id, undefined, normalizeRecruitingParticipationStatus(input.status), 'manual');
      this.auditLog.append({ action: 'create', subjectType: 'recruiting_participation', subjectId: id, purpose: 'Stellenbesetzung angelegt; Audit enthält keine Bewerberdaten oder Gesprächsinhalte.', metadata: { status: normalizeRecruitingParticipationStatus(input.status), flaggedForViolationReview } });
    });
    return this.getById(id)!;
  }

  update(id: string, input: UpdateRecruitingParticipationInput): RecruitingParticipationRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Stellenbesetzung nicht gefunden: ${id}`);
    const flaggedForViolationReview = input.flaggedForViolationReview !== undefined ? Boolean(input.flaggedForViolationReview) : existing.flaggedForViolationReview;
    const violationReviewReason = flaggedForViolationReview
      ? normalizeViolationReviewReason(input.violationReviewReason ?? existing.violationReviewReason) ?? 'manual_review'
      : null;
    const nextStatus = input.status !== undefined ? normalizeRecruitingParticipationStatus(input.status) : existing.status;

    new DatabaseUnitOfWork(this.database).run(() => {
      this.database.prepare(`
      UPDATE recruiting_participations
      SET vacancy_title = ?, vacancy_reference = ?, department = ?, location = ?, status = ?,
          employer_notice_date = ?, documents_received_date = ?, documents_complete = ?,
          has_severely_disabled_applicants = ?, severely_disabled_applicant_count = ?,
          sbv_invited_to_all_known_interviews = ?, sbv_participated = ?,
          hearing_requested_date = ?, hearing_due_date = ?, statement_submitted_date = ?,
          decision_known_date = ?, decision_before_hearing = ?, br_procedure_date = ?,
          flagged_for_violation_review = ?, violation_review_reason = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      normalizeOptionalText(input.vacancyTitle) ?? existing.vacancyTitle,
      input.vacancyReference !== undefined ? normalizeOptionalText(input.vacancyReference) : existing.vacancyReference ?? null,
      input.department !== undefined ? normalizeOptionalText(input.department) : existing.department ?? null,
      input.location !== undefined ? normalizeOptionalText(input.location) : existing.location ?? null,
      nextStatus,
      input.employerNoticeDate !== undefined ? normalizeOptionalIso(input.employerNoticeDate) : existing.employerNoticeDate ?? null,
      input.documentsReceivedDate !== undefined ? normalizeOptionalIso(input.documentsReceivedDate) : existing.documentsReceivedDate ?? null,
      input.documentsComplete !== undefined ? (input.documentsComplete ? 1 : 0) : existing.documentsComplete ? 1 : 0,
      input.hasSeverelyDisabledApplicants !== undefined ? (input.hasSeverelyDisabledApplicants ? 1 : 0) : existing.hasSeverelyDisabledApplicants ? 1 : 0,
      input.severelyDisabledApplicantCount !== undefined ? normalizeNonNegativeInteger(input.severelyDisabledApplicantCount) : existing.severelyDisabledApplicantCount ?? null,
      input.sbvInvitedToAllKnownInterviews !== undefined ? sqliteOptionalBoolean(input.sbvInvitedToAllKnownInterviews) : existing.sbvInvitedToAllKnownInterviews === undefined ? null : existing.sbvInvitedToAllKnownInterviews ? 1 : 0,
      input.sbvParticipated !== undefined ? sqliteOptionalBoolean(input.sbvParticipated) : existing.sbvParticipated === undefined ? null : existing.sbvParticipated ? 1 : 0,
      input.hearingRequestedDate !== undefined ? normalizeOptionalIso(input.hearingRequestedDate) : existing.hearingRequestedDate ?? null,
      input.hearingDueDate !== undefined ? normalizeOptionalIso(input.hearingDueDate) : existing.hearingDueDate ?? null,
      input.statementSubmittedDate !== undefined ? normalizeOptionalIso(input.statementSubmittedDate) : existing.statementSubmittedDate ?? null,
      input.decisionKnownDate !== undefined ? normalizeOptionalIso(input.decisionKnownDate) : existing.decisionKnownDate ?? null,
      input.decisionBeforeHearing !== undefined ? (input.decisionBeforeHearing ? 1 : 0) : existing.decisionBeforeHearing ? 1 : 0,
      input.brProcedureDate !== undefined ? normalizeOptionalIso(input.brProcedureDate) : existing.brProcedureDate ?? null,
      flaggedForViolationReview ? 1 : 0,
      violationReviewReason,
      input.notes !== undefined ? normalizeOptionalText(input.notes) : existing.notes ?? null,
      nowIso(),
      id
    );
      this.lifecycleAudit.statusChanged('recruiting', id, undefined, existing.status, nextStatus);
      this.auditLog.append({ action: 'update', subjectType: 'recruiting_participation', subjectId: id, purpose: 'Stellenbesetzung aktualisiert; Audit enthält keine Freitexte aus Verfahrensnotizen.', metadata: { status: nextStatus, flaggedForViolationReview } });
    });
    return this.getById(id)!;
  }

  setStatus(id: string, status: RecruitingParticipationRecord['status']): RecruitingParticipationRecord {
    return this.update(id, { status });
  }

  delete(id: string): void {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Stellenbesetzung nicht gefunden: ${id}`);
    this.ensureParticipationCanBeDeleted(id);
    new DatabaseUnitOfWork(this.database).run(() => {
      this.lifecycleAudit.deleted('recruiting', id, undefined, existing.status, 'single_measure');
      this.database.prepare('DELETE FROM recruiting_participations WHERE id = ?').run(id);
      this.auditLog.append({ action: 'delete', subjectType: 'recruiting_participation', subjectId: id, purpose: 'Stellenbesetzung gelöscht; zugehörige Interview-Ereignisse wurden kaskadiert gelöscht.', metadata: { cascade: 'recruiting_interview_events' } });
    });
  }

  listInterviews(recruitingParticipationId: string): RecruitingInterviewEventRecord[] {
    this.ensureParticipationExists(recruitingParticipationId);
    this.audit('read', recruitingParticipationId, 'Vorstellungsgesprächsereignisse anzeigen; Audit enthält keine Bewerberreferenzen.', { scope: 'interviews' });
    return this.database.prepare<RecruitingInterviewRow>(`
      SELECT * FROM recruiting_interview_events
      WHERE recruiting_participation_id = ?
      ORDER BY interview_date ASC, created_at ASC
    `).all(recruitingParticipationId).map(mapInterview);
  }

  addInterview(input: CreateRecruitingInterviewEventInput): RecruitingInterviewEventRecord {
    this.ensureParticipationExists(input.recruitingParticipationId);
    const id = randomUUID();
    const timestamp = nowIso();
    const nextSequence = this.interviewCount(input.recruitingParticipationId) + 1;
    const applicantRef = normalizeOptionalText(input.applicantRef) ?? defaultApplicantReference(nextSequence);
    this.database.prepare(`
      INSERT INTO recruiting_interview_events (
        id, recruiting_participation_id, interview_date, applicant_ref, applicant_reference_mode,
        applicant_status, sbv_invited, sbv_invitation_date, sbv_attended,
        accessibility_check_status, follow_up_needed, procedural_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.recruitingParticipationId,
      normalizeRequiredIso(input.interviewDate, 'Datum des Vorstellungsgesprächs'),
      applicantRef,
      normalizeApplicantReferenceMode(input.applicantReferenceMode),
      normalizeApplicantStatus(input.applicantStatus),
      input.sbvInvited ? 1 : 0,
      normalizeOptionalIso(input.sbvInvitationDate),
      input.sbvAttended ? 1 : 0,
      normalizeAccessibilityCheckStatus(input.accessibilityCheckStatus),
      input.followUpNeeded ? 1 : 0,
      normalizeOptionalText(input.proceduralNote),
      timestamp,
      timestamp
    );
    this.refreshInterviewCount(input.recruitingParticipationId);
    this.audit('create', input.recruitingParticipationId, 'Vorstellungsgespräch als Verfahrensereignis angelegt; Audit enthält keine Bewerberreferenz und keine Verfahrensnotiz.', {
      interviewEventId: id,
      applicantReferenceMode: normalizeApplicantReferenceMode(input.applicantReferenceMode),
      applicantStatus: normalizeApplicantStatus(input.applicantStatus),
      sbvInvited: Boolean(input.sbvInvited),
      sbvAttended: Boolean(input.sbvAttended),
      proceduralNotePresent: Boolean(normalizeOptionalText(input.proceduralNote)),
    });
    return this.getInterviewById(id)!;
  }

  getInterviewById(id: string): RecruitingInterviewEventRecord | undefined {
    const row = this.database.prepare<RecruitingInterviewRow>('SELECT * FROM recruiting_interview_events WHERE id = ?').get(id);
    return row ? mapInterview(row) : undefined;
  }

  updateInterview(id: string, input: UpdateRecruitingInterviewEventInput): RecruitingInterviewEventRecord {
    const existing = this.getInterviewById(id);
    if (!existing) throw new Error(`Vorstellungsgesprächsereignis nicht gefunden: ${id}`);
    this.database.prepare(`
      UPDATE recruiting_interview_events
      SET interview_date = ?, applicant_ref = ?, applicant_reference_mode = ?, applicant_status = ?,
          sbv_invited = ?, sbv_invitation_date = ?, sbv_attended = ?, accessibility_check_status = ?,
          follow_up_needed = ?, procedural_note = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.interviewDate !== undefined ? normalizeRequiredIso(input.interviewDate, 'Datum des Vorstellungsgesprächs') : existing.interviewDate,
      input.applicantRef !== undefined ? normalizeOptionalText(input.applicantRef) ?? existing.applicantRef : existing.applicantRef,
      input.applicantReferenceMode !== undefined ? normalizeApplicantReferenceMode(input.applicantReferenceMode) : existing.applicantReferenceMode,
      input.applicantStatus !== undefined ? normalizeApplicantStatus(input.applicantStatus) : existing.applicantStatus,
      input.sbvInvited !== undefined ? (input.sbvInvited ? 1 : 0) : existing.sbvInvited ? 1 : 0,
      input.sbvInvitationDate !== undefined ? normalizeOptionalIso(input.sbvInvitationDate) : existing.sbvInvitationDate ?? null,
      input.sbvAttended !== undefined ? (input.sbvAttended ? 1 : 0) : existing.sbvAttended ? 1 : 0,
      input.accessibilityCheckStatus !== undefined ? normalizeAccessibilityCheckStatus(input.accessibilityCheckStatus) : existing.accessibilityCheckStatus,
      input.followUpNeeded !== undefined ? (input.followUpNeeded ? 1 : 0) : existing.followUpNeeded ? 1 : 0,
      input.proceduralNote !== undefined ? normalizeOptionalText(input.proceduralNote) : existing.proceduralNote ?? null,
      nowIso(),
      id
    );
    this.audit('update', existing.recruitingParticipationId, 'Vorstellungsgesprächsereignis aktualisiert; Audit protokolliert nur Strukturmetadaten.', {
      interviewEventId: id,
      proceduralNoteChanged: input.proceduralNote !== undefined,
      applicantReferenceMode: input.applicantReferenceMode ?? existing.applicantReferenceMode,
    });
    return this.getInterviewById(id)!;
  }

  deleteInterview(id: string): void {
    const existing = this.getInterviewById(id);
    if (!existing) throw new Error(`Vorstellungsgesprächsereignis nicht gefunden: ${id}`);
    this.database.prepare('DELETE FROM recruiting_interview_events WHERE id = ?').run(id);
    this.refreshInterviewCount(existing.recruitingParticipationId);
    this.audit('delete', existing.recruitingParticipationId, 'Vorstellungsgesprächsereignis gelöscht.', { interviewEventId: id });
  }
}
