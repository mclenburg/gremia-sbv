import type {
  TransferImportConflictLevel,
  TransferImportDecisionItem,
  TransferImportKind,
  TransferImportMode,
  TransferImportPlan,
} from '../src/domain/models/transfer.model.js';

export interface TransferImportMatch {
  conflictLevel?: TransferImportConflictLevel;
}

export interface TransferImportPlanInput {
  transferKind: TransferImportKind;
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  expiresAt?: string;
  isExpired: boolean;
  matches: readonly TransferImportMatch[];
}

function decision(id: string, label: string, severity: TransferImportDecisionItem['severity'], description: string): TransferImportDecisionItem {
  return { id, label, severity, description };
}

function countMatches(matches: readonly TransferImportMatch[], level: TransferImportConflictLevel): number {
  return matches.filter((match) => match.conflictLevel === level).length;
}

export function buildTransferImportPlan(input: TransferImportPlanInput): TransferImportPlan {
  const safeMatchCount = countMatches(input.matches, 'safe_match');
  const possibleMatchCount = countMatches(input.matches, 'possible_match');
  const conflictCount = countMatches(input.matches, 'true_conflict');
  const hasMatches = input.matches.length > 0;
  const isSingleCasePackage = input.caseCount === 1;
  const defaultMode: TransferImportMode = isSingleCasePackage && safeMatchCount === 1 && possibleMatchCount === 0 && conflictCount === 0
    ? 'merge_existing'
    : 'create_new';
  const decisions: TransferImportDecisionItem[] = [
    decision(
      'scope_confirm',
      'Umfang und Zweck prüfen',
      'info',
      `${input.caseCount} Fallakte(n), ${input.measureCount} Maßnahme(n), ${input.documentCount} Dokument(e) und ${input.deadlineCount} Frist(en) werden nur nach bewusster Bestätigung übernommen.`,
    ),
  ];

  if (input.isExpired) {
    decisions.push(decision(
      'expired_reject',
      'Abgelaufenes Paket ablehnen',
      'critical',
      'Das Paket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.',
    ));
  } else if (input.expiresAt) {
    decisions.push(decision(
      'expiry_follow_up',
      'Vertretungsende nachhalten',
      'warning',
      'Nach Ablauf der Übergabe muss geprüft werden, ob die importierten Daten geschlossen, zurückgegeben, gelöscht oder begründet fortgeführt werden.',
    ));
  }

  if (!isSingleCasePackage) {
    decisions.push(decision(
      'multi_case_create_new',
      'Mehrfachübergabe getrennt importieren',
      'info',
      'Eine Mehrfachübergabe legt für jede enthaltene Fallakte eine eigene lokale Übergabeakte an. Eine gemeinsame Zielakte wäre fachlich falsch.',
    ));
  }

  if (conflictCount > 0) {
    decisions.push(decision(
      'merge_conflict_review',
      'Echte Konflikte manuell prüfen',
      'critical',
      'Mindestens ein mögliches Gegenstück trägt dieselben fachlichen Kennzeichen, widerspricht aber bei Name oder Personenbezug. Es wird nicht automatisch zusammengeführt.',
    ));
  } else if (possibleMatchCount > 0) {
    decisions.push(decision(
      'possible_match_review',
      'Mögliche Treffer prüfen',
      'warning',
      'Namens- oder Anzeigenamens-Treffer sind Entscheidungshilfen, aber keine sichere Identitätsfeststellung.',
    ));
  } else if (!hasMatches) {
    decisions.push(decision(
      'no_match_create_new',
      'Neue lokale Übergabeakte',
      'info',
      'Es wurde kein mögliches Gegenstück gefunden. Der Import legt neue lokale Übergabedaten an.',
    ));
  }

  decisions.push(decision(
    'privacy_review_after_import',
    'Datenschutzprüfung vormerken',
    'warning',
    'Importierte Übergabedaten werden als konkreter Prüfauftrag markiert. Löschung oder Fortführung bleibt eine bewusste manuelle Entscheidung.',
  ));

  return {
    transferKind: input.transferKind,
    defaultMode,
    mergeAllowed: isSingleCasePackage && hasMatches && conflictCount === 0,
    requiresExplicitDecision: true,
    privacyReviewRequired: true,
    retentionReviewRequired: Boolean(input.expiresAt),
    safeMatchCount,
    possibleMatchCount,
    conflictCount,
    decisions,
  };
}
