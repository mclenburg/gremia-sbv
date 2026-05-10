import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { assertPersonPrivacyReason, decidePersonDeletion } from './personAnonymizationPolicy.js';
import type { PersonAnonymizationResult } from '../src/app/core/models/protected-person.model.js';

function nowIso(): string { return new Date().toISOString(); }

export class PersonAnonymizationService {
  constructor(private readonly db: DatabaseAdapter) {}

  anonymizeStructuredPersonData(id: string, reason: string): PersonAnonymizationResult {
    const normalizedReason = assertPersonPrivacyReason(reason);
    const service = new ProtectedPersonService(this.db);
    const linksBefore = service.listCaseLinks(id).filter((link) => link.linkState === 'active');
    const directlyLinkedRows = this.db.prepare<{ id: string }>('SELECT id FROM cases WHERE protected_person_id = ?').all(id);
    const person = service.anonymizeStructuredData(id, normalizedReason);
    const reviewService = new PrivacyReviewService(this.db);
    for (const row of directlyLinkedRows) reviewService.markCaseAnonymized(row.id);
    reviewService.markLinkedCasesForPerson(id, 'linked_person_anonymized');
    return {
      person,
      affectedCaseIds: Array.from(new Set([...linksBefore.map((link) => link.caseFileId), ...directlyLinkedRows.map((row) => row.id)])),
      anonymizedLinks: linksBefore.length
    };
  }

  deleteStructuredPersonData(id: string, reason: string): { ok: true; affectedCaseIds: string[]; deletedPersonId: string } {
    const normalizedReason = assertPersonPrivacyReason(reason);
    const person = new ProtectedPersonService(this.db).get(id);
    if (!person) throw new Error(`Person nicht gefunden: ${id}`);
    const decision = decidePersonDeletion();
    const timestamp = nowIso();
    const linkedCases = this.db.prepare<{ id: string }>('SELECT id FROM cases WHERE protected_person_id = ?').all(id);
    for (const row of linkedCases) {
      this.db.prepare(`
        UPDATE cases SET protected_person_id = NULL, person_binding_state = ?, privacy_review_required = ?,
          privacy_review_reason = ?, privacy_review_due_at = ?, updated_at = ?
        WHERE id = ?
      `).run(decision.caseBindingState, decision.reviewRequired ? 1 : 0, decision.privacyReviewReason, timestamp, timestamp, row.id);
    }
    this.db.prepare(`UPDATE person_case_links SET link_state = 'removed', anonymized_at = ?, link_reason = COALESCE(link_reason, ?) WHERE protected_person_id = ? AND link_state = 'active'`)
      .run(timestamp, 'Person gelöscht; Fallakte datenschutzrechtlich prüfen.', id);
    const reviewService = new PrivacyReviewService(this.db);
    for (const row of linkedCases) reviewService.createForCase(row.id, null, 'linked_person_deleted', { trigger: 'linked_person_deleted' }, timestamp, 'high');
    this.db.prepare('DELETE FROM protected_persons WHERE id = ?').run(id);
    new PersonalDataAuditLogService(this.db).append({ action: 'delete', subjectType: 'protected_person', subjectId: id, purpose: 'Personenverzeichnis: Person gelöscht', metadata: { subjectId: id, timestamp, reasonCode: 'person_deleted' } });
    return { ok: true, affectedCaseIds: linkedCases.map((row) => row.id), deletedPersonId: id };
  }
}
