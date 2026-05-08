import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { DeadlineService } from './deadlineService.js';
import { defaultEmployerResponseDueAt, preventionReviewDueAtAfterEmployerDeadline } from './preventionWorkflowPolicy.js';
import type {
  CreatePreventionProcessInput,
  PreventionDashboardSummary,
  PreventionProcessRecord,
  PreventionStatus,
  UpdatePreventionProcessInput
} from '../src/app/core/models/prevention.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function mapProcess(row: any, contactIds: string[]): PreventionProcessRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    status: row.status,
    firstKnowledgeAt: row.first_knowledge_at ?? undefined,
    requestedAt: row.requested_at ?? undefined,
    employerResponseDueAt: row.employer_response_due_at ?? undefined,
    employerRespondedAt: row.employer_responded_at ?? undefined,
    integrationOfficeInvolvedAt: row.integration_office_involved_at ?? undefined,
    difficultyType: row.difficulty_type ?? 'sonstiges',
    riskType: row.risk_type ?? 'sonstiges',
    personStatus: row.person_status ?? 'unklar',
    hazardDescription: row.hazard_description ?? undefined,
    employerRequestSummary: row.employer_request_summary ?? undefined,
    measures: row.measures ?? undefined,
    result: row.result ?? undefined,
    nextReviewAt: row.next_review_at ?? undefined,
    contactIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PreventionService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureAuditSchema();
  }

  private ensureAuditSchema(): void {
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'prevention_process', subjectId, caseId, purpose });
    } catch (error) {
      console.warn('Gremia.SBV audit log write failed', error);
    }
  }

  list(caseId?: string): PreventionProcessRecord[] {
    this.audit('read', undefined, caseId, 'prevention_process Liste anzeigen');
    const rows = caseId
      ? this.db.prepare<any>('SELECT * FROM prevention_processes WHERE case_id = ? ORDER BY COALESCE(requested_at, first_knowledge_at, created_at) DESC').all(caseId)
      : this.db.prepare<any>('SELECT * FROM prevention_processes ORDER BY COALESCE(requested_at, first_knowledge_at, created_at) DESC').all();
    return rows.map((row) => mapProcess(row, this.contactIdsForProcess(row.id)));
  }

  dashboardSummary(): PreventionDashboardSummary {
    const rows = this.list();
    const now = new Date();
    return {
      open: rows.filter((row) => row.status !== 'abgeschlossen').length,
      critical: rows.filter((row) => row.status === 'blockiert_verweigert' || row.riskType === 'kuendigung' || row.riskType === 'arbeitsplatzverlust').length,
      blocked: rows.filter((row) => row.status === 'blockiert_verweigert').length,
      dueForEmployerResponse: rows.filter((row) => row.employerResponseDueAt && !row.employerRespondedAt && new Date(row.employerResponseDueAt) <= now).length
    };
  }

  create(input: CreatePreventionProcessInput): PreventionProcessRecord {
    if (!input.caseId) throw new Error('Ein Präventionsverfahren muss einem Fall zugeordnet sein.');

    const id = randomUUID();
    const timestamp = nowIso();
    const requestedAt = input.requestedAt ? new Date(input.requestedAt).toISOString() : null;
    const employerResponseDueAt = input.employerResponseDueAt
      ? new Date(input.employerResponseDueAt).toISOString()
      : requestedAt
        ? defaultEmployerResponseDueAt(requestedAt)
        : null;

    this.db.prepare(`
      INSERT INTO prevention_processes (
        id, case_id, status, first_knowledge_at, requested_at, employer_response_due_at,
        difficulty_type, risk_type, person_status, hazard_description, created_at, updated_at
      ) VALUES (?, ?, 'zu_pruefen', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.firstKnowledgeAt ? new Date(input.firstKnowledgeAt).toISOString() : null,
      requestedAt,
      employerResponseDueAt,
      input.difficultyType ?? 'sonstiges',
      input.riskType ?? 'sonstiges',
      input.personStatus ?? 'unklar',
      input.hazardDescription ?? null,
      timestamp,
      timestamp
    );

    this.replaceContacts(id, input.contactIds ?? []);
    this.event(id, 'created', 'Präventionsverfahren angelegt', input.hazardDescription);

    if (input.createDefaultDeadlines !== false && employerResponseDueAt) {
      const reviewDueAt = preventionReviewDueAtAfterEmployerDeadline(employerResponseDueAt);
      this.db.prepare('UPDATE prevention_processes SET next_review_at = ?, updated_at = ? WHERE id = ?').run(reviewDueAt, timestamp, id);
      new DeadlineService(this.db).create({
        caseId: input.caseId,
        processId: id,
        processType: 'prevention',
        deadlineType: 'follow_up',
        title: 'Arbeitgeberreaktion Präventionsverfahren nachhalten',
        confidentialTitle: 'Präventionsverfahren: Arbeitgeberreaktion nachhalten',
        description: 'Automatische Wiedervorlage aus dem Präventionsverfahren.',
        dueAt: reviewDueAt,
        reminderAt: employerResponseDueAt,
        legalBasis: '§ 167 Abs. 1 SGB IX',
        sourceEvent: 'prevention_process_created',
        severity: input.riskType === 'kuendigung' || input.riskType === 'arbeitsplatzverlust' ? 'critical' : 'important',
        calculationMode: 'workflow',
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24
      });
    }

    this.audit('create', id, input.caseId, 'prevention_process angelegt');
    return this.getById(id)!;
  }

  update(id: string, input: UpdatePreventionProcessInput): PreventionProcessRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`Präventionsverfahren nicht gefunden: ${id}`);

    const next = {
      status: input.status ?? existing.status,
      firstKnowledgeAt: input.firstKnowledgeAt !== undefined ? input.firstKnowledgeAt : existing.firstKnowledgeAt,
      requestedAt: input.requestedAt !== undefined ? input.requestedAt : existing.requestedAt,
      employerResponseDueAt: input.employerResponseDueAt !== undefined ? input.employerResponseDueAt : existing.employerResponseDueAt,
      employerRespondedAt: input.employerRespondedAt !== undefined ? input.employerRespondedAt : existing.employerRespondedAt,
      integrationOfficeInvolvedAt: input.integrationOfficeInvolvedAt !== undefined ? input.integrationOfficeInvolvedAt : existing.integrationOfficeInvolvedAt,
      difficultyType: input.difficultyType ?? existing.difficultyType,
      riskType: input.riskType ?? existing.riskType,
      personStatus: input.personStatus ?? existing.personStatus,
      hazardDescription: input.hazardDescription !== undefined ? input.hazardDescription : existing.hazardDescription,
      employerRequestSummary: input.employerRequestSummary !== undefined ? input.employerRequestSummary : existing.employerRequestSummary,
      measures: input.measures !== undefined ? input.measures : existing.measures,
      result: input.result !== undefined ? input.result : existing.result,
      nextReviewAt: input.nextReviewAt !== undefined ? input.nextReviewAt : existing.nextReviewAt
    };

    this.db.prepare(`
      UPDATE prevention_processes
      SET status = ?, first_knowledge_at = ?, requested_at = ?, employer_response_due_at = ?, employer_responded_at = ?,
          integration_office_involved_at = ?, difficulty_type = ?, risk_type = ?, person_status = ?, hazard_description = ?,
          employer_request_summary = ?, measures = ?, result = ?, next_review_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      next.status,
      next.firstKnowledgeAt ? new Date(next.firstKnowledgeAt).toISOString() : null,
      next.requestedAt ? new Date(next.requestedAt).toISOString() : null,
      next.employerResponseDueAt ? new Date(next.employerResponseDueAt).toISOString() : null,
      next.employerRespondedAt ? new Date(next.employerRespondedAt).toISOString() : null,
      next.integrationOfficeInvolvedAt ? new Date(next.integrationOfficeInvolvedAt).toISOString() : null,
      next.difficultyType,
      next.riskType,
      next.personStatus,
      next.hazardDescription ?? null,
      next.employerRequestSummary ?? null,
      next.measures ?? null,
      next.result ?? null,
      next.nextReviewAt ? new Date(next.nextReviewAt).toISOString() : null,
      nowIso(),
      id
    );

    if (input.contactIds) this.replaceContacts(id, input.contactIds);
    this.event(id, 'updated', 'Präventionsverfahren aktualisiert', JSON.stringify(input));
    this.audit('update', id, existing.caseId, 'prevention_process geändert');
    return this.getById(id)!;
  }

  setStatus(id: string, status: PreventionStatus): PreventionProcessRecord {
    return this.update(id, { status });
  }

  getById(id: string): PreventionProcessRecord | undefined {
    this.audit('read', id, undefined, 'prevention_process Detail anzeigen');
    const row = this.db.prepare<any>('SELECT * FROM prevention_processes WHERE id = ?').get(id);
    return row ? mapProcess(row, this.contactIdsForProcess(id)) : undefined;
  }

  private contactIdsForProcess(processId: string): string[] {
    return this.db.prepare<{ contact_id: string }>('SELECT contact_id FROM prevention_process_contacts WHERE process_id = ? ORDER BY created_at ASC')
      .all(processId)
      .map((row) => row.contact_id);
  }

  private replaceContacts(processId: string, contactIds: string[]): void {
    const timestamp = nowIso();
    this.db.prepare('DELETE FROM prevention_process_contacts WHERE process_id = ?').run(processId);
    const insert = this.db.prepare('INSERT OR IGNORE INTO prevention_process_contacts (process_id, contact_id, created_at) VALUES (?, ?, ?)');
    [...new Set(contactIds)].filter(Boolean).forEach((contactId) => insert.run(processId, contactId, timestamp));
  }

  private event(processId: string, eventType: string, title: string, description?: string): void {
    this.db.prepare('INSERT INTO prevention_process_events (id, process_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), processId, eventType, title, description ?? null, nowIso());
  }
}
