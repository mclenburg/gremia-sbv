import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DeadlineService } from './deadlineService.js';
import { defaultBemResponseDueAt } from './bemWorkflowPolicy.js';
import type {
  BemDashboardSummary,
  BemProcessRecord,
  BemStatus,
  CreateBemProcessInput,
  UpdateBemProcessInput
} from '../src/app/core/models/bem.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function legacyPhaseForStatus(status: string): 'pruefung' | 'angebot' | 'reaktion' | 'gespraech' | 'massnahmen' | 'abschluss' {
  if (status === 'zu_pruefen') return 'pruefung';
  if (status === 'angebot_vorzubereiten' || status === 'angebot_versendet') return 'angebot';
  if (status === 'reaktion_abwarten' || status === 'angenommen' || status === 'abgelehnt') return 'reaktion';
  if (status === 'gespraech_geplant') return 'gespraech';
  if (status === 'massnahmen_in_klaerung' || status === 'massnahmen_vereinbart' || status === 'wirksamkeit_pruefen') return 'massnahmen';
  return 'abschluss';
}

function mapProcess(row: any, contactIds: string[]): BemProcessRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    status: row.status,
    currentPhase: legacyPhaseForStatus(row.status),
    title: row.title,
    triggerType: row.trigger_type ?? 'sonstiges',
    triggerDescription: row.trigger_description ?? undefined,
    sicknessDaysTwelveMonths: row.sickness_days_twelve_months ?? undefined,
    bemOfferedAt: row.bem_offered_at ?? undefined,
    responseDueAt: row.response_due_at ?? undefined,
    employeeResponse: row.employee_response ?? 'offen',
    employeeResponseAt: row.employee_response_at ?? undefined,
    privacyNoticeAt: row.privacy_notice_at ?? undefined,
    consentScope: row.consent_scope ?? undefined,
    consentWithdrawnAt: row.consent_withdrawn_at ?? undefined,
    dataRetentionNote: row.data_retention_note ?? undefined,
    firstMeetingAt: row.first_meeting_at ?? undefined,
    participants: row.participants ?? undefined,
    measures: row.measures ?? undefined,
    measureOwners: row.measure_owners ?? undefined,
    nextReviewAt: row.next_review_at ?? undefined,
    result: row.result ?? undefined,
    completionReason: row.completion_reason ?? undefined,
    confidentialNotes: row.confidential_notes ?? undefined,
    contactIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class BemService {
  constructor(private readonly db: DatabaseAdapter) {}

  list(caseId?: string): BemProcessRecord[] {
    const rows = caseId
      ? this.db.prepare<any>('SELECT * FROM bem_processes WHERE case_id = ? ORDER BY COALESCE(bem_offered_at, first_meeting_at, created_at) DESC').all(caseId)
      : this.db.prepare<any>('SELECT * FROM bem_processes ORDER BY COALESCE(bem_offered_at, first_meeting_at, created_at) DESC').all();
    return rows.map((row) => mapProcess(row, this.contactIdsForProcess(row.id)));
  }

  dashboardSummary(): BemDashboardSummary {
    const rows = this.list();
    const now = new Date();
    return {
      open: rows.filter((row) => row.status !== 'abgeschlossen' && row.status !== 'abgelehnt' && row.status !== 'abgebrochen').length,
      waitingForResponse: rows.filter((row) => row.status === 'reaktion_abwarten' || row.employeeResponse === 'offen').length,
      accepted: rows.filter((row) => row.employeeResponse === 'angenommen').length,
      dueForResponse: rows.filter((row) => row.responseDueAt && row.employeeResponse === 'offen' && new Date(row.responseDueAt) <= now).length,
      inMeasures: rows.filter((row) => row.status === 'massnahmen_in_klaerung' || row.status === 'massnahmen_vereinbart' || row.status === 'wirksamkeit_pruefen').length,
      completed: rows.filter((row) => row.status === 'abgeschlossen').length
    };
  }

  createForCase(caseId: string, triggerDate?: string): BemProcessRecord {
    return this.create({
      caseId,
      title: 'BEM-Verfahren',
      triggerType: 'sechs_wochen_au',
      triggerDescription: triggerDate ? `BEM-Auslöser dokumentiert am ${triggerDate}` : 'BEM-Auslöser dokumentiert.',
      createDefaultDeadlines: true
    });
  }

  create(input: CreateBemProcessInput): BemProcessRecord {
    if (!input.caseId) throw new Error('Ein BEM-Verfahren muss einem Fall zugeordnet sein.');

    const id = randomUUID();
    const timestamp = nowIso();
    const bemOfferedAt = input.bemOfferedAt ? new Date(input.bemOfferedAt).toISOString() : null;
    const responseDueAt = input.responseDueAt
      ? new Date(input.responseDueAt).toISOString()
      : bemOfferedAt
        ? defaultBemResponseDueAt(bemOfferedAt)
        : null;
    const status: BemStatus = bemOfferedAt ? 'angebot_versendet' : 'zu_pruefen';

    this.db.prepare(`
      INSERT INTO bem_processes (
        id, case_id, status, title, trigger_type, trigger_description, sickness_days_twelve_months,
        bem_offered_at, response_due_at, employee_response, employee_response_at, privacy_notice_at, consent_scope,
        consent_withdrawn_at, data_retention_note, first_meeting_at, participants, measures, measure_owners,
        next_review_at, result, completion_reason, confidential_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      status,
      input.title?.trim() || 'BEM-Verfahren',
      input.triggerType ?? 'sonstiges',
      input.triggerDescription ?? null,
      input.sicknessDaysTwelveMonths ?? null,
      bemOfferedAt,
      responseDueAt,
      input.employeeResponse ?? 'offen',
      input.employeeResponseAt ? new Date(input.employeeResponseAt).toISOString() : null,
      input.privacyNoticeAt ? new Date(input.privacyNoticeAt).toISOString() : null,
      input.consentScope ?? null,
      input.consentWithdrawnAt ? new Date(input.consentWithdrawnAt).toISOString() : null,
      input.dataRetentionNote ?? null,
      input.firstMeetingAt ? new Date(input.firstMeetingAt).toISOString() : null,
      input.participants ?? null,
      input.measures ?? null,
      input.measureOwners ?? null,
      input.nextReviewAt ? new Date(input.nextReviewAt).toISOString() : null,
      input.result ?? null,
      input.completionReason ?? null,
      input.confidentialNotes ?? null,
      timestamp,
      timestamp
    );

    this.replaceContacts(id, input.contactIds ?? []);
    this.event(id, 'created', 'BEM-Verfahren angelegt', input.triggerDescription);

    if (input.createDefaultDeadlines !== false && responseDueAt) {
      new DeadlineService(this.db).create({
        caseId: input.caseId,
        processId: id,
        processType: 'bem',
        deadlineType: 'follow_up',
        title: 'BEM-Reaktion nachhalten',
        confidentialTitle: 'BEM: Reaktion nachhalten',
        description: 'Automatische Wiedervorlage aus dem BEM-Verfahren.',
        dueAt: responseDueAt,
        legalBasis: '§ 167 Abs. 2 SGB IX',
        sourceEvent: 'bem_process_created',
        severity: 'important',
        calculationMode: 'workflow',
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24
      });
    }

    return this.getById(id)!;
  }

  update(id: string, input: UpdateBemProcessInput): BemProcessRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`BEM-Verfahren nicht gefunden: ${id}`);

    const next = {
      status: input.status ?? existing.status,
      title: input.title ?? existing.title,
      triggerType: input.triggerType ?? existing.triggerType,
      triggerDescription: input.triggerDescription !== undefined ? input.triggerDescription : existing.triggerDescription,
      sicknessDaysTwelveMonths: input.sicknessDaysTwelveMonths !== undefined ? input.sicknessDaysTwelveMonths : existing.sicknessDaysTwelveMonths,
      bemOfferedAt: input.bemOfferedAt !== undefined ? input.bemOfferedAt : existing.bemOfferedAt,
      responseDueAt: input.responseDueAt !== undefined ? input.responseDueAt : existing.responseDueAt,
      employeeResponse: input.employeeResponse ?? existing.employeeResponse,
      employeeResponseAt: input.employeeResponseAt !== undefined ? input.employeeResponseAt : existing.employeeResponseAt,
      privacyNoticeAt: input.privacyNoticeAt !== undefined ? input.privacyNoticeAt : existing.privacyNoticeAt,
      consentScope: input.consentScope !== undefined ? input.consentScope : existing.consentScope,
      consentWithdrawnAt: input.consentWithdrawnAt !== undefined ? input.consentWithdrawnAt : existing.consentWithdrawnAt,
      dataRetentionNote: input.dataRetentionNote !== undefined ? input.dataRetentionNote : existing.dataRetentionNote,
      firstMeetingAt: input.firstMeetingAt !== undefined ? input.firstMeetingAt : existing.firstMeetingAt,
      participants: input.participants !== undefined ? input.participants : existing.participants,
      measures: input.measures !== undefined ? input.measures : existing.measures,
      measureOwners: input.measureOwners !== undefined ? input.measureOwners : existing.measureOwners,
      nextReviewAt: input.nextReviewAt !== undefined ? input.nextReviewAt : existing.nextReviewAt,
      result: input.result !== undefined ? input.result : existing.result,
      completionReason: input.completionReason !== undefined ? input.completionReason : existing.completionReason,
      confidentialNotes: input.confidentialNotes !== undefined ? input.confidentialNotes : existing.confidentialNotes
    };

    this.db.prepare(`
      UPDATE bem_processes
      SET status = ?, title = ?, trigger_type = ?, trigger_description = ?, sickness_days_twelve_months = ?,
          bem_offered_at = ?, response_due_at = ?, employee_response = ?, employee_response_at = ?, privacy_notice_at = ?,
          consent_scope = ?, consent_withdrawn_at = ?, data_retention_note = ?, first_meeting_at = ?,
          participants = ?, measures = ?, measure_owners = ?, next_review_at = ?, result = ?, completion_reason = ?, confidential_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      next.status,
      next.title,
      next.triggerType,
      next.triggerDescription ?? null,
      next.sicknessDaysTwelveMonths ?? null,
      next.bemOfferedAt ? new Date(next.bemOfferedAt).toISOString() : null,
      next.responseDueAt ? new Date(next.responseDueAt).toISOString() : null,
      next.employeeResponse,
      next.employeeResponseAt ? new Date(next.employeeResponseAt).toISOString() : null,
      next.privacyNoticeAt ? new Date(next.privacyNoticeAt).toISOString() : null,
      next.consentScope ?? null,
      next.consentWithdrawnAt ? new Date(next.consentWithdrawnAt).toISOString() : null,
      next.dataRetentionNote ?? null,
      next.firstMeetingAt ? new Date(next.firstMeetingAt).toISOString() : null,
      next.participants ?? null,
      next.measures ?? null,
      next.measureOwners ?? null,
      next.nextReviewAt ? new Date(next.nextReviewAt).toISOString() : null,
      next.result ?? null,
      next.completionReason ?? null,
      next.confidentialNotes ?? null,
      nowIso(),
      id
    );

    if (input.contactIds) this.replaceContacts(id, input.contactIds);
    this.event(id, 'updated', 'BEM-Verfahren aktualisiert', JSON.stringify(input));
    return this.getById(id)!;
  }

  setStatus(id: string, status: BemStatus): BemProcessRecord {
    return this.update(id, { status });
  }

  getById(id: string): BemProcessRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM bem_processes WHERE id = ?').get(id);
    return row ? mapProcess(row, this.contactIdsForProcess(id)) : undefined;
  }

  private contactIdsForProcess(processId: string): string[] {
    return this.db.prepare<{ contact_id: string }>('SELECT contact_id FROM bem_process_contacts WHERE process_id = ? ORDER BY created_at ASC')
      .all(processId)
      .map((row) => row.contact_id);
  }

  private replaceContacts(processId: string, contactIds: string[]): void {
    const timestamp = nowIso();
    this.db.prepare('DELETE FROM bem_process_contacts WHERE process_id = ?').run(processId);
    const insert = this.db.prepare('INSERT OR IGNORE INTO bem_process_contacts (process_id, contact_id, created_at) VALUES (?, ?, ?)');
    [...new Set(contactIds)].filter(Boolean).forEach((contactId) => insert.run(processId, contactId, timestamp));
  }

  private event(processId: string, eventType: string, title: string, description?: string): void {
    this.db.prepare('INSERT INTO bem_process_events (id, process_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), processId, eventType, title, description ?? null, nowIso());
  }
}
