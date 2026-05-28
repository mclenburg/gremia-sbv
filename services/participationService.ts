import { randomUUID } from "node:crypto";
import type { DatabaseAdapter } from "./databaseService.js";
import { DeadlineService } from "./deadlineService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import { CaseMeasureService } from "./caseMeasureService.js";
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationStatus,
  ParticipationWarning,
  UpdateParticipationInput,
} from "../src/app/core/models/participation.model.js";

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toBool(value: unknown): boolean {
  return Boolean(value);
}

function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function participationStatusToMeasureStatus(
  status: ParticipationStatus,
): "open" | "in_progress" | "waiting" | "completed" | "follow_up_required" {
  if (status === "abgeschlossen" || status === "pflichtverstoss_dokumentiert")
    return "completed";
  if (status === "aussetzung_verlangt" || status === "nachholung_laeuft")
    return "follow_up_required";
  if (status === "stellungnahme_abgegeben") return "waiting";
  if (status === "unterrichtung_pruefen" || status === "anhoerung_laeuft")
    return "in_progress";
  return "open";
}

function mapRecord(row: any): ParticipationRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    measureType: row.employer_measure_type ?? row.measure_type ?? "sonstiges",
    status: row.participation_status ?? row.status ?? "neu",
    riskLevel: row.risk_level ?? "normal",
    personStatus: row.person_status ?? "unklar",
    decisionStage: row.decision_stage ?? "unklar",
    firstKnownAt: row.sbv_knowledge_at ?? row.first_known_at ?? undefined,
    informationReceivedAt:
      row.employer_information_at ?? row.information_received_at ?? undefined,
    hearingRequestedAt: row.hearing_requested_at ?? undefined,
    statementDueAt:
      row.sbv_statement_due_at ?? row.statement_due_at ?? undefined,
    statementSubmittedAt:
      row.sbv_statement_submitted_at ?? row.statement_submitted_at ?? undefined,
    employerDecisionAt: row.employer_decision_at ?? undefined,
    implementationAt: row.implementation_at ?? undefined,
    informationComplete: toBool(row.information_complete),
    hearingBeforeDecision: toBool(row.hearing_before_decision),
    decisionNotified: toBool(row.decision_notified),
    suspensionRequestedAt: row.suspension_requested_at ?? undefined,
    suspensionDueAt:
      row.suspension_deadline_at ?? row.suspension_due_at ?? undefined,
    violationSummary:
      row.violation_summary ?? row.violation_assessment ?? undefined,
    sbvPosition: row.sbv_position ?? undefined,
    nextStep: row.next_step ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function evaluateParticipationWarnings(
  record: ParticipationRecord,
): ParticipationWarning[] {
  const warnings: ParticipationWarning[] = [];

  if (!record.informationComplete) {
    warnings.push({
      level: record.riskLevel === "kritisch" ? "critical" : "warning",
      message:
        "Die Unterrichtung ist noch nicht als vollständig dokumentiert. § 178 Abs. 2 Satz 1 SGB IX verlangt rechtzeitige und umfassende Unterrichtung.",
    });
  }

  if (
    record.decisionStage === "entscheidung_getroffen" ||
    record.decisionStage === "umgesetzt"
  ) {
    if (!record.hearingBeforeDecision) {
      warnings.push({
        level: "critical",
        message:
          "Die Anhörung vor der Entscheidung ist nicht dokumentiert. Aussetzungsverlangen nach § 178 Abs. 2 Satz 2 SGB IX prüfen.",
      });
    }
  }

  if (
    !record.decisionNotified &&
    (record.decisionStage === "entscheidung_getroffen" ||
      record.decisionStage === "umgesetzt")
  ) {
    warnings.push({
      level: "warning",
      message:
        "Die Mitteilung der Arbeitgeberentscheidung an die SBV ist noch nicht dokumentiert.",
    });
  }

  if (
    record.statementDueAt &&
    !record.statementSubmittedAt &&
    new Date(record.statementDueAt) < new Date()
  ) {
    warnings.push({
      level: "critical",
      message: "Die dokumentierte Stellungnahmefrist ist abgelaufen.",
    });
  }

  if (
    record.suspensionDueAt &&
    record.status === "aussetzung_verlangt" &&
    new Date(record.suspensionDueAt) < new Date()
  ) {
    warnings.push({
      level: "critical",
      message: "Die Nachholfrist nach Aussetzungsverlangen ist überschritten.",
    });
  }

  if (
    record.status === "pflichtverstoss_dokumentiert" &&
    !record.violationSummary
  ) {
    warnings.push({
      level: "warning",
      message:
        "Pflichtverstoß ist markiert, aber noch nicht begründet dokumentiert.",
    });
  }

  return warnings;
}

