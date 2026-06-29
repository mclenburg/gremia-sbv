import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type {
  CreateRecruitingInterviewEventInput,
  CreateRecruitingParticipationInput,
  RecruitingInterviewEventRecord,
  RecruitingParticipationRecord,
  RecruitingViolationReviewReason,
  UpdateRecruitingInterviewEventInput,
  UpdateRecruitingParticipationInput,
} from '../src/app/core/models/recruiting-participation.model.js';
import {
  defaultApplicantReference,
  normalizeAccessibilityCheckStatus,
  normalizeApplicantReferenceMode,
  normalizeApplicantStatus,
  normalizeBoolean,
  normalizeNonNegativeInteger,
  normalizeOptionalBoolean,
  normalizeOptionalIso,
  normalizeOptionalText,
  normalizeRecruitingParticipationStatus,
  normalizeRequiredIso,
  normalizeViolationReviewReason,
} from './recruitingParticipationValidation.js';

function nowIso(): string {
  return new Date().toISOString();
}

function bool(value: unknown): boolean {
  return Boolean(value);
}

function undefinedIfNull<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

function mapParticipation(row: any): RecruitingParticipationRecord {
  return {
    id: row.id,
    vacancyTitle: row.vacancy_title,
    vacancyReference: undefinedIfNull(row.vacancy_reference),
    department: undefinedIfNull(row.department),
    location: undefinedIfNull(row.location),
    status: row.status,
    employerNoticeDate: undefinedIfNull(row.employer_notice_date),
    documentsReceivedDate: undefinedIfNull(row.documents_received_date),
    documentsComplete: bool(row.documents_complete),
    hasSeverelyDisabledApplicants: bool(row.has_severely_disabled_applicants),
    severelyDisabledApplicantCount: row.severely_disabled_applicant_count === null || row.severely_disabled_applicant_count === undefined ? undefined : Number(row.severely_disabled_applicant_count),
    interviewCount: Number(row.interview_count ?? 0),
    sbvInvitedToAllKnownInterviews: row.sbv_invited_to_all_known_interviews === null || row.sbv_invited_to_all_known_interviews === undefined ? undefined : bool(row.sbv_invited_to_all_known_interviews),
    sbvParticipated: row.sbv_participated === null || row.sbv_participated === undefined ? undefined : bool(row.sbv_participated),
    hearingRequestedDate: undefinedIfNull(row.hearing_requested_date),
    hearingDueDate: undefinedIfNull(row.hearing_due_date),
    statementSubmittedDate: undefinedIfNull(row.statement_submitted_date),
    decisionKnownDate: undefinedIfNull(row.decision_known_date),
    decisionBeforeHearing: bool(row.decision_before_hearing),
    brProcedureDate: undefinedIfNull(row.br_procedure_date),
    flaggedForViolationReview: bool(row.flagged_for_violation_review),
    violationReviewReason: undefinedIfNull(row.violation_review_reason) as RecruitingViolationReviewReason | undefined,
    notes: undefinedIfNull(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInterview(row: any): RecruitingInterviewEventRecord {
  return {
    id: row.id,
    recruitingParticipationId: row.recruiting_participation_id,
    interviewDate: row.interview_date,
    applicantRef: row.applicant_ref,
    applicantReferenceMode: row.applicant_reference_mode,
    applicantStatus: row.applicant_status,
    sbvInvited: bool(row.sbv_invited),
    sbvInvitationDate: undefinedIfNull(row.sbv_invitation_date),
    sbvAttended: bool(row.sbv_attended),
    accessibilityCheckStatus: row.accessibility_check_status,
    followUpNeeded: bool(row.follow_up_needed),
    proceduralNote: undefinedIfNull(row.procedural_note),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RecruitingParticipationService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recruiting_participations (
        id TEXT PRIMARY KEY,
        vacancy_title TEXT NOT NULL,
        vacancy_reference TEXT,
        department TEXT,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','notice_received','interviews_scheduled','interviews_completed','hearing_pending','statement_submitted','decision_known','closed')),
        employer_notice_date TEXT,
        documents_received_date TEXT,
        documents_complete INTEGER NOT NULL DEFAULT 0 CHECK (documents_complete IN (0,1)),
        has_severely_disabled_applicants INTEGER NOT NULL DEFAULT 0 CHECK (has_severely_disabled_applicants IN (0,1)),
        severely_disabled_applicant_count INTEGER,
        interview_count INTEGER NOT NULL DEFAULT 0,
        sbv_invited_to_all_known_interviews INTEGER CHECK (sbv_invited_to_all_known_interviews IN (0,1)),
        sbv_participated INTEGER CHECK (sbv_participated IN (0,1)),
        hearing_requested_date TEXT,
        hearing_due_date TEXT,
        statement_submitted_date TEXT,
        decision_known_date TEXT,
        decision_before_hearing INTEGER NOT NULL DEFAULT 0 CHECK (decision_before_hearing IN (0,1)),
        br_procedure_date TEXT,
        flagged_for_violation_review INTEGER NOT NULL DEFAULT 0 CHECK (flagged_for_violation_review IN (0,1)),
        violation_review_reason TEXT CHECK (violation_review_reason IS NULL OR violation_review_reason IN ('decision_before_hearing','missing_hearing_after_interview','incomplete_information','sbv_not_invited','execution_without_remedy','manual_review')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recruiting_interview_events (
        id TEXT PRIMARY KEY,
        recruiting_participation_id TEXT NOT NULL REFERENCES recruiting_participations(id) ON DELETE CASCADE,
        interview_date TEXT NOT NULL,
        applicant_ref TEXT NOT NULL,
        applicant_reference_mode TEXT NOT NULL DEFAULT 'anonymous_reference' CHECK (applicant_reference_mode IN ('anonymous_reference','pseudonymized_reference','clear_name')),
        applicant_status TEXT NOT NULL DEFAULT 'unknown_or_not_relevant' CHECK (applicant_status IN ('severely_disabled','equal_status','unknown_or_not_relevant')),
        sbv_invited INTEGER NOT NULL DEFAULT 0 CHECK (sbv_invited IN (0,1)),
        sbv_invitation_date TEXT,
        sbv_attended INTEGER NOT NULL DEFAULT 0 CHECK (sbv_attended IN (0,1)),
        accessibility_check_status TEXT NOT NULL DEFAULT 'not_checked' CHECK (accessibility_check_status IN ('not_checked','not_relevant','contact_offered','format_checked','follow_up_needed')),
        follow_up_needed INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_needed IN (0,1)),
        procedural_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recruiting_participations_status ON recruiting_participations(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_recruiting_participations_notice ON recruiting_participations(employer_notice_date DESC);
      CREATE INDEX IF NOT EXISTS idx_recruiting_participations_hearing ON recruiting_participations(hearing_due_date, status);
      CREATE INDEX IF NOT EXISTS idx_recruiting_participations_violation_flag ON recruiting_participations(flagged_for_violation_review, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_recruiting_participations_reference ON recruiting_participations(vacancy_reference);
      CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_participation ON recruiting_interview_events(recruiting_participation_id, interview_date);
      CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_accessibility ON recruiting_interview_events(accessibility_check_status, follow_up_needed);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, purpose: string, metadata?: Record<string, unknown>): void {
    try {
      new PersonalDataAuditLogService(this.db).append({
        action,
        subjectType: 'recruiting_participation',
        subjectId,
        purpose,
        metadata,
      });
    } catch (error) {
      console.warn('Gremia.SBV recruiting participation audit write failed', error);
    }
  }

  private tableExists(tableName: string): boolean {
    const row = this.db.prepare<{ value: number }>("SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
    return Boolean(row);
  }

  private ensureParticipationExists(id: string): void {
    const row = this.db.prepare<{ value: number }>('SELECT 1 AS value FROM recruiting_participations WHERE id = ?').get(id);
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
        const row = this.db.prepare<{ count: number }>(check.sql).get(...params);
        return { label: check.label, count: Number(row?.count ?? 0) };
      })
      .filter((check) => check.count > 0);
    if (blocking.length > 0) {
      throw new Error(`Stellenbesetzung kann nicht gelöscht werden, weil abhängige Nachweisobjekte existieren: ${blocking.map((item) => `${item.label} (${item.count})`).join(', ')}.`);
    }
  }

  private interviewCount(participationId: string): number {
    const row = this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM recruiting_interview_events WHERE recruiting_participation_id = ?').get(participationId);
    return Number(row?.count ?? 0);
  }

  private refreshInterviewCount(participationId: string): void {
    const count = this.interviewCount(participationId);
    this.db.prepare('UPDATE recruiting_participations SET interview_count = ?, updated_at = ? WHERE id = ?').run(count, nowIso(), participationId);
  }

  list(): RecruitingParticipationRecord[] {
    this.audit('read', undefined, 'Stellenbesetzungen anzeigen', { scope: 'list' });
    return this.db.prepare<any>(`
      SELECT * FROM recruiting_participations
      ORDER BY COALESCE(employer_notice_date, created_at) DESC, updated_at DESC
    `).all().map(mapParticipation);
  }

  getById(id: string): RecruitingParticipationRecord | undefined {
    this.audit('read', id, 'Stellenbesetzung anzeigen', { scope: 'detail' });
    const row = this.db.prepare<any>('SELECT * FROM recruiting_participations WHERE id = ?').get(id);
    return row ? mapParticipation(row) : undefined;
  }

  create(input: CreateRecruitingParticipationInput): RecruitingParticipationRecord {
    const vacancyTitle = normalizeOptionalText(input.vacancyTitle);
    if (!vacancyTitle) throw new Error('Eine Stellenbesetzung benötigt eine Stellenbezeichnung.');
    const id = randomUUID();
    const timestamp = nowIso();
    const flaggedForViolationReview = normalizeBoolean(input.flaggedForViolationReview);
    const violationReviewReason = flaggedForViolationReview ? normalizeViolationReviewReason(input.violationReviewReason) ?? 'manual_review' : null;

    this.db.prepare(`
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
      normalizeOptionalBoolean(input.sbvInvitedToAllKnownInterviews),
      normalizeOptionalBoolean(input.sbvParticipated),
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
    this.audit('create', id, 'Stellenbesetzung angelegt; Audit enthält keine Bewerberdaten oder Gesprächsinhalte.', { status: normalizeRecruitingParticipationStatus(input.status), flaggedForViolationReview });
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

    this.db.prepare(`
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
      input.sbvInvitedToAllKnownInterviews !== undefined ? normalizeOptionalBoolean(input.sbvInvitedToAllKnownInterviews) : existing.sbvInvitedToAllKnownInterviews === undefined ? null : existing.sbvInvitedToAllKnownInterviews ? 1 : 0,
      input.sbvParticipated !== undefined ? normalizeOptionalBoolean(input.sbvParticipated) : existing.sbvParticipated === undefined ? null : existing.sbvParticipated ? 1 : 0,
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
    this.audit('update', id, 'Stellenbesetzung aktualisiert; Audit enthält keine Freitexte aus Verfahrensnotizen.', { status: nextStatus, flaggedForViolationReview });
    return this.getById(id)!;
  }

  setStatus(id: string, status: RecruitingParticipationRecord['status']): RecruitingParticipationRecord {
    return this.update(id, { status });
  }

  delete(id: string): void {
    this.ensureParticipationExists(id);
    this.ensureParticipationCanBeDeleted(id);
    this.db.prepare('DELETE FROM recruiting_participations WHERE id = ?').run(id);
    this.audit('delete', id, 'Stellenbesetzung gelöscht; zugehörige Interview-Ereignisse wurden kaskadiert gelöscht.', { cascade: 'recruiting_interview_events' });
  }

  listInterviews(recruitingParticipationId: string): RecruitingInterviewEventRecord[] {
    this.ensureParticipationExists(recruitingParticipationId);
    this.audit('read', recruitingParticipationId, 'Vorstellungsgesprächsereignisse anzeigen; Audit enthält keine Bewerberreferenzen.', { scope: 'interviews' });
    return this.db.prepare<any>(`
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
    this.db.prepare(`
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
    const row = this.db.prepare<any>('SELECT * FROM recruiting_interview_events WHERE id = ?').get(id);
    return row ? mapInterview(row) : undefined;
  }

  updateInterview(id: string, input: UpdateRecruitingInterviewEventInput): RecruitingInterviewEventRecord {
    const existing = this.getInterviewById(id);
    if (!existing) throw new Error(`Vorstellungsgesprächsereignis nicht gefunden: ${id}`);
    this.db.prepare(`
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
    this.db.prepare('DELETE FROM recruiting_interview_events WHERE id = ?').run(id);
    this.refreshInterviewCount(existing.recruitingParticipationId);
    this.audit('delete', existing.recruitingParticipationId, 'Vorstellungsgesprächsereignis gelöscht.', { interviewEventId: id });
  }
}
