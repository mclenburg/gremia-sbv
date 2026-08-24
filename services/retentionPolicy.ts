import type { RetentionCandidate, RetentionDashboard, RetentionModuleSnapshot, RetentionProtectedPersonSnapshot, RetentionRiskLevel, RetentionSettings } from '../src/domain/models/retention.model.js';
import type { RetentionOwnerSnapshot } from '../src/domain/models/retention-owner.model.js';
import { buildOfficeOwnerRetentionCandidates } from './retentionOwnerPolicy.js';
import { buildModuleRetentionCandidates, RETENTION_POLICY_CATALOG } from './retentionPolicyCatalog.js';
import { buildRetentionIntegrityCandidates } from './retentionIntegrityPolicy.js';

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  closedCaseReviewMonths: 36,
  inactiveOpenCaseMonths: 6,
  orphanContactReviewDays: 0,
  completedDeadlineRetentionMonths: 36,
  activityJournalReviewMonths: 36,
  participationViolationReviewMonths: 48,
  minimumGroupSizeForReports: 3
};

export interface RetentionCaseSnapshot {
  id: string;
  caseNumber: string;
  displayName?: string | null;
  status: string;
  category?: string | null;
  closedAt?: string | null;
  openedAt?: string | null;
  lastActivityAt?: string | null;
  noteCount?: number;
  documentCount?: number;
  openDeadlineCount?: number;
}

export interface RetentionContactSnapshot {
  id: string;
  displayName: string;
  createdAt?: string | null;
  referenceCount?: number;
}

export interface RetentionDocumentSnapshot {
  id: string;
  caseId?: string | null;
  caseNumber?: string | null;
  displayTitle: string;
  storagePath?: string | null;
  hasMetadata: boolean;
  fileExists: boolean;
  createdAt?: string | null;
}


export interface RetentionParticipationViolationSnapshot {
  id: string;
  stage: string;
  status: string;
  subject: string;
  caseId?: string | null;
  sourceContextType?: string | null;
  sourceContextId?: string | null;
  relatedCaseMeasureId?: string | null;
  relatedRecruitingParticipationId?: string | null;
  relatedDeadlineId?: string | null;
  documentCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
}

export interface RetentionActivityJournalSnapshot {
  id: string;
  title: string;
  entryDate: string;
  status: string;
  category: string;
  caseLinked?: boolean;
  linkedActiveCase?: boolean;
  openFollowUp?: boolean;
  exportedForActivityReportAt?: string | null;
}

export interface RetentionDeadlineSnapshot {
  id: string;
  title: string;
  status: string;
  caseId?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  isLegalDeadline?: boolean;
}

export interface RetentionScanInput {
  now?: Date;
  settings?: Partial<RetentionSettings>;
  cases?: RetentionCaseSnapshot[];
  contacts?: RetentionContactSnapshot[];
  protectedPersons?: RetentionProtectedPersonSnapshot[];
  documents?: RetentionDocumentSnapshot[];
  deadlines?: RetentionDeadlineSnapshot[];
  journalEntries?: RetentionActivityJournalSnapshot[];
  participationViolations?: RetentionParticipationViolationSnapshot[];
  officeOwners?: RetentionOwnerSnapshot[];
  moduleRecords?: RetentionModuleSnapshot[];
}

function monthsAgo(now: Date, months: number): Date {
  const copy = new Date(now.getTime());
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function beforeOrEqual(value: string | null | undefined, cutoff: Date): boolean {
  const parsed = parseDate(value);
  return Boolean(parsed && parsed.getTime() <= cutoff.getTime());
}

function pushCandidate(candidates: RetentionCandidate[], candidate: RetentionCandidate): void {
  candidates.push(candidate);
}

function riskOrder(risk: RetentionRiskLevel): number {
  if (risk === 'critical') return 0;
  if (risk === 'warning') return 1;
  return 2;
}

export function normalizeRetentionSettings(input?: Partial<RetentionSettings>): RetentionSettings {
  return {
    ...DEFAULT_RETENTION_SETTINGS,
    ...(input ?? {})
  };
}

function appendCaseCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, settings: RetentionSettings, closedCutoff: Date, inactiveCutoff: Date): void {
for (const record of input.cases ?? []) {
    if (record.status === 'abgeschlossen' && beforeOrEqual(record.closedAt, closedCutoff)) {
      pushCandidate(candidates, {
        id: `case-review-${record.id}`,
        type: 'closed_case_review',
        riskLevel: 'warning',
        title: 'Abgeschlossener Fall zur Löschprüfung',
        reference: record.caseNumber,
        description: `Fall ist seit mindestens ${settings.closedCaseReviewMonths} Monaten abgeschlossen. Prüfen, ob Anonymisierung oder Löschung möglich ist.`,
        recommendedAction: 'anonymisieren',
        createdAt: record.closedAt ?? undefined,
        entityType: 'case',
        entityId: record.id,
        privacyReviewRequired: true,
        policyKey: 'case_file',
        legalBasis: 'Art. 5 Abs. 1 lit. e DSGVO; §§ 195, 199 BGB',
      });
    }

    if (record.status !== 'abgeschlossen' && beforeOrEqual(record.lastActivityAt ?? record.openedAt, inactiveCutoff)) {
      pushCandidate(candidates, {
        id: `case-stale-${record.id}`,
        type: 'stale_case_review',
        riskLevel: record.openDeadlineCount ? 'warning' : 'info',
        title: 'Fall ohne aktuelle Aktivität',
        reference: record.caseNumber,
        description: `Seit mindestens ${settings.inactiveOpenCaseMonths} Monaten keine erkennbare Aktivität. Wiedervorlage, Ruhendstellung oder Abschluss prüfen.`,
        recommendedAction: 'pruefen',
        createdAt: record.lastActivityAt ?? record.openedAt ?? undefined,
        entityType: 'case',
        entityId: record.id
      });
    }
  }
}

function appendContactCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, settings: RetentionSettings, orphanContactCutoff: Date): void {
for (const contact of input.contacts ?? []) {
    if ((contact.referenceCount ?? 0) === 0 && beforeOrEqual(contact.createdAt, orphanContactCutoff)) {
      pushCandidate(candidates, {
        id: `contact-orphan-${contact.id}`,
        type: 'orphan_contact_review',
        riskLevel: 'info',
        title: 'Kontakt ohne Text- oder Fallbezug',
        reference: contact.displayName,
        description: `Kontakt ist seit mindestens ${settings.orphanContactReviewDays} Tagen ohne erkannten Bezug. Löschung oder Anonymisierung prüfen.`,
        recommendedAction: 'loeschen',
        createdAt: contact.createdAt ?? undefined,
        entityType: 'contact',
        entityId: contact.id,
        privacyReviewRequired: true,
        policyKey: 'protected_person',
        legalBasis: 'Art. 5 Abs. 1 lit. e, Art. 17 DSGVO',
      });
    }
  }
}

function appendProtectedPersonCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, orphanContactCutoff: Date): void {
  for (const person of input.protectedPersons ?? []) {
    if (['anonymized', 'deleted_marker'].includes(person.lifecycleState ?? '')) continue;
    const employmentEnded = person.employmentState === 'left_company';
    const requiredForParticipationChecks = !employmentEnded
      && ['severely_disabled', 'equivalent'].includes(person.protectionStatus);
    if (requiredForParticipationChecks) continue;
    if (!employmentEnded && person.retainedReferenceCount > 0) continue;
    const reviewReference = employmentEnded ? person.leftCompanyAt ?? person.createdAt : person.createdAt;
    if (!beforeOrEqual(reviewReference, orphanContactCutoff)) continue;
    const hasRetainedContext = person.retainedReferenceCount > 0;
    pushCandidate(candidates, {
      id: `protected-person-purpose-expired-${person.id}`,
      type: 'orphan_person_review',
      riskLevel: hasRetainedContext ? 'warning' : 'info',
      title: employmentEnded ? 'Beschäftigungsverhältnis beendet' : 'Person ohne fortbestehenden Vorgangsbezug',
      reference: person.displayName,
      description: hasRetainedContext
        ? 'Das Beschäftigungsverhältnis ist beendet, es bestehen aber noch aufzubewahrende Vorgangsbezüge. Zweck, Fristen und Verknüpfungen vor einer manuellen Aussonderung gemeinsam prüfen.'
        : 'Die Person gehört nicht zum fortlaufend benötigten Verzeichnis der beschäftigten schwerbehinderten oder gleichgestellten Menschen und hat keinen aufzubewahrenden Vorgangsbezug. Zweckwegfall und manuelle Aussonderung prüfen.',
      recommendedAction: 'pruefen',
      createdAt: reviewReference ?? undefined,
      entityType: 'protected_person',
      entityId: person.id,
      privacyReviewRequired: true,
      policyKey: 'protected_person',
      legalBasis: 'Art. 5 Abs. 1 lit. e, Art. 17 DSGVO',
    });
  }
}

function appendDeadlineCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, settings: RetentionSettings, completedDeadlineCutoff: Date): void {
for (const deadline of input.deadlines ?? []) {
    if (deadline.status === 'done' && beforeOrEqual(deadline.completedAt ?? deadline.dueAt, completedDeadlineCutoff)) {
      pushCandidate(candidates, {
        id: `deadline-completed-${deadline.id}`,
        type: 'free_deadline_review',
        riskLevel: 'info',
        title: 'Erledigte Frist zur Aufbewahrungsprüfung',
        reference: deadline.title,
        description: `Frist ist seit mindestens ${settings.completedDeadlineRetentionMonths} Monaten erledigt. Zusammenhang mit Fallakte prüfen.`,
        recommendedAction: 'pruefen',
        createdAt: deadline.completedAt ?? deadline.dueAt ?? undefined,
        entityType: 'deadline',
        entityId: deadline.id
      });
    }
  }
}

function appendJournalCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, settings: RetentionSettings, journalCutoff: Date): void {
for (const entry of input.journalEntries ?? []) {
    if (entry.openFollowUp) {
      pushCandidate(candidates, {
        id: `journal-follow-up-${entry.id}`,
        type: 'journal_entry_deferred_open_follow_up',
        riskLevel: 'warning',
        title: 'Journal-Eintrag mit offener Wiedervorlage',
        reference: entry.title,
        description: 'Offene Journal-Wiedervorlagen sperren automatische Löschung. Ergebnis oder Nachfassung prüfen.',
        recommendedAction: 'pruefen',
        dueSince: entry.entryDate,
        entityType: 'activity_journal_entry',
        entityId: entry.id,
        privacyReviewRequired: true,
        policyKey: 'activity_journal',
        legalBasis: '§ 178 SGB IX; Art. 5 Abs. 1 lit. c DSGVO',
      });
      continue;
    }

    if (entry.exportedForActivityReportAt) {
      pushCandidate(candidates, {
        id: `journal-export-${entry.id}`,
        type: 'journal_entry_exported_review_required',
        riskLevel: 'warning',
        title: 'Exportierter Journal-Eintrag prüfpflichtig',
        reference: entry.title,
        description: 'Der Eintrag war Teil eines Tätigkeitsnachweises. Aufbewahrung und Löschung gesondert prüfen; exported_for_activity_report_at ist kein eigenständiger Aufbewahrungsgrund.',
        recommendedAction: 'pruefen',
        createdAt: entry.exportedForActivityReportAt,
        entityType: 'activity_journal_entry',
        entityId: entry.id
      });
    }

    if (entry.linkedActiveCase) {
      pushCandidate(candidates, {
        id: `journal-active-case-${entry.id}`,
        type: 'journal_entry_linked_to_active_case',
        riskLevel: 'info',
        title: 'Journal-Eintrag mit aktiver Fallverknüpfung',
        reference: entry.title,
        description: 'Fallbezogene Journaleinträge folgen grundsätzlich dem Retention-Status der verknüpften Fallakte.',
        recommendedAction: 'pruefen',
        createdAt: entry.entryDate,
        entityType: 'activity_journal_entry',
        entityId: entry.id
      });
      continue;
    }

    if (!entry.caseLinked && beforeOrEqual(entry.entryDate, journalCutoff)) {
      pushCandidate(candidates, {
        id: `journal-review-${entry.id}`,
        type: 'journal_entry_review_due',
        riskLevel: 'info',
        title: 'Fallfreier Journal-Eintrag zur Aufbewahrungsprüfung',
        reference: entry.title,
        description: `Fallfreier Journaleintrag ist seit mindestens ${settings.activityJournalReviewMonths} Monaten dokumentiert. Prüfen, ob Reduktion auf Statistik oder Löschung möglich ist.`,
        recommendedAction: 'pruefen',
        createdAt: entry.entryDate,
        entityType: 'activity_journal_entry',
        entityId: entry.id
      });
    }
  }
}

