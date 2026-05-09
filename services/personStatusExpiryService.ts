import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import type { PersonStatusExpirySummary, ProtectedPersonRecord } from '../src/app/core/models/protected-person.model.js';

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dueIso(dateOnly: string): string {
  return new Date(`${dateOnly}T09:00:00.000Z`).toISOString();
}

export class PersonStatusExpiryService {
  constructor(private readonly db: DatabaseAdapter) {}

  evaluate(referenceDate = new Date(), warningDays = 30): PersonStatusExpirySummary {
    const personService = new ProtectedPersonService(this.db);
    const persons = personService.list({ employmentState: ['active_employee', 'unknown'] });
    const reference = startOfDay(referenceDate).getTime();
    const warningUntil = startOfDay(referenceDate);
    warningUntil.setUTCDate(warningUntil.getUTCDate() + warningDays);
    const warningTime = warningUntil.getTime();
    const expiringSoon: ProtectedPersonRecord[] = [];
    const expiredReviewRequired: ProtectedPersonRecord[] = [];

    for (const person of persons) {
      if (!person.statusValidUntil || person.lifecycleState === 'anonymized') continue;
      const statusTime = startOfDay(new Date(`${person.statusValidUntil}T00:00:00.000Z`)).getTime();
      if (statusTime < reference) {
        const updated = personService.update(person.id, {
          lifecycleState: 'expired_review_required',
          protectionStatus: 'expired',
          expiryReviewDueAt: new Date(reference).toISOString()
        });
        personService.createStatusExpiredPrivacyReview(updated, new Date(reference).toISOString(), referenceDate);
        expiredReviewRequired.push(updated);
      } else if (statusTime <= warningTime) {
        const updated = person.lifecycleState === 'expiring_soon'
          ? person
          : personService.update(person.id, { lifecycleState: 'expiring_soon', expiryWarningCreatedAt: new Date(reference).toISOString() });
        personService.createStatusExpiryWarning(updated, dueIso(person.statusValidUntil), referenceDate);
        expiringSoon.push(updated);
      }
    }

    return { expiringSoon, expiredReviewRequired };
  }
}
