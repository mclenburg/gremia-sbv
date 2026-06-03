import type { DeadlineRecord } from '../src/app/core/models/deadline.model.js';

export type IcalPrivacyLevel = 'privacy_first' | 'process_type' | 'case_reference' | 'details';

const DIRECT_IDENTIFIER_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /\b(?:PNR|Pers(?:onal)?-?Nr\.?|Personalnummer)\s*[:#]?\s*[A-Z0-9-]{2,}\b/iu,
  /\b(?:Diagnose|Burnout|Depression|Krebs|Therapie|Medikation|Attest)\b/iu
];

const TITLE_WORDS_THAT_ARE_NOT_NAMES = new Set([
  'Anonyme', 'Anfrage', 'BEM', 'Datenschutzprüfung', 'Frist', 'Interne', 'Prävention',
  'Statusnachweis', 'Stellungnahmefrist', 'Wiedervorlage'
]);

function containsLikelyPersonName(value: string): boolean {
  const candidates = value.match(/\b[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+\b/gu) ?? [];
  return candidates.some((candidate) => {
    const [first, second] = candidate.split(/\s+/);
    return !TITLE_WORDS_THAT_ARE_NOT_NAMES.has(first) && !TITLE_WORDS_THAT_ARE_NOT_NAMES.has(second);
  });
}

export function containsDirectIdentifier(value: string | undefined): boolean {
  if (!value) return false;
  return containsLikelyPersonName(value) || DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value));
}

export function deadlineProcessTypeLabel(deadline: Pick<DeadlineRecord, 'processType' | 'deadlineType' | 'sourceEvent'>): string {
  if (deadline.sourceEvent === 'protected_person.status_expiry_warning') return 'Statusnachweis läuft ab';
  if (deadline.sourceEvent === 'protected_person.status_expired_privacy_review') return 'Datenschutzprüfung nach Statusablauf';
  if (deadline.sourceEvent === 'privacy_review.retention_due') return 'Datenschutzprüfung wiedervorlegen';
  switch (deadline.processType) {
    case 'bem': return 'BEM-Wiedervorlage';
    case 'prevention': return 'Prävention prüfen';
    case 'equalization': return 'Gleichstellung prüfen';
    case 'termination_hearing': return 'Stellungnahmefrist prüfen';
    case 'gdb': return 'Statusverfahren prüfen';
    case 'case': return deadline.deadlineType === 'legal_deadline' ? 'Stellungnahmefrist prüfen' : 'Fall-Wiedervorlage';
    case 'sbv_control_protocol': return 'Steuerungsprotokoll-Wiedervorlage';
    default: return 'Wiedervorlage';
  }
}

export function sanitizeIcalText(value: string): string {
  return containsDirectIdentifier(value) ? 'Frist prüfen' : value;
}
