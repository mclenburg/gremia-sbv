import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { assertRetentionDecision, decideLegacyBulkPrivacyReview, decidePrivacyReviewForContext, type PrivacyReviewReason } from './privacyReviewPolicy.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import type { CaseCategory, CasePriority, CaseRecord, CaseStatus } from '../src/domain/models/case.model.js';
import type { PrivacyReviewItemRecord, PrivacyReviewItemStatus, PrivacyReviewContextSnapshot } from '../src/domain/models/privacy-review.model.js';
import { ensurePrivacyReviewRuntimeSchema } from './runtimeSchemaCompatibility.js';

/** SQLite row at the persistence boundary. Values remain scalar and must be
 * normalized by the service mapper before entering the domain model. */
type DatabaseScalar = string;
type DatabaseRow = Record<string, DatabaseScalar> & {
  person_binding_state: CaseRecord['personBindingState'];
  privacy_risk: 'normal' | 'low' | 'high' | 'critical';
  privacy_review_priority: NonNullable<CaseRecord['privacyReviewPriority']>;
  reason: PrivacyReviewItemRecord['reason'];
  priority: PrivacyReviewItemRecord['priority'];
};

function nowIso(): string { return new Date().toISOString(); }
type ScalarValueRow = { value?: string | number | null };

function safeScalar(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  try { return Number(db.prepare<ScalarValueRow>(sql).get(...params)?.value ?? 0); } catch { return 0; }
}

function mapCase(row: DatabaseRow): CaseRecord {
  return {
    id: row.id,
    caseNumber: row.case_number,
    displayName: row.display_name,
    category: row.category as CaseCategory,
    status: row.status as CaseStatus,
    priority: row.priority as CasePriority,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    summary: row.summary ?? undefined,
    isPseudonymized: Boolean(row.is_pseudonymized),
    isLocked: Boolean(row.is_locked),
    protectedPersonId: row.protected_person_id ?? undefined,
    personBindingState: row.person_binding_state ?? 'legacy_unlinked',
    privacyReviewRequired: Boolean(row.privacy_review_required),
    privacyReviewReason: row.privacy_review_reason ?? undefined,
    privacyReviewDueAt: row.privacy_review_due_at ?? undefined,
    privacyReviewPriority: row.privacy_review_priority ?? undefined,
    anonymizationRecommended: Boolean(row.anonymization_recommended),
    anonymizedAt: row.anonymized_at ?? undefined
  };
}

function parseContext(value: unknown): PrivacyReviewContextSnapshot {
  if (typeof value !== 'string' || !value.trim()) {
    return { openDeadlineCount: 0, runningMeasureCount: 0, linkedDocumentCount: 0, freeTextReviewRequired: true };
  }
  try {
    const parsed = JSON.parse(value) as Partial<PrivacyReviewContextSnapshot>;
    return {
      openDeadlineCount: Number(parsed.openDeadlineCount ?? 0),
      runningMeasureCount: Number(parsed.runningMeasureCount ?? 0),
      linkedDocumentCount: Number(parsed.linkedDocumentCount ?? 0),
      lastActivityAt: parsed.lastActivityAt,
      freeTextReviewRequired: parsed.freeTextReviewRequired !== false,
      person: parsed.person,
      caseFile: parsed.caseFile
    };
  } catch {
    return { openDeadlineCount: 0, runningMeasureCount: 0, linkedDocumentCount: 0, freeTextReviewRequired: true };
  }
}

type PrivacyReviewContextInput = Record<string, unknown> | PrivacyReviewContextSnapshot;

function isPrivacyReviewContextSnapshot(value: unknown): value is PrivacyReviewContextSnapshot {
  return typeof value === 'object' && value !== null
    && 'openDeadlineCount' in value
    && 'runningMeasureCount' in value
    && 'linkedDocumentCount' in value
    && 'freeTextReviewRequired' in value;
}

