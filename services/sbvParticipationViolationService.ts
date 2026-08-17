import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { DeadlineService } from './deadlineService.js';
import { buildFromContext } from './activityJournalPrefill.js';
import { PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES, PARTICIPATION_VIOLATION_STAGES, PARTICIPATION_VIOLATION_STATUSES, PARTICIPATION_VIOLATION_STATUS_TRANSITIONS, PARTICIPATION_VIOLATION_TYPES, type CreateSbvParticipationViolationInput, type ParticipationViolationEventType, type ParticipationViolationSourceContextType, type ParticipationViolationStatus, type SbvParticipationViolationEventRecord, type SbvParticipationViolationListFilter, type SbvParticipationViolationRecord, type SbvParticipationViolationFollowUpResult, type UpdateSbvParticipationViolationInput } from '../src/domain/models/sbv-participation-violation.model.js';
import type { ActivityJournalPrefill } from '../src/domain/models/activity-journal.model.js';
import { DEFAULT_LEGAL_BASIS, ViolationRow, ViolationEventRow, RunResult, nowIso, normalizeText, addDaysIso, normalizeIso, oneOf, mapRecord, mapEvent } from './sbvParticipationViolationSupport.js';
import { ensureSbvParticipationViolationSchema } from './sbvParticipationViolationSchema.js';
export class SbvParticipationViolationService {
  constructor(private readonly db: DatabaseAdapter) {}

  ensureSchema(): void {
    ensureSbvParticipationViolationSchema(this.db);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: 'read' | 'create' | 'update' | 'delete', record?: SbvParticipationViolationRecord): void {
    const write = () => new PersonalDataAuditLogService(this.db).append({
      actor: 'sbv', action, subjectType: 'sbv_participation_violation', subjectId: record?.id,
      caseId: record?.caseId, purpose: 'SBV-Beteiligungsverstoß-Protokollierung',
      metadata: record ? { stage: record.stage, status: record.status, violationType: record.violationType,
        sourceContextType: record.sourceContextType, hasFollowUp: Boolean(record.followUpDueAt) } : undefined,
    });
    if (action !== 'read') { write(); return; }
    try { write(); } catch (error) { console.warn('Gremia.SBV participation violation read audit failed', error instanceof Error ? error.name : 'UnknownError'); }
  }

