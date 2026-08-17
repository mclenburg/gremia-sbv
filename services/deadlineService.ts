import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type { CreateDeadlineInput, CreateFromTemplateInput, DeadlineAuditRecord, DeadlineDashboardItem, DeadlineListFilters, DeadlineRecord, DeadlineTemplateRecord, UpdateDeadlineInput } from '../src/domain/models/deadline.model.js';
import { DASHBOARD_HOURS_BEFORE_DUE, DeadlineRow, DeadlineTemplateRow, DeadlineAuditRow, nowIso, addOffset, subtractHours, mapDeadline, mapTemplate, mapAudit, normalizeStatus, getHoursRemaining, getDashboardState, getActionHint, validateCaseBinding } from './deadlineSupport.js';
export { getHoursRemaining, getDashboardState, getActionHint } from './deadlineSupport.js';

export class DeadlineService {
  constructor(private readonly db: DatabaseAdapter) {}

  private personalDataAudit(action: Parameters<PersonalDataAuditLogService['append']>[0]['action'], subjectId: string | undefined, caseId: string | undefined, purpose: string, metadata?: Record<string, unknown>): void {
    try {
      new PersonalDataAuditLogService(this.db).append({ action, subjectType: 'deadline', subjectId, caseId, purpose, metadata });
    } catch (error) {
      console.warn('Gremia.SBV audit log write failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }

  create(input: CreateDeadlineInput): DeadlineRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
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
  
    });
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
    const rows = this.db.prepare<DeadlineRow>(`SELECT * FROM deadlines ORDER BY due_at ASC`).all();
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
    const row = this.db.prepare<DeadlineRow>('SELECT * FROM deadlines WHERE id = ?').get(id);
    if (!row) return undefined;
    this.personalDataAudit('read', id, row.case_id ?? undefined, 'Fristendetail anzeigen');
    return { ...mapDeadline(row), status: normalizeStatus(row.status ?? undefined) };
  }

  update(id: string, input: UpdateDeadlineInput): DeadlineRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
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
  
    });
  }

  complete(id: string, note?: string): DeadlineRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    return this.update(id, { status: 'done', completedNote: note, reason: note ?? 'Frist erledigt' });
  
    });
  }

  suspend(id: string, reason: string): DeadlineRecord {
    return this.update(id, { status: 'suspended', reason });
  }

  cancel(id: string, reason: string): DeadlineRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
    return this.update(id, { status: 'cancelled', cancelledReason: reason, reason });
  
    });
  }

  listTemplates(): DeadlineTemplateRecord[] {
    return this.db.prepare<DeadlineTemplateRow>('SELECT * FROM deadline_templates ORDER BY process_type, title').all().map(mapTemplate);
  }

  getTemplateByKey(templateKey: string): DeadlineTemplateRecord | undefined {
    const row = this.db.prepare<DeadlineTemplateRow>('SELECT * FROM deadline_templates WHERE template_key = ?').get(templateKey);
    return row ? mapTemplate(row) : undefined;
  }

  getAudit(deadlineId: string): DeadlineAuditRecord[] {
    return this.db.prepare<DeadlineAuditRow>('SELECT * FROM deadline_audit WHERE deadline_id = ? ORDER BY created_at ASC').all(deadlineId).map(mapAudit);
  }

  private audit(deadlineId: string, action: string, oldValue?: string, newValue?: string, reason?: string): void {
    this.db.prepare(`
      INSERT INTO deadline_audit (id, deadline_id, action, old_value, new_value, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), deadlineId, action, oldValue ?? null, newValue ?? null, reason ?? null, nowIso());
  }
}
