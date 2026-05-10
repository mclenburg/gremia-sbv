import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { assertCanAssignLegacyCase, assertCanCreateRegularCase, decideLegacyCaseBindingMigration, type PersonBindingState } from './personCaseBindingPolicy.js';

function nowIso(): string { return new Date().toISOString(); }
function tryExec(db: DatabaseAdapter, sql: string): void { try { db.exec(sql); } catch { /* idempotente SQLite-Spaltenerweiterung */ } }

export interface LegacyCaseAssignmentResult {
  caseId: string;
  protectedPersonId: string;
  personBindingState: PersonBindingState;
  privacyReviewRequired: boolean;
}

export class PersonCaseBindingService {
  constructor(private readonly db: DatabaseAdapter) {}

  ensureSchema(): void {
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL;`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN person_binding_state TEXT NOT NULL DEFAULT 'legacy_unlinked' CHECK (person_binding_state IN ('active','migrated','legacy_unlinked','anonymous_request','anonymized','person_deleted','unlinking_in_progress'));`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN privacy_review_required INTEGER NOT NULL DEFAULT 0;`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN privacy_review_reason TEXT;`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN privacy_review_due_at TEXT;`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN privacy_review_priority TEXT NOT NULL DEFAULT 'normal';`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN anonymization_recommended INTEGER NOT NULL DEFAULT 0;`);
    tryExec(this.db, `ALTER TABLE cases ADD COLUMN anonymized_at TEXT;`);
    tryExec(this.db, `CREATE INDEX IF NOT EXISTS idx_cases_protected_person ON cases(protected_person_id);`);
    tryExec(this.db, `CREATE INDEX IF NOT EXISTS idx_cases_person_binding_state ON cases(person_binding_state);`);
    tryExec(this.db, `CREATE INDEX IF NOT EXISTS idx_cases_privacy_review ON cases(privacy_review_required, privacy_review_due_at);`);
  }

  bindNewCase(caseId: string, protectedPersonId: string | null | undefined, state: PersonBindingState = 'active'): void {
    this.ensureSchema();
    assertCanCreateRegularCase({ protectedPersonId, personBindingState: state, isAnonymousRequest: state === 'anonymous_request' });
    this.db.prepare(`UPDATE cases SET protected_person_id = ?, person_binding_state = ?, privacy_review_required = 0, privacy_review_reason = NULL, updated_at = ? WHERE id = ?`)
      .run(protectedPersonId ?? null, state, nowIso(), caseId);
    new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'case_person_binding', subjectId: protectedPersonId ?? undefined, caseId, purpose: 'Fallakte mit Person verknüpft', metadata: { bindingState: state } });
  }

  assignLegacyCase(caseId: string, protectedPersonId: string, reason: string): LegacyCaseAssignmentResult {
    this.ensureSchema();
    const caseRow = this.db.prepare<any>(`SELECT id, person_binding_state, protected_person_id FROM cases WHERE id = ?`).get(caseId);
    if (!caseRow) throw new Error(`Fallakte nicht gefunden: ${caseId}`);
    const personRow = this.db.prepare<any>(`SELECT id FROM protected_persons WHERE id = ?`).get(protectedPersonId);
    if (!personRow) throw new Error(`Person nicht gefunden: ${protectedPersonId}`);
    const activeLinks = this.db.prepare<any>(`SELECT protected_person_id FROM person_case_links WHERE case_file_id = ? AND link_state = 'active'`).all(caseId).map((link) => String(link.protected_person_id));
    assertCanAssignLegacyCase({ caseBindingState: caseRow.person_binding_state, protectedPersonId: caseRow.protected_person_id, selectedPersonId: protectedPersonId, reason, activePersonLinkIds: activeLinks });

    const timestamp = nowIso();
    this.db.prepare(`UPDATE person_case_links SET link_state = 'removed', anonymized_at = ?, link_reason = COALESCE(link_reason, ?) WHERE case_file_id = ? AND link_state = 'active' AND protected_person_id <> ?`)
      .run(timestamp, 'Manuelle Legacy-Zuordnung ersetzt unklare Altverknüpfung.', caseId, protectedPersonId);
    const existing = this.db.prepare<any>(`SELECT id FROM person_case_links WHERE protected_person_id = ? AND case_file_id = ?`).get(protectedPersonId, caseId);
    if (existing) {
      this.db.prepare(`UPDATE person_case_links SET link_state = 'active', anonymized_at = NULL, link_reason = ? WHERE id = ?`).run(reason.trim(), existing.id);
    } else {
      this.db.prepare(`INSERT INTO person_case_links (id, protected_person_id, case_file_id, link_state, created_at, link_reason) VALUES (?, ?, ?, 'active', ?, ?)`)
        .run(randomUUID(), protectedPersonId, caseId, timestamp, reason.trim());
    }
    this.db.prepare(`UPDATE cases SET protected_person_id = ?, person_binding_state = 'active', privacy_review_required = 0, privacy_review_reason = NULL, privacy_review_due_at = NULL, updated_at = ? WHERE id = ?`)
      .run(protectedPersonId, timestamp, caseId);
    new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'case_person_binding', subjectId: protectedPersonId, caseId, purpose: 'Legacy-Fallakte manuell zugeordnet', metadata: { bindingState: 'active', legacyAssignment: true } });
    return { caseId, protectedPersonId, personBindingState: 'active', privacyReviewRequired: false };
  }

  migrateLegacyBindings(referenceDate = new Date()): { migrated: number; legacyUnlinked: number; privacyReviewRequired: number } {
    this.ensureSchema();
    const cases = this.db.prepare<any>(`SELECT id, status, closed_at FROM cases WHERE person_binding_state = 'legacy_unlinked' AND protected_person_id IS NULL ORDER BY opened_at ASC`).all();
    let migrated = 0;
    let legacyUnlinked = 0;
    let privacyReviewRequired = 0;
    for (const row of cases) {
      const links = this.db.prepare<any>(`SELECT protected_person_id FROM person_case_links WHERE case_file_id = ? AND link_state = 'active' ORDER BY created_at ASC`).all(row.id).map((link) => String(link.protected_person_id));
      const openDeadlines = Number(this.db.prepare<any>(`SELECT COUNT(*) AS value FROM deadlines WHERE case_id = ? AND status IN ('open','overdue')`).get(row.id)?.value ?? 0) > 0;
      const runningMeasures = Number(this.db.prepare<any>(`SELECT COUNT(*) AS value FROM case_measures WHERE case_id = ? AND status NOT IN ('done','completed','cancelled')`).get(row.id)?.value ?? 0) > 0;
      let decision;
      try {
        decision = decideLegacyCaseBindingMigration({ activePersonLinkIds: links, status: row.status, closedAt: row.closed_at, hasOpenDeadlines: openDeadlines, hasRunningMeasures: runningMeasures, referenceDate });
      } catch {
        decision = decideLegacyCaseBindingMigration({ activePersonLinkIds: [], status: row.status, closedAt: row.closed_at, hasOpenDeadlines: openDeadlines, hasRunningMeasures: runningMeasures, referenceDate });
        decision.privacyReviewReason = 'multiple_person_links';
      }
      this.db.prepare(`UPDATE cases SET protected_person_id = ?, person_binding_state = ?, privacy_review_required = ?, privacy_review_reason = ?, privacy_review_priority = ?, anonymization_recommended = ?, updated_at = ? WHERE id = ?`)
        .run(decision.protectedPersonId, decision.personBindingState, decision.privacyReviewRequired ? 1 : 0, decision.privacyReviewReason ?? null, decision.privacyReviewPriority, decision.anonymizationRecommended ? 1 : 0, nowIso(), row.id);
      if (decision.personBindingState === 'migrated') migrated += 1; else legacyUnlinked += 1;
      if (decision.privacyReviewRequired) privacyReviewRequired += 1;
    }
    return { migrated, legacyUnlinked, privacyReviewRequired };
  }
}
