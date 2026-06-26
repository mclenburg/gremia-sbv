import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { DeadlineService } from './deadlineService.js';
import { buildFromContext } from './activityJournalPrefill.js';
import {
  PARTICIPATION_VIOLATION_SOURCE_CONTEXT_TYPES,
  PARTICIPATION_VIOLATION_STAGES,
  PARTICIPATION_VIOLATION_STATUSES,
  PARTICIPATION_VIOLATION_STATUS_TRANSITIONS,
  PARTICIPATION_VIOLATION_TYPES,
  type CreateSbvParticipationViolationInput,
  type ParticipationViolationEventType,
  type ParticipationViolationSourceContextType,
  type ParticipationViolationStage,
  type ParticipationViolationStatus,
  type ParticipationViolationType,
  type SbvParticipationViolationEventRecord,
  type SbvParticipationViolationListFilter,
  type SbvParticipationViolationRecord,
  type SbvParticipationViolationFollowUpResult,
  type UpdateSbvParticipationViolationInput,
} from '../src/app/core/models/sbv-participation-violation.model.js';
import type { ActivityJournalPrefill } from '../src/app/core/models/activity-journal.model.js';

const DEFAULT_LEGAL_BASIS = '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX';

type ViolationRow = {
  id: string;
  stage: ParticipationViolationStage;
  status: ParticipationViolationStatus;
  violation_type: ParticipationViolationType;
  source_context_type: ParticipationViolationSourceContextType;
  source_context_id: string;
  case_id: string | null;
  related_participation_id: string | null;
  related_case_measure_id: string | null;
  related_termination_hearing_id: string | null;
  related_deadline_id: string | null;
  related_activity_journal_entry_id: string | null;
  related_sbv_control_protocol_id: string | null;
  subject: string;
  measure_description: string;
  wrong_behavior: string;
  required_behavior: string;
  consequence_warning: string | null;
  legal_basis: string | null;
  follow_up_due_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  closed_at: string | null;
};

type ViolationEventRow = {
  id: string;
  violation_id: string;
  event_type: ParticipationViolationEventType;
  from_status: ParticipationViolationStatus | null;
  to_status: ParticipationViolationStatus | null;
  note: string | null;
  created_at: string;
};

type RunResult = { changes?: number } | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}



function addDaysIso(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString();
}