  private appendEvent(violationId: string, eventType: ParticipationViolationEventType, fromStatus?: ParticipationViolationStatus, toStatus?: ParticipationViolationStatus, note?: string): void {
    this.db.prepare(`
      INSERT INTO sbv_participation_violation_events (id, violation_id, event_type, from_status, to_status, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), violationId, eventType, fromStatus ?? null, toStatus ?? null, normalizeText(note), nowIso());
  }

  private ensureContextExists(contextType: ParticipationViolationSourceContextType, contextId: string): void {
    const tableByContext: Record<ParticipationViolationSourceContextType, string> = {
      case: 'cases',
      case_measure_participation: 'case_measures',
      sbv_participation: 'sbv_participations',
      termination_hearing: 'termination_hearings',
      sbv_control_protocol: 'sbv_control_protocols',
      deadline: 'deadlines',
      activity_journal: 'activity_journal_entries',
      recruiting_participation: 'recruiting_participations',
    };
    const table = tableByContext[contextType];
    const exists = this.db.prepare<{ value?: number }>(`SELECT 1 AS value FROM ${table} WHERE id = ?`).get(contextId);
    if (!exists) throw new Error(`Ausgangskontext ${contextType}:${contextId} wurde nicht gefunden.`);
  }

  private deriveCaseAndRelations(input: {
    sourceContextType: ParticipationViolationSourceContextType;
    sourceContextId: string;
    caseId?: string | null;
    relatedParticipationId?: string | null;
    relatedCaseMeasureId?: string | null;
    relatedTerminationHearingId?: string | null;
    relatedDeadlineId?: string | null;
    relatedActivityJournalEntryId?: string | null;
    relatedSbvControlProtocolId?: string | null;
    relatedRecruitingParticipationId?: string | null;
  }) {
    const explicitCaseId = normalizeText(input.caseId);
    const failCaseMismatch = (derivedCaseId: string | null | undefined) => {
      if (explicitCaseId && derivedCaseId && explicitCaseId !== derivedCaseId) {
        throw new Error('Der Fallbezug passt nicht zum ausgewählten Ausgangsvorgang. Bitte Kontext neu auswählen.');
      }
    };

    switch (input.sourceContextType) {
      case 'case_measure_participation': {
        const measure = this.db.prepare<{ id: string; case_id: string; type: string }>('SELECT id, case_id, type FROM case_measures WHERE id = ?').get(input.sourceContextId);
        if (!measure) throw new Error('Bitte zuerst die SBV-Beteiligung oder einen anderen Ausgangskontext auswählen.');
        if (measure.type !== 'sbv_participation') throw new Error('Der ausgewählte Vorgang ist keine SBV-Beteiligung.');
        const participation = this.db.prepare<{ value?: number }>('SELECT 1 AS value FROM case_measure_participation WHERE measure_id = ?').get(input.sourceContextId);
        if (!participation) throw new Error('Der ausgewählte Vorgang ist keine vollständige SBV-Beteiligungsmaßnahme.');
        failCaseMismatch(measure.case_id);
        return {
          caseId: measure.case_id,
          relatedParticipationId: null,
          relatedCaseMeasureId: measure.id,
          relatedTerminationHearingId: null,
          relatedDeadlineId: null,
          relatedActivityJournalEntryId: null,
          relatedSbvControlProtocolId: null,
          relatedRecruitingParticipationId: null,
        };
      }
      case 'case': {
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        failCaseMismatch(input.sourceContextId);
        return {
          caseId: input.sourceContextId,
          relatedParticipationId: normalizeText(input.relatedParticipationId),
          relatedCaseMeasureId: normalizeText(input.relatedCaseMeasureId),
          relatedTerminationHearingId: normalizeText(input.relatedTerminationHearingId),
          relatedDeadlineId: normalizeText(input.relatedDeadlineId),
          relatedActivityJournalEntryId: normalizeText(input.relatedActivityJournalEntryId),
          relatedSbvControlProtocolId: normalizeText(input.relatedSbvControlProtocolId),
          relatedRecruitingParticipationId: normalizeText(input.relatedRecruitingParticipationId),
        };
      }
      case 'termination_hearing': {
        const hearing = this.db.prepare<{ id: string; case_id: string }>('SELECT id, case_id FROM termination_hearings WHERE id = ?').get(input.sourceContextId);
        if (!hearing) throw new Error('Ausgangskontext termination_hearing wurde nicht gefunden.');
        failCaseMismatch(hearing.case_id);
        return {
          caseId: hearing.case_id,
          relatedParticipationId: null,
          relatedCaseMeasureId: null,
          relatedTerminationHearingId: hearing.id,
          relatedDeadlineId: null,
          relatedActivityJournalEntryId: null,
          relatedSbvControlProtocolId: null,
          relatedRecruitingParticipationId: null,
        };
      }
      case 'sbv_control_protocol':
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        return {
          caseId: null,
          relatedParticipationId: null,
          relatedCaseMeasureId: null,
          relatedTerminationHearingId: null,
          relatedDeadlineId: null,
          relatedActivityJournalEntryId: null,
          relatedSbvControlProtocolId: input.sourceContextId,
          relatedRecruitingParticipationId: null,
        };
      case 'deadline':
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        return {
          caseId: explicitCaseId,
          relatedParticipationId: normalizeText(input.relatedParticipationId),
          relatedCaseMeasureId: normalizeText(input.relatedCaseMeasureId),
          relatedTerminationHearingId: normalizeText(input.relatedTerminationHearingId),
          relatedDeadlineId: input.sourceContextId,
          relatedActivityJournalEntryId: normalizeText(input.relatedActivityJournalEntryId),
          relatedSbvControlProtocolId: normalizeText(input.relatedSbvControlProtocolId),
          relatedRecruitingParticipationId: normalizeText(input.relatedRecruitingParticipationId),
        };
      case 'activity_journal':
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        return {
          caseId: explicitCaseId,
          relatedParticipationId: normalizeText(input.relatedParticipationId),
          relatedCaseMeasureId: normalizeText(input.relatedCaseMeasureId),
          relatedTerminationHearingId: normalizeText(input.relatedTerminationHearingId),
          relatedDeadlineId: normalizeText(input.relatedDeadlineId),
          relatedActivityJournalEntryId: input.sourceContextId,
          relatedSbvControlProtocolId: normalizeText(input.relatedSbvControlProtocolId),
          relatedRecruitingParticipationId: normalizeText(input.relatedRecruitingParticipationId),
        };
      case 'recruiting_participation':
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        if (explicitCaseId) {
          throw new Error('Stellenbesetzungs-Verstöße bleiben fallaktenunabhängig. Bitte keinen Fallbezug automatisch setzen.');
        }
        return {
          caseId: null,
          relatedParticipationId: null,
          relatedCaseMeasureId: null,
          relatedTerminationHearingId: null,
          relatedDeadlineId: null,
          relatedActivityJournalEntryId: null,
          relatedSbvControlProtocolId: null,
          relatedRecruitingParticipationId: input.sourceContextId,
        };
      case 'sbv_participation':
        this.ensureContextExists(input.sourceContextType, input.sourceContextId);
        return {
          caseId: explicitCaseId,
          relatedParticipationId: input.sourceContextId,
          relatedCaseMeasureId: null,
          relatedTerminationHearingId: null,
          relatedDeadlineId: null,
          relatedActivityJournalEntryId: null,
          relatedSbvControlProtocolId: null,
          relatedRecruitingParticipationId: null,
        };
      default:
        throw new Error('Bitte zuerst die SBV-Beteiligung oder einen anderen Ausgangskontext auswählen.');
    }
  }

  private normalizeInput(input: CreateSbvParticipationViolationInput | UpdateSbvParticipationViolationInput, existing?: SbvParticipationViolationRecord) {
    const stage = input.stage !== undefined ? oneOf(input.stage, PARTICIPATION_VIOLATION_STAGES) : existing?.stage;
    const status = 'status' in input && input.status !== undefined ? oneOf(input.status, PARTICIPATION_VIOLATION_STATUSES, 'draft') : existing?.status ?? 'draft';
    const violationType = input.violationType !== undefined ? oneOf(input.violationType, PARTICIPATION_VIOLATION_TYPES) : existing?.violationType;
    const sourceContextType = input.sourceContextType !== undefined ? oneOf(input.sourceContextType, PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES) : existing?.sourceContextType;
    const sourceContextId = input.sourceContextId !== undefined ? normalizeText(input.sourceContextId) : existing?.sourceContextId;
    const subject = input.subject !== undefined ? normalizeText(input.subject) : existing?.subject;
    const measureDescription = input.measureDescription !== undefined ? normalizeText(input.measureDescription) : existing?.measureDescription;
    const wrongBehavior = input.wrongBehavior !== undefined ? normalizeText(input.wrongBehavior) : existing?.wrongBehavior;
    const requiredBehavior = input.requiredBehavior !== undefined ? normalizeText(input.requiredBehavior) : existing?.requiredBehavior;
    if (!stage || !violationType || !sourceContextType || !sourceContextId || !subject || !measureDescription || !wrongBehavior || !requiredBehavior) {
      throw new Error('Beteiligungsverstoß benötigt Kontext, Betreff, Maßnahme, Pflichtverstoß und richtiges Verfahren.');
    }
    const relations = this.deriveCaseAndRelations({
      sourceContextType,
      sourceContextId,
      caseId: input.caseId !== undefined ? input.caseId : existing?.caseId ?? null,
      relatedParticipationId: input.relatedParticipationId !== undefined ? input.relatedParticipationId : existing?.relatedParticipationId ?? null,
      relatedCaseMeasureId: input.relatedCaseMeasureId !== undefined ? input.relatedCaseMeasureId : existing?.relatedCaseMeasureId ?? null,
      relatedTerminationHearingId: input.relatedTerminationHearingId !== undefined ? input.relatedTerminationHearingId : existing?.relatedTerminationHearingId ?? null,
      relatedDeadlineId: input.relatedDeadlineId !== undefined ? input.relatedDeadlineId : existing?.relatedDeadlineId ?? null,
      relatedActivityJournalEntryId: input.relatedActivityJournalEntryId !== undefined ? input.relatedActivityJournalEntryId : existing?.relatedActivityJournalEntryId ?? null,
      relatedSbvControlProtocolId: input.relatedSbvControlProtocolId !== undefined ? input.relatedSbvControlProtocolId : existing?.relatedSbvControlProtocolId ?? null,
      relatedRecruitingParticipationId: input.relatedRecruitingParticipationId !== undefined ? input.relatedRecruitingParticipationId : existing?.relatedRecruitingParticipationId ?? null,
    });
    return {
      stage,
      status,
      violationType,
      sourceContextType,
      sourceContextId,
      ...relations,
      subject,
      measureDescription,
      wrongBehavior,
      requiredBehavior,
      consequenceWarning: input.consequenceWarning !== undefined ? normalizeText(input.consequenceWarning) : existing?.consequenceWarning ?? null,
      legalBasis: input.legalBasis !== undefined ? normalizeText(input.legalBasis) ?? DEFAULT_LEGAL_BASIS : existing?.legalBasis ?? DEFAULT_LEGAL_BASIS,
      followUpDueAt: input.followUpDueAt !== undefined ? normalizeIso(input.followUpDueAt) : existing?.followUpDueAt ?? null,
    };
  }

  list(filter: SbvParticipationViolationListFilter = {}): SbvParticipationViolationRecord[] {
    this.audit('read');
    const rows = this.db.prepare<ViolationRow>(`SELECT * FROM sbv_participation_violations ORDER BY updated_at DESC, created_at DESC`).all();
    return rows.map(mapRecord).filter((record) => {
      if (filter.caseId && record.caseId !== filter.caseId) return false;
      if (filter.sourceContextType && record.sourceContextType !== filter.sourceContextType) return false;
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statuses.includes(record.status)) return false;
      }
      if (filter.stage) {
        const stages = Array.isArray(filter.stage) ? filter.stage : [filter.stage];
        if (!stages.includes(record.stage)) return false;
      }
      if (filter.query) {
        const query = filter.query.toLowerCase();
        const haystack = `${record.subject} ${record.measureDescription} ${record.wrongBehavior} ${record.requiredBehavior}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  get(id: string): SbvParticipationViolationRecord | null {
    const row = this.db.prepare<ViolationRow>('SELECT * FROM sbv_participation_violations WHERE id = ?').get(id);
    return row ? mapRecord(row) : null;
  }

  listEvents(violationId: string): SbvParticipationViolationEventRecord[] {
    return this.db.prepare<ViolationEventRow>(`SELECT * FROM sbv_participation_violation_events WHERE violation_id = ? ORDER BY created_at ASC`).all(violationId).map(mapEvent);
  }

  create(input: CreateSbvParticipationViolationInput): SbvParticipationViolationRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    const data = this.normalizeInput(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO sbv_participation_violations (
        id, stage, status, violation_type, source_context_type, source_context_id, case_id,
        related_participation_id, related_case_measure_id, related_termination_hearing_id, related_deadline_id,
        related_activity_journal_entry_id, related_sbv_control_protocol_id, related_recruiting_participation_id,
        subject, measure_description, wrong_behavior, required_behavior, consequence_warning,
        legal_basis, follow_up_due_at, created_at, updated_at, sent_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.stage, data.status, data.violationType, data.sourceContextType, data.sourceContextId, data.caseId,
      data.relatedParticipationId, data.relatedCaseMeasureId, data.relatedTerminationHearingId, data.relatedDeadlineId,
      data.relatedActivityJournalEntryId, data.relatedSbvControlProtocolId, data.relatedRecruitingParticipationId,
      data.subject, data.measureDescription, data.wrongBehavior, data.requiredBehavior, data.consequenceWarning,
      data.legalBasis, data.followUpDueAt, timestamp, timestamp,
      data.status === 'sent' ? timestamp : null,
      ['closed', 'withdrawn'].includes(data.status) ? timestamp : null,
    );
    this.appendEvent(id, 'created', undefined, data.status);
    const record = this.get(id)!;
    this.audit('create', record);
    return record;
  
    });
  }

