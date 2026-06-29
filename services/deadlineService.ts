import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type {
  CreateDeadlineInput,
  CreateFromTemplateInput,
  DeadlineAuditRecord,
  DeadlineDashboardItem,
  DeadlineDashboardState,
  DeadlineListFilters,
  DeadlineRecord,
  DeadlineStatus,
  DeadlineTemplateRecord,
  UpdateDeadlineInput
} from '../src/app/core/models/deadline.model.js';

const DASHBOARD_HOURS_BEFORE_DUE = 48;

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(date: Date): string {
  return date.toISOString();
}

function addOffset(baseIso: string, days: number, hours: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid base date: ${baseIso}`);
  base.setUTCDate(base.getUTCDate() + days);
  base.setUTCHours(base.getUTCHours() + hours);
  return toIso(base);
}

function subtractHours(baseIso: string, hours: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid date: ${baseIso}`);
  base.setUTCHours(base.getUTCHours() - hours);
  return toIso(base);
}

function bool(value: unknown): boolean {
  return Boolean(value);
}

function mapDeadline(row: any): DeadlineRecord {
  const warningThresholdHours = Number(row.warning_threshold_hours ?? DASHBOARD_HOURS_BEFORE_DUE);
  const dueAt = row.due_at;
  return {
    id: row.id,
    caseId: row.case_id ?? undefined,
    measureId: row.measure_id ?? undefined,
    personId: row.person_id ?? undefined,
    processId: row.process_id ?? undefined,
    processType: row.process_type ?? 'case',
    deadlineType: row.deadline_type ?? 'follow_up',
    title: row.title,
    confidentialTitle: row.confidential_title ?? undefined,
    description: row.description ?? row.notes ?? undefined,
    dueAt,
    reminderAt: row.reminder_at ?? undefined,
    legalBasis: row.legal_basis ?? undefined,
    sourceEvent: row.source_event ?? undefined,
    severity: row.severity ?? 'normal',
    status: row.status ?? 'open',
    calculationMode: row.calculation_mode ?? 'manual',
    isLegalDeadline: bool(row.is_legal_deadline),
    isUserEditable: row.is_user_editable === undefined ? true : bool(row.is_user_editable),
    warningThresholdHours,
    criticalThresholdHours: Number(row.critical_threshold_hours ?? 24),
    dashboardFromAt: row.dashboard_from_at ?? subtractHours(dueAt, warningThresholdHours),
    completedAt: row.completed_at ?? undefined,
    completedNote: row.completed_note ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledReason: row.cancelled_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTemplate(row: any): DeadlineTemplateRecord {
  return {
    id: row.id,
    templateKey: row.template_key,
    title: row.title,
    confidentialTitle: row.confidential_title ?? undefined,
    description: row.description ?? undefined,
    processType: row.process_type,
    deadlineType: row.deadline_type,
    offsetDays: Number(row.offset_days ?? 0),
    offsetHours: Number(row.offset_hours ?? 0),
    reminderDaysBefore: row.reminder_days_before ?? undefined,
    legalBasis: row.legal_basis ?? undefined,
    severity: row.severity,
    isLegalDeadline: bool(row.is_legal_deadline),
    warningThresholdHours: Number(row.warning_threshold_hours ?? DASHBOARD_HOURS_BEFORE_DUE),
    criticalThresholdHours: Number(row.critical_threshold_hours ?? 24),
    enabled: bool(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAudit(row: any): DeadlineAuditRecord {
  return {
    id: row.id,
    deadlineId: row.deadline_id,
    action: row.action,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    reason: row.reason ?? undefined,
    createdAt: row.created_at
  };
}

function normalizeStatus(status: string | undefined): DeadlineStatus {
  if (status === 'erledigt') return 'done';
  if (status === 'ueberfaellig') return 'overdue';
  if (status === 'offen') return 'open';
  return (status ?? 'open') as DeadlineStatus;
}

export function getHoursRemaining(dueAt: string, referenceDate = new Date()): number {
  return (new Date(dueAt).getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
}

export function getDashboardState(deadline: DeadlineRecord, referenceDate = new Date()): DeadlineDashboardState {
  const status = normalizeStatus(deadline.status);
  if (status === 'done' || status === 'cancelled' || status === 'suspended') return 'hidden';

  const hoursRemaining = getHoursRemaining(deadline.dueAt, referenceDate);
  if (hoursRemaining < 0 || status === 'overdue') return 'overdue';
  if (hoursRemaining <= deadline.criticalThresholdHours) return 'critical';

  // Harte Produktregel: Das Dashboard zeigt nur Fristen, die überschritten sind
  // oder innerhalb der nächsten 48 Stunden fällig werden. Frühere Wiedervorlagen
  // bleiben in der Fristenliste, aber nicht auf der Arbeitsübersicht.
  if (hoursRemaining <= DASHBOARD_HOURS_BEFORE_DUE) return 'due_soon';

  return 'hidden';
}

export function getActionHint(deadline: DeadlineRecord): string {
  if (deadline.processType === 'termination_hearing') return 'Kündigungsvorgang sofort prüfen: Unterlagen, Integrationsamt, SBV-Stellungnahme.';
  if (deadline.processType === 'bem') return 'BEM-Schritt prüfen: Freiwilligkeit, Datenschutz, nächste Maßnahme dokumentieren.';
  if (deadline.processType === 'prevention') return 'Präventionsverfahren prüfen: Arbeitgeberreaktion und Einschaltung Inklusionsamt nachhalten.';
  if (deadline.processType === 'equalization') return 'Gleichstellungsverfahren prüfen: Nachweise, Sachstand und ggf. Widerspruchsfrist klären.';
  if (deadline.processType === 'gdb') return 'Bescheid/Zugang/Rechtsbehelfsbelehrung prüfen; ggf. Beratung oder Rechtsvertretung empfehlen.';
  if (deadline.processType === 'sbv_control_protocol') return 'Übergreifendes Steuerungsprotokoll prüfen: Arbeitgeber-/BR-Rückmeldung, Ergebnis und nächsten Schritt dokumentieren.';
  if (deadline.processType === 'activity_journal') return 'Journal-Wiedervorlage prüfen: Ergebnis, Nachfassung oder Abschluss bewusst dokumentieren.';
  if (deadline.processType === 'sbv_participation_violation') return 'Beteiligungsverstoß prüfen: Nachholung, Reaktion oder Eskalation bewusst dokumentieren.';
  if (deadline.processType === 'recruiting_participation') return 'Stellenbesetzung prüfen: Unterlagen, Gesprächsnachhaltung oder Anhörung vor Auswahlentscheidung kontrollieren.';
  if (deadline.sourceEvent === 'protected_person.status_expiry_warning' || deadline.sourceEvent === 'protected_person.status_expired_privacy_review') {
    return 'Statusnachweis im Personenverzeichnis prüfen: Status aktualisieren, Fortspeicherung begründen oder Datenschutzprüfung starten.';
  }
  return 'Nächsten Schritt im Fall prüfen und dokumentieren.';
}


function validateCaseBinding(input: CreateDeadlineInput): void {
  const deadlineType = input.deadlineType ?? 'follow_up';
  const isFreeFollowUp = input.processType === 'custom' && ['follow_up', 'warning'].includes(deadlineType) && !input.isLegalDeadline;
  const isSbvControlProtocolFollowUp = input.processType === 'sbv_control_protocol'
    && deadlineType === 'follow_up'
    && !input.isLegalDeadline
    && Boolean(input.processId);
  const isActivityJournalFollowUp = input.processType === 'activity_journal'
    && deadlineType === 'follow_up'
    && !input.isLegalDeadline
    && Boolean(input.processId);
  const isParticipationViolationFollowUp = input.processType === 'sbv_participation_violation'
    && deadlineType === 'follow_up'
    && !input.isLegalDeadline
    && Boolean(input.processId);
  const isRecruitingParticipationFollowUp = input.processType === 'recruiting_participation'
    && deadlineType === 'follow_up'
    && !input.isLegalDeadline
    && Boolean(input.processId);

  if (!input.caseId && !isFreeFollowUp && !isSbvControlProtocolFollowUp && !isActivityJournalFollowUp && !isParticipationViolationFollowUp && !isRecruitingParticipationFollowUp) {
    throw new Error('Fristen müssen einem Fall zugeordnet werden. Ohne Fallbezug ist nur eine freie Wiedervorlage, eine SBV-Steuerungsprotokoll-Wiedervorlage, eine Journal-Wiedervorlage, eine Beteiligungsverstoß-Wiedervorlage oder eine Stellenbesetzungs-Wiedervorlage erlaubt.');
  }

  if (!input.caseId && (input.isLegalDeadline || deadlineType === 'legal_deadline' || deadlineType === 'workflow_step')) {
    throw new Error('Rechtliche Fristen und Workflow-Schritte dürfen nicht ohne Fallbezug angelegt werden.');
  }
}

export class DeadlineService {
  constructor(private readonly db: DatabaseAdapter) {
    new PersonalDataAuditLogService(this.db);
  }

  private personalDataAudit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string, metadata?: Record<string, unknown>): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'deadline', subjectId, caseId, purpose, metadata });
    } catch (error) {
      console.warn('Gremia.SBV audit log write failed', error);
    }
  }

  create(input: CreateDeadlineInput): DeadlineRecord {
    validateCaseBinding(input);
    const id = randomUUID();
    const timestamp = nowIso();
    const warningThresholdHours = input.warningThresholdHours ?? DASHBOARD_HOURS_BEFORE_DUE;
    const criticalThresholdHours = input.criticalThresholdHours ?? 24;
    const dueAt = new Date(input.dueAt).toISOString();
    const dashboardFromAt = dueAt.startsWith('9999-') ? timestamp : subtractHours(dueAt, DASHBOARD_HOURS_BEFORE_DUE);

    this.db.prepare(`
      INSERT INTO deadlines (
        id, case_id, measure_id, person_id, process_id, process_type, deadline_type,
        title, confidential_title, description, due_at, reminder_at, legal_basis, source_event,
        severity, status, calculation_mode, is_legal_deadline, is_user_editable,
        warning_threshold_hours, critical_threshold_hours, dashboard_from_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.caseId ?? null,
      input.measureId ?? null,
      input.personId ?? null,
      input.processId ?? null,
      input.processType,
      input.deadlineType ?? 'follow_up',
      input.title,
      input.confidentialTitle ?? null,
      input.description ?? null,
      dueAt,
      input.reminderAt ?? null,
      input.legalBasis ?? null,
      input.sourceEvent ?? null,
      input.severity ?? 'normal',
      input.calculationMode ?? 'manual',
      input.isLegalDeadline ? 1 : 0,
      input.isUserEditable === false ? 0 : 1,
      warningThresholdHours,
      criticalThresholdHours,
      dashboardFromAt,
      timestamp,
      timestamp
    );

    this.audit(id, 'created', undefined, JSON.stringify(input), 'Frist angelegt');
    const auditPurpose = input.caseId ? 'Frist personenbezogen angelegt' : 'Fallaktenunabhängige Wiedervorlage angelegt';
    this.personalDataAudit('create', id, input.caseId, auditPurpose, { processType: input.processType, deadlineType: input.deadlineType ?? 'follow_up', measureId: input.measureId ?? null, isLegalDeadline: Boolean(input.isLegalDeadline) });
    return this.getById(id)!;
  }

  createFromTemplate(input: CreateFromTemplateInput): DeadlineRecord {
    const template = this.getTemplateByKey(input.templateKey);
    if (!template) throw new Error(`Deadline template not found: ${input.templateKey}`);
    if (!template.enabled) throw new Error(`Deadline template disabled: ${input.templateKey}`);

    const calculatedDueAt = input.overrideDueAt ?? addOffset(input.baseDate, template.offsetDays, template.offsetHours);
    const reminderAt = template.reminderDaysBefore === undefined
      ? undefined
      : addOffset(calculatedDueAt, -template.reminderDaysBefore, 0);

    return this.create({
      caseId: input.caseId,
      measureId: input.measureId,
      personId: input.personId,
      processId: input.processId,
      processType: template.processType,
      deadlineType: template.deadlineType,
      title: input.overrideTitle ?? template.title,
      confidentialTitle: template.confidentialTitle,
      description: template.description,
      dueAt: calculatedDueAt,
      reminderAt,
      legalBasis: template.legalBasis,
      sourceEvent: input.sourceEvent ?? template.templateKey,
      severity: template.severity,
      calculationMode: 'template',
      isLegalDeadline: template.isLegalDeadline,
      warningThresholdHours: template.warningThresholdHours,
      criticalThresholdHours: template.criticalThresholdHours
    });
  }

  createTerminationHearingWorkflow(caseId: string, hearingReceivedAt: string, processId?: string): DeadlineRecord[] {
    // Die Stellungnahmefrist ist bewusst als Vorlage erzeugt und kann im Einzelfall korrigiert werden.
    const statement = this.createFromTemplate({
      templateKey: 'termination.sbv.statement',
      baseDate: hearingReceivedAt,
      caseId,
      processId,
      sourceEvent: 'Eingang Kündigungsanhörung'
    });

    const claimWarning = this.createFromTemplate({
      templateKey: 'termination.claim.warning',
      baseDate: hearingReceivedAt,
      caseId,
      processId,
      sourceEvent: 'Kündigungsrisiko / Zugang noch prüfen'
    });

    return [statement, claimWarning];
  }

  list(filters: DeadlineListFilters = {}): DeadlineRecord[] {
    this.personalDataAudit('read', undefined, filters.caseId, 'Fristenliste anzeigen', { hasCaseFilter: Boolean(filters.caseId), dashboardOnly: Boolean(filters.dashboardOnly) });
    const rows = this.db.prepare<any>(`SELECT * FROM deadlines ORDER BY due_at ASC`).all();
    let deadlines = rows.map(mapDeadline).map((d: DeadlineRecord) => ({ ...d, status: normalizeStatus(d.status) }));

    if (filters.status?.length) deadlines = deadlines.filter((d: DeadlineRecord) => filters.status!.includes(d.status));
    if (filters.processType?.length) deadlines = deadlines.filter((d: DeadlineRecord) => filters.processType!.includes(d.processType));
    if (filters.caseId) deadlines = deadlines.filter((d: DeadlineRecord) => d.caseId === filters.caseId);
    if (filters.measureId) deadlines = deadlines.filter((d: DeadlineRecord) => d.measureId === filters.measureId);
    if (filters.from) deadlines = deadlines.filter((d: DeadlineRecord) => d.dueAt >= filters.from!);
    if (filters.to) deadlines = deadlines.filter((d: DeadlineRecord) => d.dueAt <= filters.to!);
    if (filters.dashboardOnly) deadlines = deadlines.filter((d: DeadlineRecord) => getDashboardState(d) !== 'hidden');

    return deadlines;
  }

  listToday(referenceDate = new Date()): DeadlineRecord[] {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(referenceDate);
    end.setHours(23, 59, 59, 999);
    return this.list({ from: start.toISOString(), to: end.toISOString(), status: ['open', 'overdue'] });
  }

  listNextSevenDays(referenceDate = new Date()): DeadlineRecord[] {
    const end = new Date(referenceDate);
    end.setDate(end.getDate() + 7);
    return this.list({ from: referenceDate.toISOString(), to: end.toISOString(), status: ['open', 'overdue'] });
  }

  listDashboard(referenceDate = new Date()): DeadlineDashboardItem[] {
    return this.list({ status: ['open', 'overdue'] })
      .map((deadline: DeadlineRecord) => {
        const dashboardState = getDashboardState(deadline, referenceDate);
        return {
          ...deadline,
          dashboardState,
          hoursRemaining: getHoursRemaining(deadline.dueAt, referenceDate),
          safeTitle: deadline.confidentialTitle ?? deadline.title,
          actionHint: getActionHint(deadline)
        } satisfies DeadlineDashboardItem;
      })
      .filter((item: DeadlineDashboardItem) => item.dashboardState !== 'hidden')
      .sort((a: DeadlineDashboardItem, b: DeadlineDashboardItem) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }

  getById(id: string): DeadlineRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM deadlines WHERE id = ?').get(id);
    if (!row) return undefined;
    this.personalDataAudit('read', id, row.case_id ?? undefined, 'Fristendetail anzeigen');
    return { ...mapDeadline(row), status: normalizeStatus(row.status) };
  }

  update(id: string, input: UpdateDeadlineInput): DeadlineRecord {
    const before = this.getById(id);
    if (!before) throw new Error(`Deadline not found: ${id}`);
    if (!before.isUserEditable && input.status !== 'done') throw new Error(`Deadline is not user-editable: ${id}`);

    const nextDueAt = input.dueAt ? new Date(input.dueAt).toISOString() : before.dueAt;
    const nextWarning = input.warningThresholdHours ?? before.warningThresholdHours;
    const dashboardFromAt = subtractHours(nextDueAt, DASHBOARD_HOURS_BEFORE_DUE);
    const nextStatus = input.status ?? before.status;
    const completedAt = nextStatus === 'done' && !before.completedAt ? nowIso() : before.completedAt;
    const cancelledAt = nextStatus === 'cancelled' && !before.cancelledAt ? nowIso() : before.cancelledAt;

    this.db.prepare(`
      UPDATE deadlines SET
        title = ?, confidential_title = ?, description = ?, due_at = ?, reminder_at = ?, legal_basis = ?, source_event = ?,
        severity = ?, status = ?, completed_at = ?, completed_note = ?, cancelled_at = ?, cancelled_reason = ?,
        warning_threshold_hours = ?, critical_threshold_hours = ?, dashboard_from_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.title ?? before.title,
      input.confidentialTitle ?? before.confidentialTitle ?? null,
      input.description ?? before.description ?? null,
      nextDueAt,
      input.reminderAt ?? before.reminderAt ?? null,
      input.legalBasis ?? before.legalBasis ?? null,
      input.sourceEvent ?? before.sourceEvent ?? null,
      input.severity ?? before.severity,
      nextStatus,
      completedAt ?? null,
      input.completedNote ?? before.completedNote ?? null,
      cancelledAt ?? null,
      input.cancelledReason ?? before.cancelledReason ?? null,
      nextWarning,
      input.criticalThresholdHours ?? before.criticalThresholdHours,
      dashboardFromAt,
      nowIso(),
      id
    );

    this.audit(id, 'updated', JSON.stringify(before), JSON.stringify(input), input.reason ?? 'Frist geändert');
    this.personalDataAudit('update', id, before.caseId, 'Frist personenbezogen geändert', { status: nextStatus, reason: input.reason ?? null });
    return this.getById(id)!;
  }

  complete(id: string, note?: string): DeadlineRecord {
    return this.update(id, { status: 'done', completedNote: note, reason: note ?? 'Frist erledigt' });
  }

  suspend(id: string, reason: string): DeadlineRecord {
    return this.update(id, { status: 'suspended', reason });
  }

  cancel(id: string, reason: string): DeadlineRecord {
    return this.update(id, { status: 'cancelled', cancelledReason: reason, reason });
  }

  listTemplates(): DeadlineTemplateRecord[] {
    return this.db.prepare<any>('SELECT * FROM deadline_templates ORDER BY process_type, title').all().map(mapTemplate);
  }

  getTemplateByKey(templateKey: string): DeadlineTemplateRecord | undefined {
    const row = this.db.prepare<any>('SELECT * FROM deadline_templates WHERE template_key = ?').get(templateKey);
    return row ? mapTemplate(row) : undefined;
  }

  getAudit(deadlineId: string): DeadlineAuditRecord[] {
    return this.db.prepare<any>('SELECT * FROM deadline_audit WHERE deadline_id = ? ORDER BY created_at ASC').all(deadlineId).map(mapAudit);
  }

  private audit(deadlineId: string, action: string, oldValue?: string, newValue?: string, reason?: string): void {
    this.db.prepare(`
      INSERT INTO deadline_audit (id, deadline_id, action, old_value, new_value, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), deadlineId, action, oldValue ?? null, newValue ?? null, reason ?? null, nowIso());
  }
}