function normalizeIso(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const valueWithTime = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T09:00:00.000Z` : text;
  const parsed = new Date(valueWithTime);
  if (Number.isNaN(parsed.getTime())) throw new Error('Datum oder Wiedervorlage ist ungültig.');
  return parsed.toISOString();
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback?: T[number]): T[number] {
  if ((allowed as readonly unknown[]).includes(value)) return value as T[number];
  if (fallback) return fallback;
  throw new Error(`Ungültiger Wert: ${String(value)}`);
}

function mapRecord(row: ViolationRow): SbvParticipationViolationRecord {
  return {
    id: String(row.id),
    stage: row.stage as ParticipationViolationStage,
    status: row.status as ParticipationViolationStatus,
    violationType: row.violation_type as ParticipationViolationType,
    sourceContextType: row.source_context_type as ParticipationViolationSourceContextType,
    sourceContextId: String(row.source_context_id),
    caseId: row.case_id ? String(row.case_id) : undefined,
    relatedParticipationId: row.related_participation_id ? String(row.related_participation_id) : undefined,
    relatedCaseMeasureId: row.related_case_measure_id ? String(row.related_case_measure_id) : undefined,
    relatedTerminationHearingId: row.related_termination_hearing_id ? String(row.related_termination_hearing_id) : undefined,
    relatedDeadlineId: row.related_deadline_id ? String(row.related_deadline_id) : undefined,
    relatedActivityJournalEntryId: row.related_activity_journal_entry_id ? String(row.related_activity_journal_entry_id) : undefined,
    relatedSbvControlProtocolId: row.related_sbv_control_protocol_id ? String(row.related_sbv_control_protocol_id) : undefined,
    subject: String(row.subject),
    measureDescription: String(row.measure_description),
    wrongBehavior: String(row.wrong_behavior),
    requiredBehavior: String(row.required_behavior),
    consequenceWarning: row.consequence_warning ? String(row.consequence_warning) : undefined,
    legalBasis: String(row.legal_basis ?? DEFAULT_LEGAL_BASIS),
    followUpDueAt: row.follow_up_due_at ? String(row.follow_up_due_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
  };
}

function mapEvent(row: ViolationEventRow): SbvParticipationViolationEventRecord {
  return {
    id: String(row.id),
    violationId: String(row.violation_id),
    eventType: row.event_type as ParticipationViolationEventType,
    fromStatus: row.from_status as ParticipationViolationStatus | undefined,
    toStatus: row.to_status as ParticipationViolationStatus | undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at),
  };
}

export class SbvParticipationViolationService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participation_violations (
        id TEXT PRIMARY KEY,
        stage TEXT NOT NULL CHECK (stage IN ('request','formal_objection','abmahnung','suspension_request','owi_preparation')),
        status TEXT NOT NULL CHECK (status IN ('draft','open','sent','remedied','escalated','closed','withdrawn')),
        violation_type TEXT NOT NULL CHECK (violation_type IN ('not_informed','late_informed','incomplete_information','not_heard','late_heard','implementation_without_participation','repeated_violation','other')),
        source_context_type TEXT NOT NULL CHECK (source_context_type IN ('case','case_measure_participation','sbv_participation','termination_hearing','sbv_control_protocol','deadline','activity_journal')),
        source_context_id TEXT NOT NULL,
        case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
        related_participation_id TEXT REFERENCES sbv_participations(id) ON DELETE SET NULL,
        related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL,
        related_termination_hearing_id TEXT REFERENCES termination_hearings(id) ON DELETE SET NULL,
        related_deadline_id TEXT REFERENCES deadlines(id) ON DELETE SET NULL,
        related_activity_journal_entry_id TEXT REFERENCES activity_journal_entries(id) ON DELETE SET NULL,
        related_sbv_control_protocol_id TEXT REFERENCES sbv_control_protocols(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        measure_description TEXT NOT NULL,
        wrong_behavior TEXT NOT NULL,
        required_behavior TEXT NOT NULL,
        consequence_warning TEXT,
        legal_basis TEXT NOT NULL DEFAULT '${DEFAULT_LEGAL_BASIS}',
        follow_up_due_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sent_at TEXT,
        closed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_status ON sbv_participation_violations(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_stage ON sbv_participation_violations(stage);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_source ON sbv_participation_violations(source_context_type, source_context_id);
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violations_case ON sbv_participation_violations(case_id);
      CREATE TABLE IF NOT EXISTS sbv_participation_violation_events (
        id TEXT PRIMARY KEY,
        violation_id TEXT NOT NULL REFERENCES sbv_participation_violations(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','status_changed','document_generated','marked_sent','deadline_created','deadline_closed','remedied','escalated','closed','withdrawn')),
        from_status TEXT,
        to_status TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participation_violation_events_violation ON sbv_participation_violation_events(violation_id, created_at);
    `);
    this.ensureRelatedCaseMeasureColumn();
    new PersonalDataAuditLogService(this.db);
  }

  private ensureRelatedCaseMeasureColumn(): void {
    try {
      const columns = this.db.prepare<{ name: string }>('PRAGMA table_info(sbv_participation_violations)').all().map((row) => row.name);
      if (!columns.includes('related_case_measure_id')) {
        this.db.exec('ALTER TABLE sbv_participation_violations ADD COLUMN related_case_measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL;');
      }
    } catch (error) {
      console.warn('Gremia.SBV participation violation schema compatibility check failed', error);
    }
  }

  private audit(action: 'read' | 'create' | 'update' | 'delete', record?: SbvParticipationViolationRecord): void {
    try {
      new PersonalDataAuditLogService(this.db).append({
        actor: 'sbv',
        action,
        subjectType: 'sbv_participation_violation',
        subjectId: record?.id,
        caseId: record?.caseId,
        purpose: 'SBV-Beteiligungsverstoß-Protokollierung',
        metadata: record ? {
          stage: record.stage,
          status: record.status,
          violationType: record.violationType,
          sourceContextType: record.sourceContextType,
          hasFollowUp: Boolean(record.followUpDueAt),
        } : undefined,
      });
    } catch (error) {
      console.warn('Gremia.SBV participation violation audit write failed', error);
    }
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
    const data = this.normalizeInput(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO sbv_participation_violations (
        id, stage, status, violation_type, source_context_type, source_context_id, case_id,
        related_participation_id, related_case_measure_id, related_termination_hearing_id, related_deadline_id,
        related_activity_journal_entry_id, related_sbv_control_protocol_id,
        subject, measure_description, wrong_behavior, required_behavior, consequence_warning,
        legal_basis, follow_up_due_at, created_at, updated_at, sent_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.stage, data.status, data.violationType, data.sourceContextType, data.sourceContextId, data.caseId,
      data.relatedParticipationId, data.relatedCaseMeasureId, data.relatedTerminationHearingId, data.relatedDeadlineId,
      data.relatedActivityJournalEntryId, data.relatedSbvControlProtocolId,
      data.subject, data.measureDescription, data.wrongBehavior, data.requiredBehavior, data.consequenceWarning,
      data.legalBasis, data.followUpDueAt, timestamp, timestamp,
      data.status === 'sent' ? timestamp : null,
      ['closed', 'withdrawn'].includes(data.status) ? timestamp : null,
    );
    this.appendEvent(id, 'created', undefined, data.status);
    const record = this.get(id)!;
    this.audit('create', record);
    return record;
  }

  update(id: string, input: UpdateSbvParticipationViolationInput): SbvParticipationViolationRecord {
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
          related_activity_journal_entry_id = ?, related_sbv_control_protocol_id = ?, subject = ?,
          measure_description = ?, wrong_behavior = ?, required_behavior = ?, consequence_warning = ?,
          legal_basis = ?, follow_up_due_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.stage, existing.status, data.violationType, data.sourceContextType, data.sourceContextId, data.caseId,
      data.relatedParticipationId, data.relatedCaseMeasureId, data.relatedTerminationHearingId, data.relatedDeadlineId,
      data.relatedActivityJournalEntryId, data.relatedSbvControlProtocolId, data.subject,
      data.measureDescription, data.wrongBehavior, data.requiredBehavior, data.consequenceWarning,
      data.legalBasis, data.followUpDueAt, timestamp, id,
    );
    this.appendEvent(id, 'updated', existing.status, existing.status);
    const record = this.get(id)!;
    this.audit('update', record);
    return record;
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