  update(id: string, input: UpdateSbvParticipationViolationInput): SbvParticipationViolationRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    const existing = this.get(id);
    if (!existing) throw new Error(`Beteiligungsverstoß nicht gefunden: ${id}`);
    if (existing.status === 'closed' || existing.status === 'withdrawn') {
      throw new Error('Terminal geschlossene oder zurückgezogene Vorgänge werden nicht mehr geändert.');
    }
    const data = this.normalizeInput(input, existing);
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE sbv_participation_violations
      SET stage = ?, status = ?, violation_type = ?, source_context_type = ?, source_context_id = ?, case_id = ?,
          related_participation_id = ?, related_case_measure_id = ?, related_termination_hearing_id = ?, related_deadline_id = ?,
          related_activity_journal_entry_id = ?, related_sbv_control_protocol_id = ?, related_recruiting_participation_id = ?, subject = ?,
          measure_description = ?, wrong_behavior = ?, required_behavior = ?, consequence_warning = ?,
          legal_basis = ?, follow_up_due_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.stage, existing.status, data.violationType, data.sourceContextType, data.sourceContextId, data.caseId,
      data.relatedParticipationId, data.relatedCaseMeasureId, data.relatedTerminationHearingId, data.relatedDeadlineId,
      data.relatedActivityJournalEntryId, data.relatedSbvControlProtocolId, data.relatedRecruitingParticipationId, data.subject,
      data.measureDescription, data.wrongBehavior, data.requiredBehavior, data.consequenceWarning,
      data.legalBasis, data.followUpDueAt, timestamp, id,
    );
    this.appendEvent(id, 'updated', existing.status, existing.status);
    const record = this.get(id)!;
    this.audit('update', record);
    return record;
  
    });
  }

  changeStatus(id: string, toStatus: ParticipationViolationStatus, note?: string): SbvParticipationViolationRecord {
    const existing = this.get(id);
    if (!existing) throw new Error(`Beteiligungsverstoß nicht gefunden: ${id}`);
    const nextStatus = oneOf(toStatus, PARTICIPATION_VIOLATION_STATUSES);
    const allowedNextStatuses = PARTICIPATION_VIOLATION_STATUS_TRANSITIONS[existing.status] as readonly ParticipationViolationStatus[];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new Error(`Statuswechsel von ${existing.status} nach ${nextStatus} ist nicht zulässig.`);
    }
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE sbv_participation_violations
      SET status = ?, updated_at = ?, sent_at = CASE WHEN ? = 'sent' AND sent_at IS NULL THEN ? ELSE sent_at END,
          closed_at = CASE WHEN ? IN ('closed','withdrawn') AND closed_at IS NULL THEN ? ELSE closed_at END
      WHERE id = ?
    `).run(nextStatus, timestamp, nextStatus, timestamp, nextStatus, timestamp, id);
    const eventType: ParticipationViolationEventType = nextStatus === 'sent' ? 'marked_sent' : nextStatus === 'remedied' ? 'remedied' : nextStatus === 'escalated' ? 'escalated' : nextStatus === 'closed' ? 'closed' : nextStatus === 'withdrawn' ? 'withdrawn' : 'status_changed';
    this.appendEvent(id, eventType, existing.status, nextStatus, note);
    const record = this.get(id)!;
    this.audit('update', record);
    return record;
  }


  createFollowUp(violationId: string, dueAt?: string): SbvParticipationViolationFollowUpResult {
    const violation = this.get(violationId);
    if (!violation) throw new Error(`Beteiligungsverstoß nicht gefunden: ${violationId}`);
    const followUpDueAt = normalizeIso(dueAt) ?? addDaysIso(new Date(), 7);
    const title = 'Nachholung der SBV-Beteiligung prüfen';
    const deadline = new DeadlineService(this.db).create({
      caseId: violation.caseId,
      processId: violation.id,
      processType: 'sbv_participation_violation',
      deadlineType: 'follow_up',
      title,
      confidentialTitle: title,
      description: 'Prüfen, ob Unterrichtung/Anhörung nachgeholt, der Verstoß geheilt oder die Eskalation fortzuführen ist.',
      dueAt: followUpDueAt,
      legalBasis: '§ 178 Abs. 2 Satz 2 SGB IX',
      sourceEvent: 'sbv_participation_violation.follow_up',
      severity: violation.stage === 'suspension_request' || violation.stage === 'abmahnung' ? 'important' : 'normal',
      calculationMode: 'manual',
      isLegalDeadline: false,
      isUserEditable: true,
    });
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE sbv_participation_violations
      SET related_deadline_id = ?, follow_up_due_at = ?, updated_at = ?
      WHERE id = ?
    `).run(deadline.id, followUpDueAt, timestamp, violation.id);
    this.appendEvent(violation.id, 'deadline_created', violation.status, violation.status, 'Wiedervorlage zur Nachholung der SBV-Beteiligung angelegt.');
    const updated = this.get(violation.id)!;
    this.audit('update', updated);
    return { deadlineId: deadline.id, dueAt: followUpDueAt, title };
  }

  buildJournalPrefill(violationId: string): ActivityJournalPrefill {
    const violation = this.get(violationId);
    if (!violation) throw new Error(`Beteiligungsverstoß nicht gefunden: ${violationId}`);
    const prefill = buildFromContext({
      contextType: violation.caseId ? 'case' : 'fallfrei',
      contextId: violation.caseId,
      caseId: violation.caseId,
      title: 'Beteiligungsverstoß',
      category: 'participation',
    });
    return {
      ...prefill,
      entry: {
        ...prefill.entry,
        title: 'Beteiligungsverstoß: Ergebnis dokumentiert',
        description: 'Nachbereitung eines protokollierten SBV-Beteiligungsverstoßes. Externe Verwendung bleibt eine bewusste SBV-Handlung.',
        resultNote: 'Reaktion des Arbeitgebers, Heilung, Aussetzung oder nächste Eskalation dokumentieren.',
      },
      sourceLabel: violation.caseId ? 'Beteiligungsverstoß mit Fallbezug' : 'fallfreier Beteiligungsverstoß',
      privacyNotice: 'Journal-Vorlage aus Verstoßvorgang. Es wurde noch kein Journaleintrag gespeichert.',
      preferenceContextType: violation.caseId ? 'case' : 'fallfrei',
    };
  }

  delete(id: string): { deleted: boolean } {
    const existing = this.get(id);
    const documentRows = this.db.prepare<{ document_id: string }>('SELECT document_id FROM sbv_participation_violation_documents WHERE violation_id = ?').all(id);
    const result = this.db.prepare('DELETE FROM sbv_participation_violations WHERE id = ?').run(id) as RunResult;
    const deleted = Number(result?.changes ?? 0) > 0;
    if (deleted) {
      for (const row of documentRows) {
        this.db.prepare('DELETE FROM generated_documents WHERE id = ? AND document_kind = ?').run(row.document_id, 'sbv_participation_violation');
      }
    }
    if (existing) this.audit('delete', existing);
    return { deleted };
  }
}
