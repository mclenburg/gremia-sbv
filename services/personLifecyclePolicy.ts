import type { PersonLifecycleState, ProtectedPersonRecord, ProtectionStatus } from '../src/domain/models/protected-person.model.js';

export interface PersonLifecycleDecision {
  lifecycleState: PersonLifecycleState;
  protectionStatus?: ProtectionStatus;
  expiryWarningCreatedAt?: string;
  expiryReviewDueAt?: string;
}

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function classifyPersonStatusExpiry(person: ProtectedPersonRecord, referenceDate = new Date(), warningDays = 30): 'none' | 'warning' | 'expired' {
  if (!person.statusValidUntil || person.lifecycleState === 'anonymized' || person.employmentState === 'left_company') return 'none';
  const reference = startOfDay(referenceDate);
  const validUntil = startOfDay(new Date(`${person.statusValidUntil}T00:00:00.000Z`));
  if (validUntil < reference) return 'expired';
  const warningUntil = new Date(reference);
  warningUntil.setUTCDate(warningUntil.getUTCDate() + warningDays);
  return validUntil <= warningUntil.getTime() ? 'warning' : 'none';
}

export function decidePersonLifecycleTransition(
  person: ProtectedPersonRecord,
  referenceDate = new Date(),
  warningDays = 30
): PersonLifecycleDecision | null {
  const classification = classifyPersonStatusExpiry(person, referenceDate, warningDays);
  if (classification === 'none' && (person.lifecycleState === 'expiring_soon' || person.lifecycleState === 'expired_review_required')) {
    return { lifecycleState: 'active', expiryWarningCreatedAt: '', expiryReviewDueAt: '' };
  }
  if (classification === 'expired' && (person.lifecycleState !== 'expired_review_required' || person.protectionStatus !== 'expired')) {
    return {
      lifecycleState: 'expired_review_required',
      protectionStatus: 'expired',
      expiryReviewDueAt: new Date(startOfDay(referenceDate)).toISOString()
    };
  }

  if (classification === 'warning' && person.lifecycleState !== 'expiring_soon') {
    return {
      lifecycleState: 'expiring_soon',
      expiryWarningCreatedAt: new Date(startOfDay(referenceDate)).toISOString()
    };
  }

  return null;
}
