import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { assertDestructivePrivacyConfirmation, assertRetentionDecision, decideLegacyBulkPrivacyReview, decidePrivacyReviewForContext, type PrivacyReviewReason } from './privacyReviewPolicy.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { applyPendingAnonymizationMarkers } from './textCommandPolicy.js';
import type { CaseCategory, CasePriority, CaseRecord, CaseStatus } from '../src/app/core/models/case.model.js';
import type { PrivacyReviewItemRecord, PrivacyReviewItemStatus, PrivacyReviewContextSnapshot } from '../src/app/core/models/privacy-review.model.js';
import { caseWhereSql, directCasePrivacyEntities } from './privacyEntityRegistry.js';

function nowIso(): string { return new Date().toISOString(); }
function tryExec(db: DatabaseAdapter, sql: string): void { try { db.exec(sql); } catch { /* idempotent */ } }
function columnExists(db: DatabaseAdapter, table: string, column: string): boolean {
  try { return db.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all().some((row) => row.name === column); } catch { return false; }
}
function tableExists(db: DatabaseAdapter, table: string): boolean {
  try { return Boolean(db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)?.name); } catch { return false; }
}
function addColumnIfMissing(db: DatabaseAdapter, table: string, column: string, definition: string): void {
  if (!columnExists(db, table, column)) tryExec(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}
function safeScalar(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  try { return Number((db.prepare<any>(sql).get(...params) as any)?.value ?? 0); } catch { return 0; }
}

function mapCase(row: any): CaseRecord {
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

function mapReviewItem(row: any): PrivacyReviewItemRecord {
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


function replacePendingMarkersInRecordFields(db: DatabaseAdapter, table: string, idColumn: string, whereSql: string, whereParams: unknown[], fields: string[], timestamp: string): number {
  if (!tableExists(db, table)) return 0;
  const existingFields = fields.filter((field) => columnExists(db, table, field));
  if (!existingFields.length || !columnExists(db, table, idColumn)) return 0;
  const rows = db.prepare<any>(`SELECT ${idColumn}, ${existingFields.join(', ')} FROM ${table} ${whereSql}`).all(...whereParams);
  let affected = 0;
  const hasUpdatedAt = columnExists(db, table, 'updated_at');
  for (const row of rows) {
    const updates: string[] = [];
    const params: unknown[] = [];
    for (const field of existingFields) {
      const current = row[field] as string | null | undefined;
      const next = applyPendingAnonymizationMarkers(current);
      if (next !== current) {
        updates.push(`${field} = ?`);
        params.push(next);
      }
    }
    if (!updates.length) continue;
    if (hasUpdatedAt) {
      updates.push('updated_at = ?');
      params.push(timestamp);
    }
    params.push(row[idColumn]);
    affected += Number((db.prepare(`UPDATE ${table} SET ${updates.join(', ')} WHERE ${idColumn} = ?`).run(...params) as { changes?: number }).changes ?? 0);
  }
  return affected;
}

function replacePendingAnonymizationMarkersForCase(db: DatabaseAdapter, caseId: string, timestamp: string): number {
  let affected = 0;
  for (const entity of directCasePrivacyEntities()) {
    affected += replacePendingMarkersInRecordFields(
      db,
      entity.table,
      entity.idColumn,
      caseWhereSql(entity),
      [caseId],
      [...entity.pendingMarkerFields],
      timestamp,
    );
  }

  affected += replacePendingMarkersInRecordFields(db, 'bem_process_events', 'id', 'WHERE process_id IN (SELECT id FROM bem_processes WHERE case_id = ?)', [caseId], ['title', 'description'], timestamp);
  affected += replacePendingMarkersInRecordFields(db, 'prevention_process_events', 'id', 'WHERE process_id IN (SELECT id FROM prevention_processes WHERE case_id = ?)', [caseId], ['title', 'description'], timestamp);
  affected += replacePendingMarkersInRecordFields(db, 'sbv_participation_events', 'id', 'WHERE participation_id IN (SELECT id FROM sbv_participations WHERE case_id = ?)', [caseId], ['title', 'description'], timestamp);

  const measureRows = tableExists(db, 'case_measures') ? db.prepare<{ id: string }>('SELECT id FROM case_measures WHERE case_id = ?').all(caseId) : [];
  for (const measure of measureRows) {
    affected += replacePendingMarkersInRecordFields(db, 'case_measure_participation', 'measure_id', 'WHERE measure_id = ?', [measure.id], ['violation_summary', 'sbv_position'], timestamp);
    affected += replacePendingMarkersInRecordFields(db, 'case_measure_events', 'id', 'WHERE measure_id = ?', [measure.id], ['title', 'description'], timestamp);
    affected += replacePendingMarkersInRecordFields(db, 'case_measure_workplace_accommodation', 'measure_id', 'WHERE measure_id = ?', [measure.id], [
      'requested_adjustment', 'barrier_or_limitation', 'workplace_context', 'proposed_solution', 'outcome'
    ], timestamp);
  }
  return affected;
}

export class PrivacyReviewService {
  constructor(private readonly db: DatabaseAdapter) {}

  ensureSchema(): void {
    tryExec(this.db, `CREATE TABLE IF NOT EXISTS privacy_review_items (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      protected_person_id TEXT REFERENCES protected_persons(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_at TEXT NOT NULL,
      free_text_review_required INTEGER NOT NULL DEFAULT 1,
      context_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleared','anonymized','deleted','retention_documented')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    addColumnIfMissing(this.db, 'privacy_review_items', 'protected_person_id', 'TEXT REFERENCES protected_persons(id) ON DELETE SET NULL');
    addColumnIfMissing(this.db, 'privacy_review_items', 'priority', "TEXT NOT NULL DEFAULT 'normal'");
    addColumnIfMissing(this.db, 'privacy_review_items', 'due_at', 'TEXT');
    addColumnIfMissing(this.db, 'privacy_review_items', 'free_text_review_required', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing(this.db, 'privacy_review_items', 'context_json', "TEXT NOT NULL DEFAULT '{}'");
    addColumnIfMissing(this.db, 'privacy_review_items', 'status', "TEXT NOT NULL DEFAULT 'open'");
    tryExec(this.db, `CREATE INDEX IF NOT EXISTS idx_privacy_review_items_case ON privacy_review_items(case_id, status);`);
    tryExec(this.db, `CREATE INDEX IF NOT EXISTS idx_privacy_review_items_person ON privacy_review_items(protected_person_id, status);`);
  }

  listOpenForPerson(protectedPersonId: string): PrivacyReviewItemRecord[] {
    this.ensureSchema();
    this.refreshOpenReviewContextsForPerson(protectedPersonId);
    return this.db.prepare<any>(`SELECT * FROM privacy_review_items WHERE protected_person_id = ? AND status = 'open' ORDER BY due_at ASC, priority ASC`).all(protectedPersonId).map(mapReviewItem);
  }

  listOpenForCase(caseId: string): PrivacyReviewItemRecord[] {
    this.ensureSchema();
    return this.db.prepare<any>(`SELECT * FROM privacy_review_items WHERE case_id = ? AND status = 'open' ORDER BY due_at ASC`).all(caseId).map(mapReviewItem);
  }

  createForCase(caseId: string, protectedPersonId: string | null, reason: PrivacyReviewReason, context: PrivacyReviewContextInput = {}, dueAt = nowIso(), priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): void {
    this.ensureSchema();
    const timestamp = nowIso();
    const contextSnapshot = isPrivacyReviewContextSnapshot(context)
      ? context
      : this.buildContextSnapshot(caseId, protectedPersonId ?? undefined, context);
    const contextJson = JSON.stringify(contextSnapshot);
    const existing = this.db.prepare<any>(`SELECT id FROM privacy_review_items WHERE case_id = ? AND reason = ? AND status = 'open'`).get(caseId, reason);
    if (existing?.id) {
      this.db.prepare(`UPDATE privacy_review_items SET protected_person_id = ?, priority = ?, due_at = ?, free_text_review_required = 1, context_json = ?, updated_at = ? WHERE id = ?`)
        .run(protectedPersonId, priority, dueAt, contextJson, timestamp, existing.id);
    } else {
      this.db.prepare(`INSERT INTO privacy_review_items (id, case_id, protected_person_id, reason, priority, due_at, free_text_review_required, context_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`)
        .run(randomUUID(), caseId, protectedPersonId, reason, priority, dueAt, contextJson, timestamp, timestamp);
    }
    this.db.prepare(`UPDATE cases SET privacy_review_required = 1, privacy_review_reason = ?, privacy_review_due_at = ?, privacy_review_priority = ?, updated_at = ? WHERE id = ?`)
      .run(reason, dueAt, priority, timestamp, caseId);
    new PersonalDataAuditLogService(this.db).append({ action: 'create', subjectType: 'privacy_review', subjectId: protectedPersonId ?? undefined, caseId, purpose: 'Datenschutzprüfung angelegt', metadata: { reason, priority } });
  }

  markLinkedCasesForPerson(protectedPersonId: string, trigger: 'status_expired' | 'employment_ended' | 'linked_person_anonymized' | 'linked_person_deleted'): number {
    this.ensureSchema();
    const cases = this.db.prepare<any>(`SELECT * FROM cases WHERE protected_person_id = ?`).all(protectedPersonId);
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
    this.db.prepare(`UPDATE cases SET privacy_review_required = 0, privacy_review_reason = 'retention_reason_documented', privacy_review_due_at = ?, updated_at = ? WHERE id = ?`).run(reviewAt, timestamp, caseId);
    this.db.prepare(`UPDATE privacy_review_items SET status = 'retention_documented', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    this.createRetentionFollowUp(caseId, reason, reviewAt);
    new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'privacy_review', caseId, purpose: 'Fortspeicherung begründet', metadata: { reviewAt, reasonDocumented: true } });
  }

  scheduleLater(caseId: string, reason: string, reviewAt: string): void {
    assertRetentionDecision(reason, reviewAt);
    const timestamp = nowIso();
    this.db.prepare(`UPDATE cases SET privacy_review_required = 1, privacy_review_reason = 'retention_due', privacy_review_due_at = ?, updated_at = ? WHERE id = ?`).run(reviewAt, timestamp, caseId);
    this.db.prepare(`UPDATE privacy_review_items SET status = 'retention_documented', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    this.createRetentionFollowUp(caseId, reason, reviewAt);
  }

  clearCaseReview(caseId: string, reason: string): void {
    if (!reason.trim()) throw new Error('Für das Abschließen der Datenschutzprüfung ist ein kurzer Grund erforderlich.');
    const timestamp = nowIso();
    this.db.prepare(`UPDATE cases SET privacy_review_required = 0, privacy_review_reason = NULL, privacy_review_due_at = NULL, updated_at = ? WHERE id = ?`).run(timestamp, caseId);
    this.db.prepare(`UPDATE privacy_review_items SET status = 'cleared', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
    new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'privacy_review', caseId, purpose: 'Datenschutzprüfung abgeschlossen', metadata: { cleared: true } });
  }


  anonymizeCaseStructuredData(caseId: string, reason: string, confirmation: string): { ok: boolean; message?: string; error?: string; affectedRows?: number; affectedFiles?: number } {
    try {
      assertDestructivePrivacyConfirmation('anonymize', confirmation);
      if (!reason.trim()) throw new Error('Für die Anonymisierung ist ein dokumentierter Grund erforderlich.');
      const row = this.db.prepare<any>('SELECT id, case_number FROM cases WHERE id = ?').get(caseId);
      if (!row) return { ok: false, error: 'Fall nicht gefunden.', affectedRows: 0, affectedFiles: 0 };
      const timestamp = nowIso();
      let affectedRows = 0;
      affectedRows += Number((this.db.prepare(`UPDATE cases SET display_name = '[Fall anonymisiert]', protected_person_id = NULL, person_binding_state = 'anonymized', is_pseudonymized = 1, privacy_review_required = 1, privacy_review_reason = 'linked_person_anonymized', anonymized_at = ?, updated_at = ? WHERE id = ?`).run(timestamp, timestamp, caseId) as { changes?: number }).changes ?? 0);
      affectedRows += replacePendingAnonymizationMarkersForCase(this.db, caseId, timestamp);
      affectedRows += Number((this.db.prepare(`UPDATE person_case_links SET link_state = 'person_anonymized', anonymized_at = ? WHERE case_file_id = ? AND link_state = 'active'`).run(timestamp, caseId) as { changes?: number }).changes ?? 0);
      this.db.prepare(`UPDATE privacy_review_items SET status = 'anonymized', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
      new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'privacy_review', caseId, purpose: 'Fallakte strukturiert anonymisiert', metadata: { reasonDocumented: true, pendingMarkersApplied: true, unmarkedFreeTextReviewRequired: true } });
      return { ok: true, message: `Fall ${row.case_number} wurde strukturiert anonymisiert. Vorgemerkte Freitextstellen wurden ersetzt; nicht markierte Freitexte bleiben prüfpflichtig.`, affectedRows, affectedFiles: 0 };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Fallakte konnte nicht anonymisiert werden.', affectedRows: 0, affectedFiles: 0 };
    }
  }

  markCaseAnonymized(caseId: string): void {
    const timestamp = nowIso();
    this.db.prepare(`UPDATE cases SET person_binding_state = 'anonymized', privacy_review_required = 1, privacy_review_reason = 'linked_person_anonymized', anonymized_at = ?, updated_at = ? WHERE id = ?`).run(timestamp, timestamp, caseId);
    this.db.prepare(`UPDATE privacy_review_items SET status = 'anonymized', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(timestamp, caseId);
  }

  markCaseDeleted(caseId: string): void {
    this.db.prepare(`UPDATE privacy_review_items SET status = 'deleted', updated_at = ? WHERE case_id = ? AND status = 'open'`).run(nowIso(), caseId);
  }


  bulkMarkClosedLegacyCasesForAnonymization(referenceDate = new Date()): { reviewed: number; marked: number; skipped: number } {
    this.ensureSchema();
    const rows = this.db.prepare<any>(`
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
      this.db.prepare(`UPDATE cases SET anonymization_recommended = 1, privacy_review_priority = ?, updated_at = ? WHERE id = ?`).run(decision.priority, nowIso(), row.id);
      marked += 1;
    }
    new PersonalDataAuditLogService(this.db).append({ action: 'update', subjectType: 'privacy_review', purpose: 'Bulk-Aktion abgeschlossene Altakten vormerken', metadata: { reviewed, marked, skipped } });
    return { reviewed, marked, skipped };
  }

  private refreshOpenReviewContextsForPerson(protectedPersonId: string): void {
    const rows = this.db.prepare<any>(`SELECT case_id FROM privacy_review_items WHERE protected_person_id = ? AND status = 'open'`).all(protectedPersonId);
    const timestamp = nowIso();
    for (const row of rows) {
      const context = JSON.stringify(this.buildContextSnapshot(row.case_id, protectedPersonId));
      this.db.prepare(`UPDATE privacy_review_items SET context_json = ?, updated_at = ? WHERE case_id = ? AND protected_person_id = ? AND status = 'open'`).run(context, timestamp, row.case_id, protectedPersonId);
    }
  }

  private createRetentionFollowUp(caseId: string, reason: string, reviewAt: string): void {
    const row = this.db.prepare<any>('SELECT protected_person_id FROM cases WHERE id = ?').get(caseId);
    this.createForCase(caseId, row?.protected_person_id ?? null, 'retention_due', { retentionReasonDocumented: true, reasonLength: reason.trim().length }, reviewAt, 'normal');
    this.db.prepare(`UPDATE privacy_review_items SET status = 'retention_documented' WHERE case_id = ? AND reason != 'retention_due' AND status = 'open'`).run(caseId);
  }

  private buildContextSnapshot(caseId: string, protectedPersonId?: string, extra: Record<string, unknown> = {}): PrivacyReviewContextSnapshot {
    const caseRow = this.db.prepare<any>('SELECT * FROM cases WHERE id = ?').get(caseId);
    const caseFile = caseRow ? mapCase(caseRow) : undefined;
    const personId = protectedPersonId ?? caseRow?.protected_person_id;
    const person = personId ? new ProtectedPersonService(this.db).get(personId) : undefined;
    const openDeadlineCount = safeScalar(this.db, `SELECT COUNT(*) AS value FROM deadlines WHERE case_id = ? AND status IN ('open','overdue')`, caseId);
    const runningMeasureCount = safeScalar(this.db, `SELECT COUNT(*) AS value FROM case_measures WHERE case_id = ? AND status NOT IN ('abgeschlossen','verworfen')`, caseId);
    const linkedDocumentCount = safeScalar(this.db, `SELECT COUNT(*) AS value FROM case_documents WHERE case_id = ?`, caseId);
    let lastActivityAt = caseFile?.openedAt;
    try {
      lastActivityAt = (this.db.prepare<any>(`SELECT MAX(value) AS value FROM (
        SELECT updated_at AS value FROM cases WHERE id = ?
        UNION ALL SELECT updated_at AS value FROM case_notes WHERE case_id = ?
        UNION ALL SELECT created_at AS value FROM case_documents WHERE case_id = ?
        UNION ALL SELECT updated_at AS value FROM deadlines WHERE case_id = ?
      )`).get(caseId, caseId, caseId, caseId) as any)?.value ?? caseFile?.openedAt;
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
