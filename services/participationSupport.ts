import type { ParticipationRecord, ParticipationStatus, ParticipationWarning } from "../src/app/core/models/participation.model.js";
export interface ParticipationRow {
  id: string; case_id: string; title: string; measure_status?: string | null; risk_level: ParticipationRecord['riskLevel'] | null;
  summary?: string | null; next_step: string | null; due_at?: string | null; employer_measure_type?: ParticipationRecord['measureType'] | null;
  measure_type?: ParticipationRecord['measureType'] | null; person_status: ParticipationRecord['personStatus'] | null;
  decision_stage: ParticipationRecord['decisionStage'] | null; participation_status?: ParticipationStatus | null; status?: ParticipationStatus | null;
  sbv_knowledge_at?: string | null; first_known_at?: string | null; employer_information_at?: string | null;
  information_received_at?: string | null; hearing_requested_at: string | null; sbv_statement_due_at?: string | null;
  statement_due_at?: string | null; sbv_statement_submitted_at?: string | null; statement_submitted_at?: string | null;
  employer_decision_at: string | null; implementation_at: string | null; information_complete: number;
  hearing_before_decision: number; decision_notified: number; suspension_requested_at: string | null;
  suspension_deadline_at?: string | null; suspension_due_at?: string | null; violation_summary?: string | null;
  violation_assessment?: string | null; sbv_position: string | null; created_at: string; updated_at: string;
}
export interface SqliteTableRow { name: string; }
export interface IdRow { id: string; }
export interface ParticipationDetailIdRow { measure_id: string; }

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function toBool(value: unknown): boolean {
  return Boolean(value);
}

export function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function participationStatusToMeasureStatus(
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

export function mapRecord(row: ParticipationRow): ParticipationRecord {
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

