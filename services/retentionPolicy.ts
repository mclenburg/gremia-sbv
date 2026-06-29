import type { RetentionCandidate, RetentionDashboard, RetentionRiskLevel, RetentionSettings } from '../src/app/core/models/retention.model.js';

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  closedCaseReviewMonths: 24,
  inactiveOpenCaseMonths: 6,
  orphanContactReviewDays: 90,
  completedDeadlineRetentionMonths: 36,
  activityJournalReviewMonths: 36,
  participationViolationReviewMonths: 36,
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
  documents?: RetentionDocumentSnapshot[];
  deadlines?: RetentionDeadlineSnapshot[];
  journalEntries?: RetentionActivityJournalSnapshot[];
  participationViolations?: RetentionParticipationViolationSnapshot[];
  cleartextFiles?: string[];
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
        entityId: record.id
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
        entityId: contact.id
      });
    }
  }

  for (const document of input.documents ?? []) {
    if (!document.hasMetadata || !document.fileExists) {
      pushCandidate(candidates, {
        id: `document-integrity-${document.id}`,
        type: 'orphan_document_review',
        riskLevel: 'critical',
        title: 'Dokumentenspeicher prüfen',
        reference: document.caseNumber ? `${document.caseNumber} · ${document.displayTitle}` : document.displayTitle,
        description: document.fileExists
          ? 'Dokumentcontainer vorhanden, aber Metadaten/Verschlüsselungsdaten sind unvollständig.'
          : 'Dokument-Metadaten vorhanden, aber verschlüsselter Container fehlt im Dateisystem.',
        recommendedAction: 'pruefen',
        createdAt: document.createdAt ?? undefined,
        entityType: 'document',
        entityId: document.id
      });
    }
  }

  for (const deadline of input.deadlines ?? []) {
    if (!deadline.caseId && deadline.status !== 'cancelled') {
      pushCandidate(candidates, {
        id: `deadline-free-${deadline.id}`,
        type: 'free_deadline_review',
        riskLevel: deadline.isLegalDeadline ? 'critical' : 'info',
        title: deadline.isLegalDeadline ? 'Rechtliche Frist ohne Fallbezug' : 'Freie Wiedervorlage ohne Fallbezug',
        reference: deadline.title,
        description: deadline.isLegalDeadline
          ? 'Rechtliche Fristen müssen einem Fall oder Prozess zugeordnet werden.'
          : 'Prüfen, ob die Wiedervorlage wirklich ohne Fallbezug bleiben soll.',
        recommendedAction: 'pruefen',
        dueSince: deadline.dueAt ?? undefined,
        entityType: 'deadline',
        entityId: deadline.id
      });
    }

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
        entityId: entry.id
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
        description: 'Der Eintrag war Teil eines Tätigkeitsnachweises. Aufbewahrung und Löschung gesondert prüfen; exported_for_activity_report_at ist keine Historie.',
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

  for (const filePath of input.cleartextFiles ?? []) {
    pushCandidate(candidates, {
      id: `cleartext-${filePath}`,
      type: 'cleartext_file_review',
      riskLevel: 'critical',
      title: 'Mögliche Klartextdatei im geschützten Datenbereich',
      reference: filePath,
      description: 'Im Gremia.SBV-Datenverzeichnis liegt eine Datei, die nicht dem verschlüsselten Containerformat entspricht.',
      recommendedAction: 'pruefen',
      entityType: 'file'
    });
  }

  candidates.sort((a, b) => riskOrder(a.riskLevel) - riskOrder(b.riskLevel) || a.title.localeCompare(b.title, 'de-DE'));

  return {
    generatedAt: now.toISOString(),
    settings,
    candidates,
    counts: {
      total: candidates.length,
      critical: candidates.filter((candidate) => candidate.riskLevel === 'critical').length,
      warning: candidates.filter((candidate) => candidate.riskLevel === 'warning').length,
      info: candidates.filter((candidate) => candidate.riskLevel === 'info').length
    }
  };
}
