import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DeadlineService } from './deadlineService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type {
  CreateParticipationInput,
  ParticipationDashboardSummary,
  ParticipationRecord,
  ParticipationStatus,
  ParticipationWarning,
  UpdateParticipationInput
} from '../src/app/core/models/participation.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toBool(value: unknown): boolean {
  return Boolean(value);
}

function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function mapRecord(row: any): ParticipationRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    measureType: row.measure_type,
    status: row.status,
    riskLevel: row.risk_level,
    personStatus: row.person_status,
    decisionStage: row.decision_stage,
    firstKnownAt: row.first_known_at ?? undefined,
    informationReceivedAt: row.information_received_at ?? undefined,
    hearingRequestedAt: row.hearing_requested_at ?? undefined,
    statementDueAt: row.statement_due_at ?? undefined,
    statementSubmittedAt: row.statement_submitted_at ?? undefined,
    employerDecisionAt: row.employer_decision_at ?? undefined,
    implementationAt: row.implementation_at ?? undefined,
    informationComplete: toBool(row.information_complete),
    hearingBeforeDecision: toBool(row.hearing_before_decision),
    decisionNotified: toBool(row.decision_notified),
    suspensionRequestedAt: row.suspension_requested_at ?? undefined,
    suspensionDueAt: row.suspension_due_at ?? undefined,
    violationSummary: row.violation_summary ?? undefined,
    sbvPosition: row.sbv_position ?? undefined,
    nextStep: row.next_step ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function evaluateParticipationWarnings(record: ParticipationRecord): ParticipationWarning[] {
  const warnings: ParticipationWarning[] = [];

  if (!record.informationComplete) {
    warnings.push({
      level: record.riskLevel === 'kritisch' ? 'critical' : 'warning',
      message: 'Die Unterrichtung ist noch nicht als vollständig dokumentiert. § 178 Abs. 2 Satz 1 SGB IX verlangt rechtzeitige und umfassende Unterrichtung.'
    });
  }

  if (record.decisionStage === 'entscheidung_getroffen' || record.decisionStage === 'umgesetzt') {
    if (!record.hearingBeforeDecision) {
      warnings.push({
        level: 'critical',
        message: 'Die Anhörung vor der Entscheidung ist nicht dokumentiert. Aussetzungsverlangen nach § 178 Abs. 2 Satz 2 SGB IX prüfen.'
      });
    }
  }

  if (!record.decisionNotified && (record.decisionStage === 'entscheidung_getroffen' || record.decisionStage === 'umgesetzt')) {
    warnings.push({
      level: 'warning',
      message: 'Die Mitteilung der Arbeitgeberentscheidung an die SBV ist noch nicht dokumentiert.'
    });
  }

  if (record.statementDueAt && !record.statementSubmittedAt && new Date(record.statementDueAt) < new Date()) {
    warnings.push({ level: 'critical', message: 'Die dokumentierte Stellungnahmefrist ist abgelaufen.' });
  }

  if (record.suspensionDueAt && record.status === 'aussetzung_verlangt' && new Date(record.suspensionDueAt) < new Date()) {
    warnings.push({ level: 'critical', message: 'Die Nachholfrist nach Aussetzungsverlangen ist überschritten.' });
  }

  if (record.status === 'pflichtverstoss_dokumentiert' && !record.violationSummary) {
    warnings.push({ level: 'warning', message: 'Pflichtverstoß ist markiert, aber noch nicht begründet dokumentiert.' });
  }

  return warnings;
}

