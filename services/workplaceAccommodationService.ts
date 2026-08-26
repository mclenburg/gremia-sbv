import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { randomUUID } from "node:crypto";
import type { DatabaseAdapter } from "./databaseService.js";
import { CaseMeasureService } from "./caseMeasureService.js";
import { DeadlineService } from "./deadlineService.js";
import { PersonalDataAuditLogService } from "./auditLogService.js";
import type { CreateWorkplaceAccommodationInput, UpdateWorkplaceAccommodationInput, WorkplaceAccommodationDashboardSummary, WorkplaceAccommodationRecord, WorkplaceAccommodationWarning } from "../src/domain/models/workplace-accommodation.model.js";
import { WorkplaceAccommodationRow, nowIso, toIso, boolToInt, accommodationStatusToMeasureStatus, mapRecord, evaluateWorkplaceAccommodationWarnings, workplaceFundingCreateValues, workplaceFundingUpdateValues } from './workplaceAccommodationSupport.js';
export { evaluateWorkplaceAccommodationWarnings } from './workplaceAccommodationSupport.js';
import { ensureWorkplaceAccommodationSchema } from './workplaceAccommodationSchema.js';
export class WorkplaceAccommodationService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly caseMeasures: CaseMeasureService = new CaseMeasureService(database),
    private readonly deadlines: DeadlineService = new DeadlineService(database),
    private readonly auditLog: PersonalDataAuditLogService = new PersonalDataAuditLogService(database),
  ) {}
  ensureSchema(): void {
    ensureWorkplaceAccommodationSchema(this.database, this.caseMeasures);
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
        subjectType: "case_measure_workplace_accommodation",
        subjectId,
        caseId,
        purpose,
      });
  }
  private event(
    measureId: string,
    eventType: string,
    title: string,
    description?: string,
  ): void {
    this.database
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
             w.funding_carrier, w.funding_applied_at, w.funding_documents_status, w.funding_questions, w.funding_decision, w.funding_amount, w.ordered_at,
             w.employer_response_status, w.employer_response_at, w.implementation_status, w.implementation_due_at,
             w.effectiveness_review_at, w.outcome
      FROM case_measures cm
      JOIN case_measure_workplace_accommodation w ON w.measure_id = cm.id
      WHERE cm.type = 'workplace_accommodation' ${caseId ? "AND cm.case_id = ?" : ""}
      ORDER BY COALESCE(w.implementation_due_at, w.effectiveness_review_at, cm.due_at, cm.updated_at) DESC
    `;
    const rows = caseId
      ? this.database.prepare<WorkplaceAccommodationRow>(sql).all(caseId)
      : this.database.prepare<WorkplaceAccommodationRow>(sql).all();
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
    const row = this.database
      .prepare<WorkplaceAccommodationRow>(
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
    return new DatabaseUnitOfWork(this.database).run(() => {
    if (!input.caseId) throw new Error("Arbeitsplatzgestaltung muss aus einer Fallakte heraus angelegt werden.");
    if (!input.title?.trim())
      throw new Error("Arbeitsplatzgestaltung benötigt einen Titel.");
    const timestamp = nowIso();
    const status = input.status ?? "entwurf";
    const implementationDueAt = toIso(input.implementationDueAt);
    const effectivenessReviewAt = toIso(input.effectivenessReviewAt);
    const measure = this.caseMeasures.create({
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

    this.database
      .prepare(
        `
      INSERT INTO case_measure_workplace_accommodation (
        measure_id, category, accommodation_status, requested_adjustment, legal_basis, barrier_or_limitation,
        workplace_context, proposed_solution, technical_aid_needed, organizational_adjustment_needed,
        working_time_adjustment_needed, qualification_needed, fixed_workplace_needed, homeoffice_or_mobile_work_relevant,
        inclusion_office_involved, rehab_carrier_involved, funding_carrier, funding_applied_at, funding_documents_status, funding_questions, funding_decision, funding_amount, ordered_at, employer_response_status, employer_response_at,
        implementation_status, implementation_due_at, effectiveness_review_at, outcome, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        ...workplaceFundingCreateValues(input),
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
      this.deadlines.create({
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
      this.deadlines.create({
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
  
    });
  }

  update(
    id: string,
    input: UpdateWorkplaceAccommodationInput,
  ): WorkplaceAccommodationRecord {
    return new DatabaseUnitOfWork(this.database).run(() => {
    const existing = this.getById(id);
    if (!existing)
      throw new Error(`Arbeitsplatzgestaltung nicht gefunden: ${id}`);
    const timestamp = nowIso();
    const nextStatus = input.status ?? existing.status;

    this.caseMeasures.update(id, {
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

    this.database
      .prepare(
        `
      UPDATE case_measure_workplace_accommodation
      SET category = ?, accommodation_status = ?, requested_adjustment = ?, legal_basis = ?, barrier_or_limitation = ?,
          workplace_context = ?, proposed_solution = ?, technical_aid_needed = ?, organizational_adjustment_needed = ?,
          working_time_adjustment_needed = ?, qualification_needed = ?, fixed_workplace_needed = ?, homeoffice_or_mobile_work_relevant = ?,
          inclusion_office_involved = ?, rehab_carrier_involved = ?, funding_carrier = ?, funding_applied_at = ?, funding_documents_status = ?, funding_questions = ?, funding_decision = ?, funding_amount = ?, ordered_at = ?, employer_response_status = ?, employer_response_at = ?,
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
        input.inclusionOfficeInvolved !== undefined ? boolToInt(input.inclusionOfficeInvolved) : boolToInt(existing.inclusionOfficeInvolved),
        input.rehabCarrierInvolved !== undefined ? boolToInt(input.rehabCarrierInvolved) : boolToInt(existing.rehabCarrierInvolved),
        ...workplaceFundingUpdateValues(input, existing),
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
  
    });
  }

  warnings(id: string): WorkplaceAccommodationWarning[] {
    const record = this.getById(id);
    return record ? evaluateWorkplaceAccommodationWarnings(record) : [];
  }
}