function mapReviewItem(row: DatabaseRow): PrivacyReviewItemRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    protectedPersonId: row.protected_person_id ?? undefined,
    reason: row.reason,
    priority: row.priority,
    dueAt: row.due_at,
    freeTextReviewRequired: Boolean(row.free_text_review_required),
    context: parseContext(row.context_json),
    status: row.status as PrivacyReviewItemStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


export class PrivacyReviewService {
  constructor(private readonly database: DatabaseAdapter) {}

  ensureSchema(): void {
    ensurePrivacyReviewRuntimeSchema(this.database);
  }

  listOpenForPerson(protectedPersonId: string): PrivacyReviewItemRecord[] {
    this.refreshOpenReviewContextsForPerson(protectedPersonId);
    return this.database.prepare<DatabaseRow>(`SELECT * FROM privacy_review_items WHERE protected_person_id = ? AND status = 'open' ORDER BY due_at ASC, priority ASC`).all(protectedPersonId).map(mapReviewItem);
  }

  listOpenForCase(caseId: string): PrivacyReviewItemRecord[] {
    return this.database.prepare<DatabaseRow>(`SELECT * FROM privacy_review_items WHERE case_id = ? AND status = 'open' ORDER BY due_at ASC`).all(caseId).map(mapReviewItem);
  }

  createForCase(caseId: string, protectedPersonId: string | null, reason: PrivacyReviewReason, context: PrivacyReviewContextInput = {}, dueAt = nowIso(), priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): void {
    const timestamp = nowIso();
    const contextSnapshot = isPrivacyReviewContextSnapshot(context)
      ? context
      : this.buildContextSnapshot(caseId, protectedPersonId ?? undefined, context);
    const contextJson = JSON.stringify(contextSnapshot);
    const existing = this.database.prepare<DatabaseRow>(`SELECT id FROM privacy_review_items WHERE case_id = ? AND reason = ? AND status = 'open'`).get(caseId, reason);
    if (existing?.id) {
      this.database.prepare(`UPDATE privacy_review_items SET protected_person_id = ?, priority = ?, due_at = ?, free_text_review_required = 1, context_json = ?, updated_at = ? WHERE id = ?`)
        .run(protectedPersonId, priority, dueAt, contextJson, timestamp, existing.id);
    } else {
      this.database.prepare(`INSERT INTO privacy_review_items (id, case_id, protected_person_id, reason, priority, due_at, free_text_review_required, context_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`)
        .run(randomUUID(), caseId, protectedPersonId, reason, priority, dueAt, contextJson, timestamp, timestamp);
    }
    this.database.prepare(`UPDATE cases SET privacy_review_required = 1, privacy_review_reason = ?, privacy_review_due_at = ?, privacy_review_priority = ?, updated_at = ? WHERE id = ?`)
      .run(reason, dueAt, priority, timestamp, caseId);
    new PersonalDataAuditLogService(this.database).append({ action: 'create', subjectType: 'privacy_review', subjectId: protectedPersonId ?? undefined, caseId, purpose: 'Datenschutzprüfung angelegt', metadata: { reason, priority } });
  }

  markLinkedCasesForPerson(protectedPersonId: string, trigger: 'status_expired' | 'employment_ended' | 'linked_person_anonymized' | 'linked_person_deleted'): number {
    const cases = this.database.prepare<DatabaseRow>(`SELECT * FROM cases WHERE protected_person_id = ?`).all(protectedPersonId);
    let count = 0;
    for (const caseRow of cases) {
      const snapshot = this.buildContextSnapshot(caseRow.id, protectedPersonId, { trigger });
      const decision = decidePrivacyReviewForContext({
        protectionStatus: trigger === 'status_expired' ? 'expired' : snapshot.person?.protectionStatus,
        employmentState: trigger === 'employment_ended' ? 'left_company' : snapshot.person?.employmentState,
        caseStatus: caseRow.status,
        openDeadlineCount: snapshot.openDeadlineCount,
        runningMeasureCount: snapshot.runningMeasureCount,
        linkedDocumentCount: snapshot.linkedDocumentCount,
        lastActivityAt: snapshot.lastActivityAt,
        freeTextReviewRequired: true
      });
      this.createForCase(caseRow.id, protectedPersonId, trigger, snapshot, decision.dueAt ?? nowIso(), decision.priority);
      count += 1;
    }
    return count;
  }

