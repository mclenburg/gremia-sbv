import { randomUUID } from "node:crypto";
import type { DatabaseAdapter } from "../databaseService.js";
import type { CaseNoteInlineActionInput } from "../../src/app/core/models/case-note.model.js";
import type { CreateCaseNoteLinkInput } from "../../src/app/core/models/case-note-link.model.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import { DeadlineService } from "../deadlineService.js";
import { BemService } from "../bemService.js";
import { PreventionService } from "../preventionService.js";
import { ParticipationService } from "../participationService.js";
import { EqualizationService } from "../equalizationService.js";
import { WorkplaceAccommodationService } from "../workplaceAccommodationService.js";
import { TerminationService } from "../terminationService.js";
import { nowIso } from "./caseSupport.js";

function createLinkedAction(
  caseId: string,
  targetType: CreateCaseNoteLinkInput["targetType"],
  targetId: string,
  label: string,
  accessibleLabel: string,
): CreateCaseNoteLinkInput {
  return {
    targetType,
    targetId,
    caseId,
    label,
    accessibleLabel,
    textStart: 0,
    textEnd: label.length,
  };
}

function createPendingContact(
  db: DatabaseAdapter,
  action: Extract<CaseNoteInlineActionInput, { kind: "contact" }>,
): void {
  const firstName = action.input.firstName.trim();
  const lastName = action.input.lastName.trim();
  if (!firstName || !lastName) throw new Error("Bitte Vorname und Nachname des Kontakts erfassen.");

  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO contacts (
      id, first_name, last_name, organization, role, category, email, phone, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    firstName,
    lastName,
    action.input.organization?.trim() || null,
    action.input.role?.trim() || null,
    action.input.category ?? "sonstiges",
    action.input.email?.trim() || null,
    action.input.phone?.trim() || null,
    action.input.notes?.trim() || null,
    timestamp,
    timestamp,
  );

  try {
    new PersonalDataAuditLogService(db).append({
      action: "create",
      subjectType: "contact",
      subjectId: id,
      purpose: "Kontakt über Fallnotiz-Inline-Befehl angelegt",
      metadata: { category: action.input.category ?? "sonstiges" },
    });
  } catch (error) {
    console.warn(
      "Gremia.SBV audit log write failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

function createLegalNormCaseLink(
  db: DatabaseAdapter,
  action: Extract<CaseNoteInlineActionInput, { kind: "legal_norm_case_link" }>,
  caseId: string,
): void {
  if (action.input.caseId !== caseId) throw new Error("Inline-Aktion gehört nicht zur aktuell gespeicherten Fallakte.");
  const norm = db.prepare<{ id: string }>('SELECT id FROM legal_norms WHERE id = ?').get(action.input.legalNormId);
  if (!norm) throw new Error('Rechtsnorm wurde nicht gefunden.');
  const existing = db.prepare<{ id: string }>('SELECT id FROM case_legal_references WHERE case_id = ? AND legal_norm_id = ?')
    .get(caseId, action.input.legalNormId);
  if (existing) return;

  const id = randomUUID();
  db.prepare('INSERT INTO case_legal_references (id, case_id, legal_norm_id, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, caseId, action.input.legalNormId, action.input.note?.trim() || null, nowIso());
  new PersonalDataAuditLogService(db).append({
    action: 'create',
    subjectType: 'case_legal_reference',
    subjectId: id,
    caseId,
    purpose: 'Rechtsnorm mit Fallakte über Fallnotiz-Inline-Befehl verknüpft',
  });
}

export function materializeCaseNoteInlineActions(
  db: DatabaseAdapter,
  actions: CaseNoteInlineActionInput[] | undefined,
  caseId: string,
): CreateCaseNoteLinkInput[] {
  if (actions === undefined) return [];
  if (!Array.isArray(actions)) throw new Error("Inline-Aktionen müssen als Liste übergeben werden.");

  const links: CreateCaseNoteLinkInput[] = [];

  for (const action of actions) {
    if (!action || typeof action !== "object" || !("kind" in action) || !("input" in action)) {
      throw new Error("Ungültige Inline-Aktion.");
    }

    if (action.kind === "contact") {
      createPendingContact(db, action);
      continue;
    }
    if (action.kind === "legal_norm_case_link") {
      createLegalNormCaseLink(db, action, caseId);
      continue;
    }

    if (action.input.caseId && action.input.caseId !== caseId) {
      throw new Error("Inline-Aktion gehört nicht zur aktuell gespeicherten Fallakte.");
    }

    if (action.kind === "deadline") {
      const created = new DeadlineService(db).create({ ...action.input, caseId });
      const label = action.linkLabel ?? created.title;
      links.push(createLinkedAction(
        caseId,
        "deadline",
        created.id,
        label,
        action.accessibleLabel ?? `Frist öffnen: ${created.title}`,
      ));
      continue;
    }

    if (action.kind === "bem") {
      const created = new BemService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(caseId, "bem", created.id, action.linkLabel, action.accessibleLabel));
      continue;
    }

    if (action.kind === "prevention") {
      const created = new PreventionService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(caseId, "prevention", created.id, action.linkLabel, action.accessibleLabel));
      continue;
    }

    if (action.kind === "participation") {
      const created = new ParticipationService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(caseId, "participation", created.id, action.linkLabel, action.accessibleLabel));
      continue;
    }

    if (action.kind === "equalization") {
      const created = new EqualizationService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(caseId, "equalization", created.id, action.linkLabel, action.accessibleLabel));
      continue;
    }

    if (action.kind === "workplace_accommodation") {
      const created = new WorkplaceAccommodationService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(
        caseId,
        "workplace_accommodation",
        created.id,
        action.linkLabel,
        action.accessibleLabel,
      ));
      continue;
    }

    if (action.kind === "termination_hearing") {
      const created = new TerminationService(db).create({ ...action.input, caseId });
      links.push(createLinkedAction(
        caseId,
        "termination_hearing",
        created.id,
        action.linkLabel,
        action.accessibleLabel,
      ));
      continue;
    }

    const neverAction: never = action;
    throw new Error(`Unbekannte Inline-Aktion: ${String(neverAction)}`);
  }

  return links;
}
