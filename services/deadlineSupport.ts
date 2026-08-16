import type { CreateDeadlineInput, DeadlineAuditRecord, DeadlineDashboardState, DeadlineRecord, DeadlineStatus, DeadlineTemplateRecord } from '../src/app/core/models/deadline.model.js';
export const DASHBOARD_HOURS_BEFORE_DUE = 48;

export interface DeadlineRow {
  id: string; case_id: string | null; measure_id: string | null; person_id: string | null; process_id: string | null;
  process_type: DeadlineRecord['processType'] | null; deadline_type: DeadlineRecord['deadlineType'] | null; title: string;
  confidential_title: string | null; description: string | null; notes: string | null; due_at: string; reminder_at: string | null;
  legal_basis: string | null; source_event: string | null; severity: DeadlineRecord['severity'] | null; status: DeadlineStatus | null;
  calculation_mode: DeadlineRecord['calculationMode'] | null; is_legal_deadline: number; is_user_editable: number | null;
  warning_threshold_hours: number | null; critical_threshold_hours: number | null; dashboard_from_at: string | null;
  completed_at: string | null; completed_note: string | null; cancelled_at: string | null; cancelled_reason: string | null;
  created_at: string; updated_at: string;
}
export interface DeadlineTemplateRow {
  id: string; template_key: string; title: string; confidential_title: string | null; description: string | null;
  process_type: DeadlineTemplateRecord['processType']; deadline_type: DeadlineTemplateRecord['deadlineType']; offset_days: number | null;
  offset_hours: number | null; reminder_days_before: number | null; legal_basis: string | null; severity: DeadlineTemplateRecord['severity'];
  is_legal_deadline: number; warning_threshold_hours: number | null; critical_threshold_hours: number | null; enabled: number;
  created_at: string; updated_at: string;
}
export interface DeadlineAuditRow { id: string; deadline_id: string; action: DeadlineAuditRecord['action']; old_value: string | null; new_value: string | null; reason: string | null; created_at: string; }


export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function addOffset(baseIso: string, days: number, hours: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid base date: ${baseIso}`);
  base.setUTCDate(base.getUTCDate() + days);
  base.setUTCHours(base.getUTCHours() + hours);
  return toIso(base);
}

export function subtractHours(baseIso: string, hours: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid date: ${baseIso}`);
  base.setUTCHours(base.getUTCHours() - hours);
  return toIso(base);
}

export function bool(value: unknown): boolean {
  return Boolean(value);
}

export function mapDeadline(row: DeadlineRow): DeadlineRecord {
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

export function mapTemplate(row: DeadlineTemplateRow): DeadlineTemplateRecord {
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

export function mapAudit(row: DeadlineAuditRow): DeadlineAuditRecord {
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

export function normalizeStatus(status: string | undefined): DeadlineStatus {
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
  if (deadline.processType === 'election') return 'Wahlvorbereitung prüfen: Wahlorgan, Unterlagen und nächste gesetzliche Frist nachhalten.';
  if (deadline.sourceEvent === 'protected_person.status_expiry_warning' || deadline.sourceEvent === 'protected_person.status_expired_privacy_review') {
    return 'Statusnachweis im Personenverzeichnis prüfen: Status aktualisieren, Fortspeicherung begründen oder Datenschutzprüfung starten.';
  }
  return 'Nächsten Schritt im Fall prüfen und dokumentieren.';
}


export function validateCaseBinding(input: CreateDeadlineInput): void {
  const deadlineType = input.deadlineType ?? 'follow_up';
  const officeOwnerTypes = new Set(['sbv_meeting','sbv_assembly','employer_obligation_review','inclusion_agreement','election']);
  const isOfficeOwner = officeOwnerTypes.has(input.processType) && Boolean(input.processId);
  const isFreeFollowUp = input.processType === 'custom' && ['follow_up', 'warning'].includes(deadlineType) && !input.isLegalDeadline;
  const isNamedFollowUp = ['sbv_control_protocol','activity_journal','sbv_participation_violation','recruiting_participation'].includes(input.processType)
    && deadlineType === 'follow_up' && !input.isLegalDeadline && Boolean(input.processId);

  if (!input.caseId && !isFreeFollowUp && !isNamedFollowUp && !isOfficeOwner) {
    throw new Error('Fristen benötigen einen Fallbezug oder einen ausdrücklich unterstützten fallunabhängigen SBV-Amtsvorgang.');
  }
  if (!input.caseId && (input.isLegalDeadline || deadlineType === 'legal_deadline' || deadlineType === 'workflow_step') && !isOfficeOwner) {
    throw new Error('Rechtliche Fristen und Workflow-Schritte ohne Fallbezug sind nur für unterstützte SBV-Amtsvorgänge zulässig.');
  }
}

