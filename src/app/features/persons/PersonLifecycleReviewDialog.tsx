import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';
import { lifecycleStateLabels } from '../../core/models/protected-person.model';

export function PersonLifecycleReviewDialog({ person }: { person: ProtectedPersonRecord }) {
  if (!['expired_review_required', 'anonymization_pending', 'retention_documented'].includes(person.lifecycleState)) return null;
  return (
    <aside className="industrial-alert person-lifecycle-review" aria-label="Datenschutzprüfung zum Personenstatus">
      <strong>Datenschutz-Lifecycle: {lifecycleStateLabels[person.lifecycleState]}</strong>
      <p>
        Bitte prüfen Sie, ob personenbezogene Speicherung nach Statusablauf oder Beschäftigungsende weiter erforderlich ist.
        Fortspeicherung, Anonymisierung oder Löschung sind fachlich zu dokumentieren.
      </p>
    </aside>
  );
}
