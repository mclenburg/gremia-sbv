import type { DeadlineDashboardItem, DeadlineRecord } from '../../core/models/deadline.model';
import { getActionHint, getDashboardState, getHoursRemaining } from '../../core/deadlineLogic';

function hoursFromNow(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export const demoDeadlines: DeadlineRecord[] = [
  {
    id: 'demo-termination-1',
    caseId: '2026-003',
    processType: 'termination_hearing',
    deadlineType: 'legal_deadline',
    title: 'SBV-Stellungnahme Kündigungsanhörung',
    confidentialTitle: 'Gremia.SBV: kritische Frist',
    description: 'Vollständigkeit der Unterrichtung, Integrationsamt und Stellungnahme prüfen.',
    dueAt: hoursFromNow(28),
    legalBasis: '§ 178 Abs. 2 Satz 1 SGB IX, § 168 SGB IX',
    severity: 'fatal',
    status: 'open',
    calculationMode: 'workflow',
    isLegalDeadline: true,
    isUserEditable: true,
    warningThresholdHours: 48,
    criticalThresholdHours: 24,
    dashboardFromAt: hoursFromNow(-20),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-bem-1',
    caseId: '2026-007',
    processType: 'bem',
    deadlineType: 'follow_up',
    title: 'BEM-Rückmeldung prüfen',
    confidentialTitle: 'Gremia.SBV: BEM-Wiedervorlage',
    description: 'Nach Einladung prüfen, ob eine Rückmeldung vorliegt.',
    dueAt: hoursFromNow(44),
    legalBasis: '§ 167 Abs. 2 SGB IX',
    severity: 'important',
    status: 'open',
    calculationMode: 'template',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 48,
    criticalThresholdHours: 24,
    dashboardFromAt: hoursFromNow(-4),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-prevention-overdue',
    caseId: '2026-011',
    processType: 'prevention',
    deadlineType: 'follow_up',
    title: 'Arbeitgeberreaktion Präventionsverfahren prüfen',
    confidentialTitle: 'Gremia.SBV: Prävention nachfassen',
    description: 'Gefährdung des Arbeitsverhältnisses, Arbeitgeberreaktion überfällig.',
    dueAt: hoursFromNow(-6),
    legalBasis: '§ 167 Abs. 1 SGB IX',
    severity: 'critical',
    status: 'open',
    calculationMode: 'template',
    isLegalDeadline: false,
    isUserEditable: true,
    warningThresholdHours: 48,
    criticalThresholdHours: 24,
    dashboardFromAt: hoursFromNow(-54),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getDemoDashboardItems(referenceDate = new Date()): DeadlineDashboardItem[] {
  return demoDeadlines
    .map((deadline) => ({
      ...deadline,
      dashboardState: getDashboardState(deadline, referenceDate),
      hoursRemaining: getHoursRemaining(deadline.dueAt, referenceDate),
      safeTitle: deadline.confidentialTitle ?? deadline.title,
      actionHint: getActionHint(deadline)
    }))
    .filter((item) => item.dashboardState !== 'hidden')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}
