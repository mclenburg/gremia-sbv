import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { decidePersonLifecycleTransition } from './personLifecyclePolicy.js';
import type { PersonStatusExpirySummary, ProtectedPersonRecord } from '../src/app/core/models/protected-person.model.js';

function dueIso(dateOnly: string): string {
  return new Date(`${dateOnly}T09:00:00.000Z`).toISOString();
}

export class PersonStatusExpiryService {
  constructor(private readonly db: DatabaseAdapter) {}

  evaluate(referenceDate = new Date(), warningDays = 30): PersonStatusExpirySummary {
    const personService = new ProtectedPersonService(this.db);
    const persons = personService.list({ employmentState: ['active_employee', 'unknown'] });
    const expiringSoon: ProtectedPersonRecord[] = [];
    const expiredReviewRequired: ProtectedPersonRecord[] = [];

    for (const person of persons) {
      const decision = decidePersonLifecycleTransition(person, referenceDate, warningDays);
      if (!decision) continue;

      const updated = personService.update(person.id, decision);
      if (decision.lifecycleState === 'expired_review_required') {
        personService.createStatusExpiredPrivacyReview(updated, decision.expiryReviewDueAt ?? referenceDate.toISOString(), referenceDate);
        expiredReviewRequired.push(updated);
      } else if (decision.lifecycleState === 'expiring_soon' && person.statusValidUntil) {
        personService.createStatusExpiryWarning(updated, dueIso(person.statusValidUntil), referenceDate);
        expiringSoon.push(updated);
      }
    }

    return { expiringSoon, expiredReviewRequired };
  }
}
