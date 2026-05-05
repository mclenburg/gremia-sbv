import { randomUUID } from "node:crypto";
import type { DatabaseAdapter } from "./databaseService.js";
import { CaseMeasureService } from "./caseMeasureService.js";
import { DeadlineService } from "./deadlineService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import type {
  CreateWorkplaceAccommodationInput,
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationDashboardSummary,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationStatus,
  WorkplaceAccommodationWarning,
} from "../src/app/core/models/workplace-accommodation.model.js";

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function boolToInt(value: boolean | undefined, fallback = false): number {
  return (value ?? fallback) ? 1 : 0;
}

function toBool(value: unknown): boolean {
  return Boolean(value);
}

function accommodationStatusToMeasureStatus(
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

function mapRecord(row: any): WorkplaceAccommodationRecord {
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

export class WorkplaceAccommodationService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    new CaseMeasureService(this.db).ensureSchema();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS case_measure_workplace_accommodation (
        measure_id TEXT PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'sonstiges',
        accommodation_status TEXT NOT NULL DEFAULT 'entwurf',
        requested_adjustment TEXT NOT NULL DEFAULT '',
        legal_basis TEXT NOT NULL DEFAULT '§ 164 Abs. 4 SGB IX',
        barrier_or_limitation TEXT,
        workplace_context TEXT,
        proposed_solution TEXT,
        technical_aid_needed INTEGER NOT NULL DEFAULT 0,
        organizational_adjustment_needed INTEGER NOT NULL DEFAULT 0,
        working_time_adjustment_needed INTEGER NOT NULL DEFAULT 0,
        qualification_needed INTEGER NOT NULL DEFAULT 0,
        fixed_workplace_needed INTEGER NOT NULL DEFAULT 0,
        homeoffice_or_mobile_work_relevant INTEGER NOT NULL DEFAULT 0,
        inclusion_office_involved INTEGER NOT NULL DEFAULT 0,
        rehab_carrier_involved INTEGER NOT NULL DEFAULT 0,
        employer_response_status TEXT NOT NULL DEFAULT 'offen',
        employer_response_at TEXT,
        implementation_status TEXT NOT NULL DEFAULT 'nicht_begonnen',
        implementation_due_at TEXT,
        effectiveness_review_at TEXT,
        outcome TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(measure_id) REFERENCES case_measures(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_status ON case_measure_workplace_accommodation(accommodation_status);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_category ON case_measure_workplace_accommodation(category);
      CREATE INDEX IF NOT EXISTS idx_case_measure_workplace_review ON case_measure_workplace_accommodation(effectiveness_review_at);
    `);
    new PersonalDataAuditLogService(this.db);
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
        subjectType: "case_measure_workplace_accommodation",
        subjectId,
        caseId,
        purpose,
      });
    } catch (error) {
      console.warn(
        "Gremia.SBV workplace accommodation audit write failed",
        error,
      );
    }
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

  private query(caseId?: string): WorkplaceAccommodationRecord[] {
    const sql = `
      SELECT cm.id, cm.case_id, cm.title, cm.status AS measure_status, cm.risk_level, cm.next_step,
             cm.created_at AS created_at, cm.updated_at AS updated_at,
             w.category, w.accommodation_status, w.requested_adjustment, w.legal_basis, w.barrier_or_limitation,
             w.workplace_context, w.proposed_solution, w.technical_aid_needed, w.organizational_adjustment_needed,
             w.working_time_adjustment_needed, w.qualification_needed, w.fixed_workplace_needed,
             w.homeoffice_or_mobile_work_relevant, w.inclusion_office_involved, w.rehab_carrier_involved,
             w.employer_response_status, w.employer_response_at, w.implementation_status, w.implementation_due_at,
             w.effectiveness_review_at, w.outcome
      FROM case_measures cm
      JOIN case_measure_workplace_accommodation w ON w.measure_id = cm.id
      WHERE cm.type = 'workplace_accommodation' ${caseId ? "AND cm.case_id = ?" : ""}
      ORDER BY COALESCE(w.implementation_due_at, w.effectiveness_review_at, cm.due_at, cm.updated_at) DESC
    `;
    const rows = caseId
      ? this.db.prepare<any>(sql).all(caseId)
      : this.db.prepare<any>(sql).all();
    return rows.map(mapRecord);
  }

  list(caseId?: string): WorkplaceAccommodationRecord[] {
    this.audit(
      "read",
      undefined,
      caseId,
      caseId
        ? "Arbeitsplatzgestaltungsmaßnahmen einer Fallakte anzeigen"
        : "Arbeitsplatzgestaltungscockpit anzeigen",
    );
    return this.query(caseId);
  }

  dashboardSummary(): WorkplaceAccommodationDashboardSummary {
    const rows = this.list();
    const now = new Date();
    return {
      open: rows.filter((row) => !["abgeschlossen"].includes(row.status))
        .length,
      critical: rows.filter(
        (row) =>
          row.riskLevel === "kritisch" ||
          evaluateWorkplaceAccommodationWarnings(row).some(
            (warning) => warning.level === "critical",
          ),
      ).length,
      employerResponseOpen: rows.filter(
        (row) =>
          row.employerResponseStatus === "offen" &&
          row.status !== "abgeschlossen",
      ).length,
      effectivenessReviewDue: rows.filter(
        (row) =>
          row.effectivenessReviewAt &&
          new Date(row.effectivenessReviewAt) <= now &&
          row.status === "wirksamkeitspruefung",
      ).length,
    };
  }

  getById(id: string): WorkplaceAccommodationRecord | undefined {
    const row = this.db
      .prepare<any>(
        `
      SELECT cm.id, cm.case_id, cm.title, cm.status AS measure_status, cm.risk_level, cm.next_step,
             cm.created_at AS created_at, cm.updated_at AS updated_at,
             w.*
      FROM case_measures cm
      JOIN case_measure_workplace_accommodation w ON w.measure_id = cm.id
      WHERE cm.id = ?
    `,
      )
      .get(id);
    if (row)
      this.audit(
        "read",
        id,
        row.case_id,
        "Arbeitsplatzgestaltung Detail anzeigen",
      );
    return row ? mapRecord(row) : undefined;
  }

  create(
    input: CreateWorkplaceAccommodationInput,
  ): WorkplaceAccommodationRecord {
    if (!input.caseId)
      throw new Error(
        "Arbeitsplatzgestaltung muss aus einer Fallakte heraus angelegt werden.",
      );
    if (!input.title?.trim())
      throw new Error("Arbeitsplatzgestaltung benötigt einen Titel.");
    const timestamp = nowIso();
    const status = input.status ?? "entwurf";
    const implementationDueAt = toIso(input.implementationDueAt);
    const effectivenessReviewAt = toIso(input.effectivenessReviewAt);
    const measure = new CaseMeasureService(this.db).create({
      caseId: input.caseId,
      type: "workplace_accommodation",
      title: input.title.trim(),
      status: accommodationStatusToMeasureStatus(status),
      riskLevel: input.riskLevel ?? "normal",
      createdFrom: input.createdFrom ?? "manual",
      summary:
        input.requestedAdjustment || input.barrierOrLimitation || undefined,
      nextStep: input.nextStep || undefined,
      dueAt: input.implementationDueAt || input.effectivenessReviewAt,
      openedAt: timestamp,
      requiresFollowUp: input.requiresFollowUp ?? status !== "abgeschlossen",
    });

    this.db
      .prepare(
        `
      INSERT INTO case_measure_workplace_accommodation (
        measure_id, category, accommodation_status, requested_adjustment, legal_basis, barrier_or_limitation,
        workplace_context, proposed_solution, technical_aid_needed, organizational_adjustment_needed,
        working_time_adjustment_needed, qualification_needed, fixed_workplace_needed, homeoffice_or_mobile_work_relevant,
        inclusion_office_involved, rehab_carrier_involved, employer_response_status, employer_response_at,
        implementation_status, implementation_due_at, effectiveness_review_at, outcome, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        measure.id,
        input.category ?? "sonstiges",
        status,
        input.requestedAdjustment?.trim() || input.title.trim(),
        input.legalBasis?.trim() || "§ 164 Abs. 4 SGB IX",
        input.barrierOrLimitation ?? null,
        input.workplaceContext ?? null,
        input.proposedSolution ?? null,
        boolToInt(input.technicalAidNeeded),
        boolToInt(input.organizationalAdjustmentNeeded),
        boolToInt(input.workingTimeAdjustmentNeeded),
        boolToInt(input.qualificationNeeded),
        boolToInt(input.fixedWorkplaceNeeded),
        boolToInt(input.homeofficeOrMobileWorkRelevant),
        boolToInt(input.inclusionOfficeInvolved),
        boolToInt(input.rehabCarrierInvolved),
        input.employerResponseStatus ?? "offen",
        toIso(input.employerResponseAt),
        input.implementationStatus ?? "nicht_begonnen",
        implementationDueAt,
        effectivenessReviewAt,
        input.outcome ?? null,
        timestamp,
        timestamp,
      );

    this.event(
      measure.id,
      "created",
      "Arbeitsplatzgestaltung angelegt",
      input.title,
    );

    if (input.createDefaultDeadlines !== false && implementationDueAt) {
      new DeadlineService(this.db).create({
        caseId: input.caseId,
        processId: measure.id,
        processType: "custom",
        deadlineType: "workflow_step",
        title: "Umsetzung Arbeitsplatzgestaltung prüfen",
        confidentialTitle: `Arbeitsplatzgestaltung: ${input.title.trim()}`,
        description:
          "Automatische Wiedervorlage aus der fallaktenbezogenen Arbeitsplatzgestaltung.",
        dueAt: implementationDueAt,
        legalBasis: input.legalBasis?.trim() || "§ 164 Abs. 4 SGB IX",
        sourceEvent: "case_measure_workplace_accommodation_created",
        severity: input.riskLevel === "kritisch" ? "critical" : "important",
        calculationMode: "workflow",
        isLegalDeadline: false,
        warningThresholdHours: 72,
        criticalThresholdHours: 24,
      });
    }

    if (input.createDefaultDeadlines !== false && effectivenessReviewAt) {
      new DeadlineService(this.db).create({
        caseId: input.caseId,
        processId: measure.id,
        processType: "custom",
        deadlineType: "follow_up",
        title: "Wirksamkeit Arbeitsplatzgestaltung prüfen",
        confidentialTitle: `Wirksamkeitsprüfung: ${input.title.trim()}`,
        description:
          "Wiedervorlage zur Prüfung, ob die vereinbarte Arbeitsplatzgestaltung wirksam ist.",
        dueAt: effectivenessReviewAt,
        legalBasis: input.legalBasis?.trim() || "§ 164 Abs. 4 SGB IX",
        sourceEvent:
          "case_measure_workplace_accommodation_effectiveness_review",
        severity: "important",
        calculationMode: "workflow",
        isLegalDeadline: false,
        warningThresholdHours: 168,
        criticalThresholdHours: 48,
      });
    }

    this.audit(
      "create",
      measure.id,
      input.caseId,
      "Arbeitsplatzgestaltung in Fallakte angelegt",
    );
    return this.getById(measure.id)!;
  }

  update(
    id: string,
    input: UpdateWorkplaceAccommodationInput,
  ): WorkplaceAccommodationRecord {
    const existing = this.getById(id);
    if (!existing)
      throw new Error(`Arbeitsplatzgestaltung nicht gefunden: ${id}`);
    const timestamp = nowIso();
    const nextStatus = input.status ?? existing.status;

    new CaseMeasureService(this.db).update(id, {
      title: input.title !== undefined ? input.title : existing.title,
      status: accommodationStatusToMeasureStatus(nextStatus),
      riskLevel: input.riskLevel ?? existing.riskLevel,
      summary:
        input.requestedAdjustment !== undefined
          ? input.requestedAdjustment
          : existing.requestedAdjustment,
      nextStep:
        input.nextStep !== undefined ? input.nextStep : existing.nextStep,
      dueAt:
        input.implementationDueAt !== undefined
          ? input.implementationDueAt
          : input.effectivenessReviewAt !== undefined
            ? input.effectivenessReviewAt
            : (existing.implementationDueAt ?? existing.effectivenessReviewAt),
      closedAt: nextStatus === "abgeschlossen" ? timestamp : undefined,
      requiresFollowUp: nextStatus !== "abgeschlossen",
    });

    this.db
      .prepare(
        `
      UPDATE case_measure_workplace_accommodation
      SET category = ?, accommodation_status = ?, requested_adjustment = ?, legal_basis = ?, barrier_or_limitation = ?,
          workplace_context = ?, proposed_solution = ?, technical_aid_needed = ?, organizational_adjustment_needed = ?,
          working_time_adjustment_needed = ?, qualification_needed = ?, fixed_workplace_needed = ?, homeoffice_or_mobile_work_relevant = ?,
          inclusion_office_involved = ?, rehab_carrier_involved = ?, employer_response_status = ?, employer_response_at = ?,
          implementation_status = ?, implementation_due_at = ?, effectiveness_review_at = ?, outcome = ?, updated_at = ?
      WHERE measure_id = ?
    `,
      )
      .run(
        input.category ?? existing.category,
        nextStatus,
        input.requestedAdjustment !== undefined
          ? input.requestedAdjustment
          : existing.requestedAdjustment,
        input.legalBasis !== undefined ? input.legalBasis : existing.legalBasis,
        input.barrierOrLimitation !== undefined
          ? input.barrierOrLimitation
          : (existing.barrierOrLimitation ?? null),
        input.workplaceContext !== undefined
          ? input.workplaceContext
          : (existing.workplaceContext ?? null),
        input.proposedSolution !== undefined
          ? input.proposedSolution
          : (existing.proposedSolution ?? null),
        input.technicalAidNeeded !== undefined
          ? boolToInt(input.technicalAidNeeded)
          : boolToInt(existing.technicalAidNeeded),
        input.organizationalAdjustmentNeeded !== undefined
          ? boolToInt(input.organizationalAdjustmentNeeded)
          : boolToInt(existing.organizationalAdjustmentNeeded),
        input.workingTimeAdjustmentNeeded !== undefined
          ? boolToInt(input.workingTimeAdjustmentNeeded)
          : boolToInt(existing.workingTimeAdjustmentNeeded),
        input.qualificationNeeded !== undefined
          ? boolToInt(input.qualificationNeeded)
          : boolToInt(existing.qualificationNeeded),
        input.fixedWorkplaceNeeded !== undefined
          ? boolToInt(input.fixedWorkplaceNeeded)
          : boolToInt(existing.fixedWorkplaceNeeded),
        input.homeofficeOrMobileWorkRelevant !== undefined
          ? boolToInt(input.homeofficeOrMobileWorkRelevant)
          : boolToInt(existing.homeofficeOrMobileWorkRelevant),
        input.inclusionOfficeInvolved !== undefined
          ? boolToInt(input.inclusionOfficeInvolved)
          : boolToInt(existing.inclusionOfficeInvolved),
        input.rehabCarrierInvolved !== undefined
          ? boolToInt(input.rehabCarrierInvolved)
          : boolToInt(existing.rehabCarrierInvolved),
        input.employerResponseStatus ?? existing.employerResponseStatus,
        input.employerResponseAt !== undefined
          ? toIso(input.employerResponseAt)
          : (existing.employerResponseAt ?? null),
        input.implementationStatus ?? existing.implementationStatus,
        input.implementationDueAt !== undefined
          ? toIso(input.implementationDueAt)
          : (existing.implementationDueAt ?? null),
        input.effectivenessReviewAt !== undefined
          ? toIso(input.effectivenessReviewAt)
          : (existing.effectivenessReviewAt ?? null),
        input.outcome !== undefined
          ? input.outcome
          : (existing.outcome ?? null),
        timestamp,
        id,
      );

    this.event(
      id,
      "updated",
      "Arbeitsplatzgestaltung aktualisiert",
      JSON.stringify(input),
    );
    this.audit(
      "update",
      id,
      existing.caseId,
      "Arbeitsplatzgestaltung geändert",
    );
    return this.getById(id)!;
  }

  warnings(id: string): WorkplaceAccommodationWarning[] {
    const record = this.getById(id);
    return record ? evaluateWorkplaceAccommodationWarnings(record) : [];
  }
}
