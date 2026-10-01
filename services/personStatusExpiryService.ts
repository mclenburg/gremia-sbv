import type { DatabaseAdapter } from './databaseService.js';
import { ProtectedPersonService } from './protectedPersonService.js';
import { DeadlineService } from './deadlineService.js';
import { classifyPersonStatusExpiry, decidePersonLifecycleTransition } from './personLifecyclePolicy.js';
import { PrivacyReviewService } from './privacyReviewService.js';
import type { PersonStatusExpirySummary, ProtectedPersonRecord } from '../src/domain/models/protected-person.model.js';

function dueIso(dateOnly: string): string {
  return new Date(`${dateOnly}T09:00:00.000Z`).toISOString();
}

export class PersonStatusExpiryService {
  constructor(private readonly database: DatabaseAdapter) {}

  evaluate(referenceDate = new Date(), warningDays = 30): PersonStatusExpirySummary {
    const personService = new ProtectedPersonService(this.database);
    const persons = personService.list();
    const deadlines = new DeadlineService(this.database);
    const expiringSoon: ProtectedPersonRecord[] = [];
    const expiredReviewRequired: ProtectedPersonRecord[] = [];

    for (const person of persons) {
      const classification = classifyPersonStatusExpiry(person, referenceDate, warningDays);
      const expected = classification === 'warning' && person.statusValidUntil
        ? { sourceEvent: 'protected_person.status_expiry_warning' as const, dueAt: dueIso(person.statusValidUntil) }
        : classification === 'expired'
          ? { sourceEvent: 'protected_person.status_expired_privacy_review' as const }
          : undefined;
      deadlines.cancelAutomaticPersonStatusDeadlines(person.id, expected);
      const decision = decidePersonLifecycleTransition(person, referenceDate, warningDays);
      if (!decision) continue;

      const updated = personService.update(person.id, decision);
      if (decision.lifecycleState === 'expired_review_required') {
        personService.createStatusExpiredPrivacyReview(updated, decision.expiryReviewDueAt ?? referenceDate.toISOString(), referenceDate);
        new PrivacyReviewService(this.database).markLinkedCasesForPerson(updated.id, 'status_expired');
        expiredReviewRequired.push(updated);
      } else if (decision.lifecycleState === 'expiring_soon' && person.statusValidUntil) {
        personService.createStatusExpiryWarning(updated, dueIso(person.statusValidUntil), referenceDate);
        expiringSoon.push(updated);
      }
    }

    return { expiringSoon, expiredReviewRequired };
  }
}
