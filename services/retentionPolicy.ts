import type { RetentionCandidate, RetentionDashboard, RetentionRiskLevel, RetentionSettings } from '../src/app/core/models/retention.model.js';

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  closedCaseReviewMonths: 24,
  inactiveOpenCaseMonths: 6,
  orphanContactReviewDays: 90,
  completedDeadlineRetentionMonths: 36,
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