export class ParticipationService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sbv_participations (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        title TEXT NOT NULL,
        measure_type TEXT NOT NULL DEFAULT 'sonstiges',
        status TEXT NOT NULL DEFAULT 'neu',
        risk_level TEXT NOT NULL DEFAULT 'normal',
        person_status TEXT NOT NULL DEFAULT 'unklar',
        decision_stage TEXT NOT NULL DEFAULT 'unklar',
        first_known_at TEXT,
        information_received_at TEXT,
        hearing_requested_at TEXT,
        statement_due_at TEXT,
        statement_submitted_at TEXT,
        employer_decision_at TEXT,
        implementation_at TEXT,
        information_complete INTEGER NOT NULL DEFAULT 0,
        hearing_before_decision INTEGER NOT NULL DEFAULT 0,
        decision_notified INTEGER NOT NULL DEFAULT 0,
        suspension_requested_at TEXT,
        suspension_due_at TEXT,
        violation_summary TEXT,
        sbv_position TEXT,
        next_step TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sbv_participation_events (
        id TEXT PRIMARY KEY,
        participation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(participation_id) REFERENCES sbv_participations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_case_id ON sbv_participations(case_id);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_status ON sbv_participations(status);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_risk ON sbv_participations(risk_level);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_statement_due ON sbv_participations(statement_due_at);
      CREATE INDEX IF NOT EXISTS idx_sbv_participations_suspension_due ON sbv_participations(suspension_due_at);
    `);
    new PersonalDataAuditLogService(this.db);
  }

  private audit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'sbv_participation', subjectId, caseId, purpose });
    } catch (error) {
      console.warn('Gremia.SBV participation audit write failed', error);
    }
  }

  list(caseId?: string): ParticipationRecord[] {
    this.audit('read', undefined, caseId, 'SBV-Beteiligungsmonitor Liste anzeigen');
    const rows = caseId
      ? this.db.prepare<any>('SELECT * FROM sbv_participations WHERE case_id = ? ORDER BY COALESCE(statement_due_at, suspension_due_at, updated_at) DESC').all(caseId)
      : this.db.prepare<any>('SELECT * FROM sbv_participations ORDER BY COALESCE(statement_due_at, suspension_due_at, updated_at) DESC').all();
    return rows.map(mapRecord);
  }

  dashboardSummary(): ParticipationDashboardSummary {
    const rows = this.list();
    return {
      open: rows.filter((row) => !['abgeschlossen', 'pflichtverstoss_dokumentiert'].includes(row.status)).length,
      critical: rows.filter((row) => row.riskLevel === 'kritisch').length,
      suspensionOpen: rows.filter((row) => row.status === 'aussetzung_verlangt').length,
      violations: rows.filter((row) => row.status === 'pflichtverstoss_dokumentiert' || evaluateParticipationWarnings(row).some((warning) => warning.level === 'critical')).length
    };
  }

  getById(id: string): ParticipationRecord | undefined {
    this.audit('read', id, undefined, 'SBV-Beteiligungsmonitor Detail anzeigen');
    const row = this.db.prepare<any>('SELECT * FROM sbv_participations WHERE id = ?').get(id);
    return row ? mapRecord(row) : undefined;
  }

  create(input: CreateParticipationInput): ParticipationRecord {
    if (!input.caseId) throw new Error('Eine Beteiligungsprüfung muss einer Fallakte zugeordnet sein.');
    if (!input.title?.trim()) throw new Error('Eine Beteiligungsprüfung benötigt einen Titel.');

    const id = randomUUID();
    const timestamp = nowIso();
    const status: ParticipationStatus = input.informationReceivedAt ? 'unterrichtung_pruefen' : 'neu';
    const suspensionDueAt = null;

    this.db.prepare(`
      INSERT INTO sbv_participations (
        id, case_id, title, measure_type, status, risk_level, person_status, decision_stage,
        first_known_at, information_received_at, hearing_requested_at, statement_due_at,
        information_complete, hearing_before_decision, decision_notified,
        suspension_due_at, violation_summary, sbv_position, next_step, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId,
      input.title.trim(),
      input.measureType ?? 'sonstiges',
      status,
      input.riskLevel ?? 'normal',
      input.personStatus ?? 'unklar',
      input.decisionStage ?? 'unklar',
      toIso(input.firstKnownAt),
      toIso(input.informationReceivedAt),
      toIso(input.hearingRequestedAt),
      toIso(input.statementDueAt),
      input.informationComplete ? 1 : 0,
      input.hearingBeforeDecision ? 1 : 0,
      input.decisionNotified ? 1 : 0,
      suspensionDueAt,
      input.violationSummary ?? null,
      input.sbvPosition ?? null,
      input.nextStep ?? null,
      timestamp,
      timestamp
    );

    this.event(id, 'created', 'SBV-Beteiligungsprüfung angelegt', input.title);

    if (input.createDefaultDeadlines !== false && input.statementDueAt) {
      new DeadlineService(this.db).create({
        caseId: input.caseId,
        processId: id,
        processType: 'custom',
        deadlineType: 'workflow_step',
        title: 'SBV-Stellungnahmefrist prüfen',
        confidentialTitle: `SBV-Beteiligung: ${input.title.trim()}`,
        description: 'Automatische Wiedervorlage aus dem SBV-Beteiligungsmonitor.',
        dueAt: new Date(input.statementDueAt).toISOString(),
        legalBasis: '§ 178 Abs. 2 Satz 1 SGB IX',
        sourceEvent: 'sbv_participation_created',
        severity: input.riskLevel === 'kritisch' ? 'critical' : 'important',
        calculationMode: 'workflow',
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24
      });
    }

    this.audit('create', id, input.caseId, 'SBV-Beteiligungsprüfung angelegt');
    return this.getById(id)!;
  }

  update(id: string, input: UpdateParticipationInput): ParticipationRecord {
    const existing = this.getById(id);
    if (!existing) throw new Error(`SBV-Beteiligungsprüfung nicht gefunden: ${id}`);

    const suspensionRequestedAt = input.suspensionRequestedAt !== undefined ? input.suspensionRequestedAt : existing.suspensionRequestedAt;
    const suspensionDueAt = input.suspensionDueAt !== undefined
      ? input.suspensionDueAt
      : (!existing.suspensionDueAt && suspensionRequestedAt ? addDaysIso(new Date(suspensionRequestedAt).toISOString(), 7) : existing.suspensionDueAt);

    const nextStatus = input.status ?? (input.suspensionRequestedAt ? 'aussetzung_verlangt' : existing.status);

    this.db.prepare(`
      UPDATE sbv_participations
      SET title = ?, measure_type = ?, status = ?, risk_level = ?, person_status = ?, decision_stage = ?,
          first_known_at = ?, information_received_at = ?, hearing_requested_at = ?, statement_due_at = ?,
          statement_submitted_at = ?, employer_decision_at = ?, implementation_at = ?,
          information_complete = ?, hearing_before_decision = ?, decision_notified = ?,
          suspension_requested_at = ?, suspension_due_at = ?, violation_summary = ?, sbv_position = ?, next_step = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.title !== undefined ? input.title.trim() : existing.title,
      input.measureType ?? existing.measureType,
      nextStatus,
      input.riskLevel ?? existing.riskLevel,
      input.personStatus ?? existing.personStatus,
      input.decisionStage ?? existing.decisionStage,
      input.firstKnownAt !== undefined ? toIso(input.firstKnownAt) : existing.firstKnownAt ?? null,
      input.informationReceivedAt !== undefined ? toIso(input.informationReceivedAt) : existing.informationReceivedAt ?? null,
      input.hearingRequestedAt !== undefined ? toIso(input.hearingRequestedAt) : existing.hearingRequestedAt ?? null,
      input.statementDueAt !== undefined ? toIso(input.statementDueAt) : existing.statementDueAt ?? null,
      input.statementSubmittedAt !== undefined ? toIso(input.statementSubmittedAt) : existing.statementSubmittedAt ?? null,
      input.employerDecisionAt !== undefined ? toIso(input.employerDecisionAt) : existing.employerDecisionAt ?? null,
      input.implementationAt !== undefined ? toIso(input.implementationAt) : existing.implementationAt ?? null,
      input.informationComplete !== undefined ? (input.informationComplete ? 1 : 0) : (existing.informationComplete ? 1 : 0),
      input.hearingBeforeDecision !== undefined ? (input.hearingBeforeDecision ? 1 : 0) : (existing.hearingBeforeDecision ? 1 : 0),
      input.decisionNotified !== undefined ? (input.decisionNotified ? 1 : 0) : (existing.decisionNotified ? 1 : 0),
      suspensionRequestedAt ? new Date(suspensionRequestedAt).toISOString() : null,
      suspensionDueAt ? new Date(suspensionDueAt).toISOString() : null,
      input.violationSummary !== undefined ? input.violationSummary : existing.violationSummary ?? null,
      input.sbvPosition !== undefined ? input.sbvPosition : existing.sbvPosition ?? null,
      input.nextStep !== undefined ? input.nextStep : existing.nextStep ?? null,
      nowIso(),
      id
    );

    if (input.suspensionRequestedAt && suspensionDueAt) {
      new DeadlineService(this.db).create({
        caseId: existing.caseId,
        processId: id,
        processType: 'custom',
        deadlineType: 'workflow_step',
        title: 'Nachholung SBV-Beteiligung nachhalten',
        confidentialTitle: `Aussetzungsverlangen: ${existing.title}`,
        description: 'Wiedervorlage aus dem SBV-Beteiligungsmonitor nach Aussetzungsverlangen.',
        dueAt: suspensionDueAt,
        legalBasis: '§ 178 Abs. 2 Satz 2 SGB IX',
        sourceEvent: 'sbv_participation_suspension_requested',
        severity: 'critical',
        calculationMode: 'workflow',
        isLegalDeadline: false,
        warningThresholdHours: 48,
        criticalThresholdHours: 24
      });
    }

    this.event(id, 'updated', 'SBV-Beteiligungsprüfung aktualisiert', JSON.stringify(input));
    this.audit('update', id, existing.caseId, 'SBV-Beteiligungsprüfung geändert');
    return this.getById(id)!;
  }

  warnings(id: string): ParticipationWarning[] {
    const record = this.getById(id);
    return record ? evaluateParticipationWarnings(record) : [];
  }

  private event(participationId: string, eventType: string, title: string, description?: string): void {
    this.db.prepare('INSERT INTO sbv_participation_events (id, participation_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), participationId, eventType, title, description ?? null, nowIso());
  }
}
