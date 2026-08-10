import type { WorkplaceAccommodationRecord, WorkplaceAccommodationStatus, WorkplaceAccommodationWarning } from "../src/app/core/models/workplace-accommodation.model.js";
export interface WorkplaceAccommodationRow {
  id: string; case_id: string; title: string; accommodation_status: WorkplaceAccommodationRecord['status'] | null;
  category: WorkplaceAccommodationRecord['category'] | null; risk_level: WorkplaceAccommodationRecord['riskLevel'] | null;
  requested_adjustment: string | null; legal_basis: string | null; barrier_or_limitation: string | null; workplace_context: string | null;
  proposed_solution: string | null; technical_aid_needed: number; organizational_adjustment_needed: number;
  working_time_adjustment_needed: number; qualification_needed: number; fixed_workplace_needed: number;
  homeoffice_or_mobile_work_relevant: number; inclusion_office_involved: number; rehab_carrier_involved: number;
  employer_response_status: WorkplaceAccommodationRecord['employerResponseStatus'] | null; employer_response_at: string | null;
  implementation_status: WorkplaceAccommodationRecord['implementationStatus'] | null; implementation_due_at: string | null;
  effectiveness_review_at: string | null; next_step: string | null; outcome: string | null; created_at: string; updated_at: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function boolToInt(value: boolean | undefined, fallback = false): number {
  return (value ?? fallback) ? 1 : 0;
}

export function toBool(value: unknown): boolean {
  return Boolean(value);
}

export function accommodationStatusToMeasureStatus(
  status: WorkplaceAccommodationStatus,
): "open" | "in_progress" | "waiting" | "completed" | "follow_up_required" {
  if (status === "abgeschlossen") return "completed";
  if (
    status === "unterlagen_fehlen" ||
    status === "arbeitgeber_lehnt_ab" ||
    status === "eskaliert"
  )
    return "follow_up_required";
  if (status === "angefragt" || status === "in_pruefung") return "waiting";
  if (
    status === "in_umsetzung" ||
    status === "wirksamkeitspruefung" ||
    status === "inklusionsamt_einbezogen" ||
    status === "bewilligt"
  )
    return "in_progress";
  return "open";
}

export function mapRecord(row: WorkplaceAccommodationRow): WorkplaceAccommodationRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    status: row.accommodation_status ?? "entwurf",
    category: row.category ?? "sonstiges",
    riskLevel: row.risk_level ?? "normal",
    requestedAdjustment: row.requested_adjustment ?? "",
    legalBasis: row.legal_basis ?? "§ 164 Abs. 4 SGB IX",
    barrierOrLimitation: row.barrier_or_limitation ?? undefined,
    workplaceContext: row.workplace_context ?? undefined,
    proposedSolution: row.proposed_solution ?? undefined,
    technicalAidNeeded: toBool(row.technical_aid_needed),
    organizationalAdjustmentNeeded: toBool(
      row.organizational_adjustment_needed,
    ),
    workingTimeAdjustmentNeeded: toBool(row.working_time_adjustment_needed),
    qualificationNeeded: toBool(row.qualification_needed),
    fixedWorkplaceNeeded: toBool(row.fixed_workplace_needed),
    homeofficeOrMobileWorkRelevant: toBool(
      row.homeoffice_or_mobile_work_relevant,
    ),
    inclusionOfficeInvolved: toBool(row.inclusion_office_involved),
    rehabCarrierInvolved: toBool(row.rehab_carrier_involved),
    employerResponseStatus: row.employer_response_status ?? "offen",
    employerResponseAt: row.employer_response_at ?? undefined,
    implementationStatus: row.implementation_status ?? "nicht_begonnen",
    implementationDueAt: row.implementation_due_at ?? undefined,
    effectivenessReviewAt: row.effectiveness_review_at ?? undefined,
    nextStep: row.next_step ?? undefined,
    outcome: row.outcome ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function evaluateWorkplaceAccommodationWarnings(
  record: WorkplaceAccommodationRecord,
): WorkplaceAccommodationWarning[] {
  const warnings: WorkplaceAccommodationWarning[] = [];
  if (!record.requestedAdjustment.trim()) {
    warnings.push({
      level: "warning",
      message:
        "Die gewünschte behinderungsgerechte Gestaltung ist noch nicht konkret beschrieben.",
    });
  }
  if (
    record.employerResponseStatus === "offen" &&
    record.status !== "entwurf" &&
    record.status !== "abgeschlossen"
  ) {
    warnings.push({
      level: record.riskLevel === "kritisch" ? "critical" : "warning",
      message:
        "Eine Arbeitgeberreaktion ist noch offen. Wiedervorlage und Unterlagenanforderung prüfen.",
    });
  }
  if (
    record.status === "arbeitgeber_lehnt_ab" &&
    !record.inclusionOfficeInvolved
  ) {
    warnings.push({
      level: "critical",
      message:
        "Arbeitgeber lehnt ab. Einschaltung des Inklusionsamts bzw. Beratung nach § 185 SGB IX prüfen.",
    });
  }
  if (
    record.implementationDueAt &&
    new Date(record.implementationDueAt) < new Date() &&
    !["umgesetzt", "nicht_mehr_erforderlich"].includes(
      record.implementationStatus,
    )
  ) {
    warnings.push({
      level: "critical",
      message: "Die dokumentierte Umsetzungsfrist ist überschritten.",
    });
  }
  if (
    record.effectivenessReviewAt &&
    new Date(record.effectivenessReviewAt) < new Date() &&
    record.status === "wirksamkeitspruefung"
  ) {
    warnings.push({
      level: "warning",
      message: "Die Wirksamkeitsprüfung ist fällig.",
    });
  }
  return warnings;
}