  documentRetention(caseId: string, reason: string, reviewAt: string): void {
    assertRetentionDecision(reason, reviewAt);
    const timestamp = nowIso();
    this.database.prepare(`UPDATE cases SET privacy_review_required = 0, privacy_review_reason = 'retention_reason_documented', privacy_review_due_at = ?, updated_at = ? WHERE id = ?`).run(reviewAt, timestamp, caseId);
    this.database.prepare(`UPDATE privacy_review_items SET status = 'retention_documented', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    this.createRetentionFollowUp(caseId, reason, reviewAt);
    new PersonalDataAuditLogService(this.database).append({ action: 'update', subjectType: 'privacy_review', caseId, purpose: 'Fortspeicherung begründet', metadata: { reviewAt, reasonDocumented: true } });
  }

  scheduleLater(caseId: string, reason: string, reviewAt: string): void {
    assertRetentionDecision(reason, reviewAt);
    const timestamp = nowIso();
    this.database.prepare(`UPDATE cases SET privacy_review_required = 1, privacy_review_reason = 'retention_due', privacy_review_due_at = ?, updated_at = ? WHERE id = ?`).run(reviewAt, timestamp, caseId);
    this.database.prepare(`UPDATE privacy_review_items SET status = 'retention_documented', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    this.createRetentionFollowUp(caseId, reason, reviewAt);
  }

  clearCaseReview(caseId: string, reason: string): void {
    if (!reason.trim()) throw new Error('Für das Abschließen der Datenschutzprüfung ist ein kurzer Grund erforderlich.');
    const timestamp = nowIso();
    this.database.prepare(`UPDATE cases SET privacy_review_required = 0, privacy_review_reason = NULL, privacy_review_due_at = NULL, updated_at = ? WHERE id = ?`).run(timestamp, caseId);
    this.database.prepare(`UPDATE privacy_review_items SET status = 'cleared', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    new PersonalDataAuditLogService(this.database).append({ action: 'update', subjectType: 'privacy_review', caseId, purpose: 'Datenschutzprüfung abgeschlossen', metadata: { cleared: true } });
  }


  markCaseAnonymized(caseId: string): void {
    const timestamp = nowIso();
    this.database.prepare(`UPDATE cases SET person_binding_state = 'anonymized', privacy_review_required = 1, privacy_review_reason = 'linked_person_anonymized', anonymized_at = ?, updated_at = ? WHERE id = ?`).run(timestamp, timestamp, caseId);
    this.database.prepare(`UPDATE privacy_review_items SET status = 'anonymized', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
  }

  markCaseDeleted(caseId: string): void {
    this.database.prepare(`UPDATE privacy_review_items SET status = 'deleted', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(nowIso(), caseId);
  }


  bulkMarkClosedLegacyCasesForAnonymization(referenceDate = new Date()): { reviewed: number; marked: number; skipped: number } {
    const rows = this.database.prepare<DatabaseRow>(`
      SELECT c.*, (SELECT COUNT(*) FROM deadlines d WHERE d.case_id = c.id AND d.status IN ('open','overdue')) AS open_deadline_count
      FROM cases c
      WHERE c.person_binding_state = 'legacy_unlinked' AND c.status = 'abgeschlossen'
      ORDER BY c.closed_at ASC, c.opened_at ASC
    `).all();
    let reviewed = 0;
    let marked = 0;
    let skipped = 0;
    const dueAt = referenceDate.toISOString();
    for (const row of rows) {
      reviewed += 1;
      const decision = decideLegacyBulkPrivacyReview({
        status: row.status,
        personBindingState: row.person_binding_state,
        hasOpenDeadlines: Number(row.open_deadline_count ?? 0) > 0,
        closedAt: row.closed_at
      });
      if (!decision.eligible) {
        skipped += 1;
        continue;
      }
      const context = this.buildContextSnapshot(row.id, undefined, { freeTextReviewRequired: true, bulkAction: 'closed_legacy_cases' });
      this.createForCase(row.id, null, 'legacy_unlinked', context, dueAt, decision.priority);
      this.database.prepare(`UPDATE cases SET anonymization_recommended = 1, privacy_review_priority = ?, updated_at = ? WHERE id = ?`).run(decision.priority, nowIso(), row.id);
      marked += 1;
    }
    new PersonalDataAuditLogService(this.database).append({ action: 'update', subjectType: 'privacy_review', purpose: 'Bulk-Aktion abgeschlossene Altakten vormerken', metadata: { reviewed, marked, skipped } });
    return { reviewed, marked, skipped };
  }

  private refreshOpenReviewContextsForPerson(protectedPersonId: string): void {
    const rows = this.database.prepare<DatabaseRow>(`SELECT case_id FROM privacy_review_items WHERE protected_person_id = ? AND status = 'open'`).all(protectedPersonId);
    const timestamp = nowIso();
    for (const row of rows) {
      const context = JSON.stringify(this.buildContextSnapshot(row.case_id, protectedPersonId));
      this.database.prepare(`UPDATE privacy_review_items SET context_json = ?, updated_at = ? WHERE case_id = ? AND protected_person_id = ? AND status = 'open'`).run(context, timestamp, row.case_id, protectedPersonId);
    }
  }

  private createRetentionFollowUp(caseId: string, reason: string, reviewAt: string): void {
    const row = this.database.prepare<DatabaseRow>('SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
    this.createForCase(caseId, row?.protected_person_id ?? null, 'retention_due', { retentionReasonDocumented: true, reasonLength: reason.trim().length }, reviewAt, 'normal');
    this.database.prepare(`UPDATE privacy_review_items SET status = 'retention_documented' WHERE case_id = ? AND reason != 'retention_due' AND status = 'open'`).run(caseId);
  }

  private buildContextSnapshot(caseId: string, protectedPersonId?: string, extra: Record<string, unknown> = {}): PrivacyReviewContextSnapshot {
    const caseRow = this.database.prepare<DatabaseRow>('SELECT * FROM cases WHERE id = ?').get(caseId);
    const caseFile = caseRow ? mapCase(caseRow) : undefined;
    const personId = protectedPersonId ?? caseRow?.protected_person_id;
    const person = personId ? new ProtectedPersonService(this.database).get(personId) : undefined;
    const openDeadlineCount = safeScalar(this.database, `SELECT COUNT(*) AS value FROM deadlines WHERE case_id = ? AND status IN ('open','overdue')`, caseId);
    const runningMeasureCount = safeScalar(this.database, `SELECT COUNT(*) AS value FROM case_measures WHERE case_id = ? AND status NOT IN ('abgeschlossen','verworfen')`, caseId);
    const linkedDocumentCount = safeScalar(this.database, `SELECT COUNT(*) AS value FROM case_documents WHERE case_id = ?`, caseId);
    let lastActivityAt = caseFile?.openedAt;
    try {
      lastActivityAt = this.database.prepare<ScalarValueRow>(`SELECT MAX(value) AS value FROM (
        SELECT updated_at AS value FROM cases WHERE id = ?
        UNION ALL SELECT updated_at AS value FROM case_notes WHERE case_id = ?
        UNION ALL SELECT created_at AS value FROM case_documents WHERE case_id = ?
        UNION ALL SELECT updated_at AS value FROM deadlines WHERE case_id = ?
      )`).get(caseId, caseId, caseId, caseId)?.value?.toString() ?? caseFile?.openedAt;
    } catch {
      lastActivityAt = caseFile?.openedAt;
    }
    return {
      person,
      caseFile,
      openDeadlineCount,
      runningMeasureCount,
      linkedDocumentCount,
      lastActivityAt,
      freeTextReviewRequired: Boolean(extra.freeTextReviewRequired ?? true)
    };
  }
}
