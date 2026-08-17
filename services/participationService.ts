import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { randomUUID } from "node:crypto";
import type { DatabaseAdapter } from "./databaseService.js";
import { DeadlineService } from "./deadlineService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import { CaseMeasureService } from "./caseMeasureService.js";
import type { CreateParticipationInput, ParticipationDashboardSummary, ParticipationRecord, ParticipationStatus, ParticipationWarning, UpdateParticipationInput } from "../src/domain/models/participation.model.js";
import { ParticipationRow, nowIso, toIso, addDaysIso, participationStatusToMeasureStatus, mapRecord, evaluateParticipationWarnings } from './participationSupport.js';
export { evaluateParticipationWarnings } from './participationSupport.js';
import { ensureParticipationSchema } from './participationSchema.js';
export class ParticipationService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly caseMeasures: CaseMeasureService = new CaseMeasureService(db),
    private readonly deadlines: DeadlineService = new DeadlineService(db),
    private readonly auditLog: PersonalDataAuditLogService = new PersonalDataAuditLogService(db),
  ) {}

  ensureSchema(): void {
    ensureParticipationSchema(this.db, this.caseMeasures);
    void this.auditLog;
  }

  private audit(
    action: Parameters<PersonalDataAuditLogService["append"]>[0]["action"],
    subjectId: string | undefined,
    caseId: string | undefined,
    purpose: string,
  ): void {
      this.auditLog.append({
        action,
        subjectType: "case_measure_participation",
        subjectId,
        caseId,
        purpose,
      });
  }

  private query(caseId?: string): ParticipationRecord[] {
    const sql = `
      SELECT cm.id, cm.case_id, cm.title, cm.status AS measure_status, cm.risk_level, cm.summary, cm.next_step, cm.due_at,
             cm.created_at AS created_at, cm.updated_at AS updated_at,
             p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status,
             p.sbv_knowledge_at, p.employer_information_at, p.hearing_requested_at, p.sbv_statement_due_at,
             p.sbv_statement_submitted_at, p.employer_decision_at, p.implementation_at,
             p.information_complete, p.hearing_before_decision, p.decision_notified,
             p.suspension_requested_at, p.suspension_deadline_at, p.violation_summary, p.sbv_position
      FROM case_measures cm
      JOIN case_measure_participation p ON p.measure_id = cm.id
      WHERE cm.type = 'sbv_participation' ${caseId ? "AND cm.case_id = ?" : ""}
      ORDER BY COALESCE(p.sbv_statement_due_at, p.suspension_deadline_at, cm.due_at, cm.updated_at) DESC
    `;
    const rows = caseId
      ? this.db.prepare<ParticipationRow>(sql).all(caseId)
      : this.db.prepare<ParticipationRow>(sql).all();
    return rows.map(mapRecord);
  }

  list(caseId?: string): ParticipationRecord[] {
    this.audit(
      "read",
      undefined,
      caseId,
      caseId
        ? "SBV-Beteiligungsmaßnahmen einer Fallakte anzeigen"
        : "SBV-Beteiligungscockpit anzeigen",
    );
    return this.query(caseId);
  }

  dashboardSummary(): ParticipationDashboardSummary {
    const rows = this.list();
    return {
      open: rows.filter(
        (row) =>
          !["abgeschlossen", "pflichtverstoss_dokumentiert"].includes(
            row.status,
          ),
      ).length,
      critical: rows.filter((row) => row.riskLevel === "kritisch").length,
      suspensionOpen: rows.filter((row) => row.status === "aussetzung_verlangt")
        .length,
      violations: rows.filter(
        (row) =>
          row.status === "pflichtverstoss_dokumentiert" ||
          evaluateParticipationWarnings(row).some(
            (warning) => warning.level === "critical",
          ),
      ).length,
    };
  }

  getById(id: string): ParticipationRecord | undefined {
    this.audit(
      "read",
      id,
      undefined,
      "SBV-Beteiligungsmaßnahme Detail anzeigen",
    );
    const row = this.db
      .prepare<ParticipationRow>(
        `
      SELECT cm.id, cm.case_id, cm.title, cm.status AS measure_status, cm.risk_level, cm.summary, cm.next_step, cm.due_at,
             cm.created_at AS created_at, cm.updated_at AS updated_at,
             p.employer_measure_type, p.person_status, p.decision_stage, p.participation_status,
             p.sbv_knowledge_at, p.employer_information_at, p.hearing_requested_at, p.sbv_statement_due_at,
             p.sbv_statement_submitted_at, p.employer_decision_at, p.implementation_at,
             p.information_complete, p.hearing_before_decision, p.decision_notified,
             p.suspension_requested_at, p.suspension_deadline_at, p.violation_summary, p.sbv_position
      FROM case_measures cm
      JOIN case_measure_participation p ON p.measure_id = cm.id
      WHERE cm.id = ?
    `,
      )
      .get(id);
    return row ? mapRecord(row) : undefined;
  }

  create(input: CreateParticipationInput): ParticipationRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    if (!input.caseId)
      throw new Error(
        "Eine Beteiligungsmaßnahme muss aus einer Fallakte heraus angelegt werden.",
      );
    if (!input.title?.trim())
      throw new Error("Eine Beteiligungsmaßnahme benötigt einen Titel.");

    const timestamp = nowIso();
    const status: ParticipationStatus = input.informationReceivedAt
      ? "unterrichtung_pruefen"
      : "neu";
    const measure = this.caseMeasures.create({
      caseId: input.caseId,
      type: "sbv_participation",
      title: input.title.trim(),
      status: participationStatusToMeasureStatus(status),
      riskLevel: input.riskLevel ?? "normal",
      createdFrom: input.createdFrom ?? "manual",
      summary: input.violationSummary || undefined,
      nextStep: input.nextStep || undefined,
      dueAt: input.statementDueAt,
      openedAt: input.firstKnownAt,
      requiresFollowUp: input.requiresFollowUp ?? true,
    });

    this.db
      .prepare(
        `
      INSERT INTO case_measure_participation (
        measure_id, employer_measure_type, person_status, decision_stage, participation_status,
        sbv_knowledge_at, employer_information_at, hearing_requested_at, sbv_statement_due_at,
        information_complete, hearing_before_decision, decision_notified,
        suspension_deadline_at, violation_summary, sbv_position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        measure.id,
        input.measureType ?? "sonstiges",
        input.personStatus ?? "unklar",
        input.decisionStage ?? "unklar",
        status,
        toIso(input.firstKnownAt),
        toIso(input.informationReceivedAt),
        toIso(input.hearingRequestedAt),
        toIso(input.statementDueAt),
        input.informationComplete ? 1 : 0,
        input.hearingBeforeDecision ? 1 : 0,
        input.decisionNotified ? 1 : 0,
        null,
        input.violationSummary ?? null,
        input.sbvPosition ?? null,
        timestamp,
        timestamp,
      );

    this.event(
      measure.id,
      "created",
      "SBV-Beteiligungsmaßnahme angelegt",
      input.title,
    );

    if (input.createDefaultDeadlines !== false && input.statementDueAt) {
      this.deadlines.create({
        caseId: input.caseId,
        processId: measure.id,
        processType: "custom",
        deadlineType: "workflow_step",
        title: "SBV-Stellungnahmefrist prüfen",
        confidentialTitle: `SBV-Beteiligung: ${input.title.trim()}`,
        description:
          "Automatische Wiedervorlage aus der fallaktenbezogenen SBV-Beteiligungsmaßnahme.",
        dueAt: new Date(input.statementDueAt).toISOString(),
        legalBasis: "§ 178 Abs. 2 Satz 1 SGB IX",
        sourceEvent: "case_measure_participation_created",
        severity: input.riskLevel === "kritisch" ? "critical" : "important",
        calculationMode: "workflow",
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24,
      });
    }

    this.audit(
      "create",
      measure.id,
      input.caseId,
      "SBV-Beteiligungsmaßnahme in Fallakte angelegt",
    );
    return this.getById(measure.id)!;
  
    });
  }

  update(id: string, input: UpdateParticipationInput): ParticipationRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    const existing = this.getById(id);
    if (!existing)
      throw new Error(`SBV-Beteiligungsmaßnahme nicht gefunden: ${id}`);

    const suspensionRequestedAt =
      input.suspensionRequestedAt !== undefined
        ? input.suspensionRequestedAt
        : existing.suspensionRequestedAt;
    const suspensionDueAt =
      input.suspensionDueAt !== undefined
        ? input.suspensionDueAt
        : !existing.suspensionDueAt && suspensionRequestedAt
          ? addDaysIso(new Date(suspensionRequestedAt).toISOString(), 7)
          : existing.suspensionDueAt;
    const nextStatus =
      input.status ??
      (input.suspensionRequestedAt ? "aussetzung_verlangt" : existing.status);
    const timestamp = nowIso();

    this.caseMeasures.update(id, {
      title: input.title !== undefined ? input.title : existing.title,
      status: participationStatusToMeasureStatus(nextStatus),
      riskLevel: input.riskLevel ?? existing.riskLevel,
      summary:
        input.violationSummary !== undefined
          ? input.violationSummary
          : existing.violationSummary,
      nextStep:
        input.nextStep !== undefined ? input.nextStep : existing.nextStep,
      dueAt:
        input.statementDueAt !== undefined
          ? input.statementDueAt
          : existing.statementDueAt,
      closedAt:
        nextStatus === "abgeschlossen" ||
        nextStatus === "pflichtverstoss_dokumentiert"
          ? timestamp
          : undefined,
      requiresFollowUp: ![
        "abgeschlossen",
        "pflichtverstoss_dokumentiert",
      ].includes(nextStatus),
    });

    this.db
      .prepare(
        `
      UPDATE case_measure_participation
      SET employer_measure_type = ?, person_status = ?, decision_stage = ?, participation_status = ?,
          sbv_knowledge_at = ?, employer_information_at = ?, hearing_requested_at = ?, sbv_statement_due_at = ?,
          sbv_statement_submitted_at = ?, employer_decision_at = ?, implementation_at = ?,
          information_complete = ?, hearing_before_decision = ?, decision_notified = ?,
          suspension_requested_at = ?, suspension_deadline_at = ?, violation_summary = ?, sbv_position = ?, updated_at = ?
      WHERE measure_id = ?
    `,
      )
      .run(
        input.measureType ?? existing.measureType,
        input.personStatus ?? existing.personStatus,
        input.decisionStage ?? existing.decisionStage,
        nextStatus,
        input.firstKnownAt !== undefined
          ? toIso(input.firstKnownAt)
          : (existing.firstKnownAt ?? null),
        input.informationReceivedAt !== undefined
          ? toIso(input.informationReceivedAt)
          : (existing.informationReceivedAt ?? null),
        input.hearingRequestedAt !== undefined
          ? toIso(input.hearingRequestedAt)
          : (existing.hearingRequestedAt ?? null),
        input.statementDueAt !== undefined
          ? toIso(input.statementDueAt)
          : (existing.statementDueAt ?? null),
        input.statementSubmittedAt !== undefined
          ? toIso(input.statementSubmittedAt)
          : (existing.statementSubmittedAt ?? null),
        input.employerDecisionAt !== undefined
          ? toIso(input.employerDecisionAt)
          : (existing.employerDecisionAt ?? null),
        input.implementationAt !== undefined
          ? toIso(input.implementationAt)
          : (existing.implementationAt ?? null),
        input.informationComplete !== undefined
          ? input.informationComplete
            ? 1
            : 0
          : existing.informationComplete
            ? 1
            : 0,
        input.hearingBeforeDecision !== undefined
          ? input.hearingBeforeDecision
            ? 1
            : 0
          : existing.hearingBeforeDecision
            ? 1
            : 0,
        input.decisionNotified !== undefined
          ? input.decisionNotified
            ? 1
            : 0
          : existing.decisionNotified
            ? 1
            : 0,
        suspensionRequestedAt
          ? new Date(suspensionRequestedAt).toISOString()
          : null,
        suspensionDueAt ? new Date(suspensionDueAt).toISOString() : null,
        input.violationSummary !== undefined
          ? input.violationSummary
          : (existing.violationSummary ?? null),
        input.sbvPosition !== undefined
          ? input.sbvPosition
          : (existing.sbvPosition ?? null),
        timestamp,
        id,
      );

    if (input.suspensionRequestedAt && suspensionDueAt) {
      this.deadlines.create({
        caseId: existing.caseId,
        processId: id,
        processType: "custom",
        deadlineType: "workflow_step",
        title: "Nachholung SBV-Beteiligung nachhalten",
        confidentialTitle: `Aussetzungsverlangen: ${existing.title}`,
        description:
          "Wiedervorlage aus der fallaktenbezogenen SBV-Beteiligungsmaßnahme nach Aussetzungsverlangen.",
        dueAt: suspensionDueAt,
        legalBasis: "§ 178 Abs. 2 Satz 2 SGB IX",
        sourceEvent: "case_measure_participation_suspension_requested",
        severity: "critical",
        calculationMode: "workflow",
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24,
      });
    }

    this.event(
      id,
      "updated",
      "SBV-Beteiligungsmaßnahme aktualisiert",
      JSON.stringify(input),
    );
    this.audit(
      "update",
      id,
      existing.caseId,
      "SBV-Beteiligungsmaßnahme geändert",
    );
    return this.getById(id)!;
  
    });
  }

  warnings(id: string): ParticipationWarning[] {
    const record = this.getById(id);
    return record ? evaluateParticipationWarnings(record) : [];
  }

  private event(
    measureId: string,
    eventType: string,
    title: string,
    description?: string,
  ): void {
    this.db
      .prepare(
        "INSERT INTO case_measure_events (id, measure_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        randomUUID(),
        measureId,
        eventType,
        title,
        description ?? null,
        nowIso(),
      );
  }
}
