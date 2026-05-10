import type { PersonLifecycleState, ProtectedPersonRecord, ProtectionStatus } from '../src/app/core/models/protected-person.model.js';

export interface PersonLifecycleDecision {
  lifecycleState: PersonLifecycleState;
  protectionStatus?: ProtectionStatus;
  expiryWarningCreatedAt?: string;
  expiryReviewDueAt?: string;
}

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function decidePersonLifecycleTransition(
  person: ProtectedPersonRecord,
  referenceDate = new Date(),
  warningDays = 30
): PersonLifecycleDecision | null {
  if (!person.statusValidUntil || person.lifecycleState === 'anonymized') return null;

  const reference = startOfDay(referenceDate);
  const warningUntil = new Date(reference);
  warningUntil.setUTCDate(warningUntil.getUTCDate() + warningDays);
  const validUntil = startOfDay(new Date(`${person.statusValidUntil}T00:00:00.000Z`));

  if (validUntil < reference) {
    return {
      lifecycleState: 'expired_review_required',
      protectionStatus: 'expired',
      expiryReviewDueAt: new Date(reference).toISOString()
    };
  }

  if (validUntil <= warningUntil.getTime() && person.lifecycleState !== 'expiring_soon') {
    return {
      lifecycleState: 'expiring_soon',
      expiryWarningCreatedAt: new Date(reference).toISOString()
    };
  }

  return null;
}