function appendParticipationViolationCandidates(candidates: RetentionCandidate[], input: RetentionScanInput, settings: RetentionSettings, participationViolationCutoff: Date): void {
for (const violation of input.participationViolations ?? []) {
    if (violation.sourceContextType === 'recruiting_participation' && !violation.relatedRecruitingParticipationId) {
      pushCandidate(candidates, {
        id: `participation-violation-recruiting-link-${violation.id}`,
        type: 'participation_violation_open_review',
        riskLevel: 'critical',
        title: 'Beteiligungsverstoß ohne Stellenbesetzungskontext prüfen',
        reference: violation.subject,
        description: 'Der Verstoß wurde als Eskalation aus einer Stellenbesetzung angelegt, hat aber keinen gespeicherten related_recruiting_participation_id-Bezug. Kontext reparieren oder Aufbewahrung gesondert begründen.',
        recommendedAction: 'pruefen',
        createdAt: violation.updatedAt ?? violation.createdAt ?? undefined,
        entityType: 'sbv_participation_violation',
        entityId: violation.id,
        privacyReviewRequired: true,
        policyKey: 'sbv_participation',
        legalBasis: '§§ 177, 178 SGB IX',
      });
    }

    if (violation.sourceContextType === 'case_measure_participation' && !violation.relatedCaseMeasureId) {
      pushCandidate(candidates, {
        id: `participation-violation-measure-link-${violation.id}`,
        type: 'participation_violation_open_review',
        riskLevel: 'critical',
        title: 'Beteiligungsverstoß ohne Maßnahmekontext prüfen',
        reference: violation.subject,
        description: 'Der Verstoß wurde als Eskalation aus einer SBV-Beteiligungsmaßnahme angelegt, hat aber keinen gespeicherten related_case_measure_id-Bezug. Kontext reparieren oder Aufbewahrung gesondert begründen.',
        recommendedAction: 'pruefen',
        createdAt: violation.updatedAt ?? violation.createdAt ?? undefined,
        entityType: 'sbv_participation_violation',
        entityId: violation.id,
      });
    }

    const isOpen = ['draft', 'open', 'sent', 'escalated'].includes(violation.status);
    if (isOpen) {
      pushCandidate(candidates, {
        id: `participation-violation-open-${violation.id}`,
        type: 'participation_violation_open_review',
        riskLevel: violation.status === 'escalated' ? 'critical' : 'warning',
        title: 'Offener Beteiligungsverstoß nachhalten',
        reference: violation.subject,
        description: 'Offene oder eskalierte Beteiligungsverstöße werden nicht automatisch gelöscht. Reaktion, Heilung, Frist oder weitere Eskalation prüfen.',
        recommendedAction: 'pruefen',
        createdAt: violation.updatedAt ?? violation.createdAt ?? undefined,
        entityType: 'sbv_participation_violation',
        entityId: violation.id,
      });
      continue;
    }
    if (beforeOrEqual(violation.closedAt ?? violation.updatedAt ?? violation.createdAt, participationViolationCutoff)) {
      pushCandidate(candidates, {
        id: `participation-violation-closed-${violation.id}`,
        type: 'participation_violation_closed_review',
        riskLevel: (violation.documentCount ?? 0) > 0 ? 'warning' : 'info',
        title: 'Geschlossener Beteiligungsverstoß zur Aufbewahrungsprüfung',
        reference: violation.subject,
        description: `Geschlossener Verstoßvorgang ist seit mindestens ${settings.participationViolationReviewMonths} Monaten prüfpflichtig. Dokumente, Nachweisinteresse und Fallbezug bewerten.`,
        recommendedAction: 'pruefen',
        createdAt: violation.closedAt ?? violation.updatedAt ?? violation.createdAt ?? undefined,
        entityType: 'sbv_participation_violation',
        entityId: violation.id,
      });
    }
  }
}

export function buildRetentionDashboard(input: RetentionScanInput): RetentionDashboard {
  const now = input.now ?? new Date();
  const settings = normalizeRetentionSettings(input.settings);
  const candidates: RetentionCandidate[] = [];
  const closedCutoff = monthsAgo(now, settings.closedCaseReviewMonths);
  const inactiveCutoff = monthsAgo(now, settings.inactiveOpenCaseMonths);
  const orphanContactCutoff = daysAgo(now, settings.orphanContactReviewDays);
  const completedDeadlineCutoff = monthsAgo(now, settings.completedDeadlineRetentionMonths);
  const journalCutoff = monthsAgo(now, settings.activityJournalReviewMonths);
  const participationViolationCutoff = monthsAgo(now, settings.participationViolationReviewMonths);

  appendCaseCandidates(candidates, input, settings, closedCutoff, inactiveCutoff);
  appendContactCandidates(candidates, input, settings, orphanContactCutoff);
  appendProtectedPersonCandidates(candidates, input, orphanContactCutoff);
  candidates.push(...buildRetentionIntegrityCandidates(input.documents ?? []));
  appendDeadlineCandidates(candidates, input, settings, completedDeadlineCutoff);
  appendJournalCandidates(candidates, input, settings, journalCutoff);
  appendParticipationViolationCandidates(candidates, input, settings, participationViolationCutoff);
  candidates.push(...buildOfficeOwnerRetentionCandidates(input.officeOwners ?? [], now));
  candidates.push(...buildModuleRetentionCandidates(input.moduleRecords ?? [], now));

candidates.sort((a, b) => riskOrder(a.riskLevel) - riskOrder(b.riskLevel) || a.title.localeCompare(b.title, 'de-DE'));

  return {
    generatedAt: now.toISOString(),
    settings,
    policies: RETENTION_POLICY_CATALOG.map((policy) => ({ ...policy, rule: { ...policy.rule } })),
    candidates,
    counts: {
      total: candidates.length,
      critical: candidates.filter((candidate) => candidate.riskLevel === 'critical').length,
      warning: candidates.filter((candidate) => candidate.riskLevel === 'warning').length,
      info: candidates.filter((candidate) => candidate.riskLevel === 'info').length
    }
  };
}