export class ParticipationService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  private ensureSchema(): void {
    new CaseMeasureService(this.db).ensureSchema();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measure_participation (
        measure_id TEXT PRIMARY KEY,
        employer_measure_type TEXT NOT NULL DEFAULT 'sonstiges',
        person_status TEXT NOT NULL DEFAULT 'unklar',
        decision_stage TEXT NOT NULL DEFAULT 'unklar',
        participation_status TEXT NOT NULL DEFAULT 'neu',
        sbv_knowledge_at TEXT,
        employer_information_at TEXT,
        hearing_requested_at TEXT,
        sbv_statement_due_at TEXT,
        sbv_statement_submitted_at TEXT,
        employer_decision_at TEXT,
        implementation_at TEXT,
        information_complete INTEGER NOT NULL DEFAULT 0,
        hearing_before_decision INTEGER NOT NULL DEFAULT 0,
        decision_notified INTEGER NOT NULL DEFAULT 0,
        suspension_requested_at TEXT,
        suspension_deadline_at TEXT,
        violation_summary TEXT,
        sbv_position TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS case_measure_events (
        id TEXT PRIMARY KEY,
        measure_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_status ON case_measure_participation(participation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_statement_due ON case_measure_participation(sbv_statement_due_at);
      CREATE INDEX IF NOT EXISTS idx_case_measure_participation_suspension_due ON case_measure_participation(suspension_deadline_at);
    `);
    this.migrateLegacyParticipations();
    new PersonalDataAuditLogService(this.db);
  }

  private migrateLegacyParticipations(): void {
    const hasLegacy = this.db
      .prepare<any>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sbv_participations'",
      )
      .get();
    if (!hasLegacy) return;
    const rows = this.db.prepare<any>("SELECT * FROM sbv_participations").all();
    for (const row of rows) {
      const existing = this.db
        .prepare<any>(
          "SELECT id FROM case_measures WHERE (id = ? OR source_id = ?) AND type = 'sbv_participation'",
        )
        .get(row.id, row.id);
      if (!existing) {
        this.db
          .prepare(
            `
          INSERT INTO case_measures (
            id, case_id, type, title, status, risk_level, created_from, summary, next_step, due_at,
            opened_at, closed_at, requires_follow_up, source_id, created_at, updated_at
          ) VALUES (?, ?, 'sbv_participation', ?, ?, ?, 'migration', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            row.id,
            row.case_id,
            row.title,
            participationStatusToMeasureStatus(row.status ?? "neu"),
            row.risk_level ?? "normal",
            row.violation_summary ?? null,
            row.next_step ?? null,
            row.statement_due_at ?? row.suspension_due_at ?? null,
            row.first_known_at ?? row.created_at,
            row.status === "abgeschlossen" ||
              row.status === "pflichtverstoss_dokumentiert"
              ? row.updated_at
              : null,
            ["neu", "abgeschlossen"].includes(row.status ?? "neu") ? 0 : 1,
            row.id,
            row.created_at,
            row.updated_at,
          );
      }
      const measureId = existing?.id ?? row.id;
      const detail = this.db
        .prepare<any>(
          "SELECT measure_id FROM case_measure_participation WHERE measure_id = ?",
        )
        .get(measureId);
      if (!detail) {
        this.db
          .prepare(
            `
          INSERT INTO case_measure_participation (
            measure_id, employer_measure_type, person_status, decision_stage, participation_status,
            sbv_knowledge_at, employer_information_at, hearing_requested_at, sbv_statement_due_at,
            sbv_statement_submitted_at, employer_decision_at, implementation_at,
            information_complete, hearing_before_decision, decision_notified,
            suspension_requested_at, suspension_deadline_at, violation_summary, sbv_position, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            measureId,
            row.measure_type ?? "sonstiges",
            row.person_status ?? "unklar",
            row.decision_stage ?? "unklar",
            row.status ?? "neu",
            row.first_known_at ?? null,
            row.information_received_at ?? null,
            row.hearing_requested_at ?? null,
            row.statement_due_at ?? null,
            row.statement_submitted_at ?? null,
            row.employer_decision_at ?? null,
            row.implementation_at ?? null,
            row.information_complete ?? 0,
            row.hearing_before_decision ?? 0,
            row.decision_notified ?? 0,
            row.suspension_requested_at ?? null,
            row.suspension_due_at ?? null,
            row.violation_summary ?? null,
            row.sbv_position ?? null,
            row.created_at,
            row.updated_at,
          );
      }
    }
  }

  private audit(
    action: Parameters<PersonalDataAuditLogService["append"]>[0]["action"],
    subjectId: string | undefined,
    caseId: string | undefined,
    purpose: string,
  ): void {
    try {
      new PersonalDataAuditLogService(this.db).append({
        action,
        subjectType: "case_measure_participation",
        subjectId,
        caseId,
        purpose,
      });
    } catch (error) {
      console.warn("Gremia.SBV participation audit write failed", error);
    }
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
      ? this.db.prepare<any>(sql).all(caseId)
      : this.db.prepare<any>(sql).all();
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
      .prepare<any>(
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
    const measure = new CaseMeasureService(this.db).create({
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
      new DeadlineService(this.db).create({
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
  }

  update(id: string, input: UpdateParticipationInput): ParticipationRecord {
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

    new CaseMeasureService(this.db).update(id, {
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
      new DeadlineService(this.db).create({
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
