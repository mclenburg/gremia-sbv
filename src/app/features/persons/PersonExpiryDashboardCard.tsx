import { CalendarCheck } from 'lucide-react';
import type { ProtectedPersonRecord } from '../../core/models/protected-person.model';

function isExpiringSoon(person: ProtectedPersonRecord): boolean {
  return person.lifecycleState === 'expiring_soon';
}

function needsReview(person: ProtectedPersonRecord): boolean {
  return person.lifecycleState === 'expired_review_required';
}

export function PersonExpiryDashboardCard({
  persons,
  onEvaluateExpiry,
  onExportIcal
}: {
  persons: ProtectedPersonRecord[];
  onEvaluateExpiry: () => Promise<void>;
  onExportIcal: () => Promise<void>;
}) {
  const expiringSoon = persons.filter(isExpiringSoon).length;
  const reviewRequired = persons.filter(needsReview).length;

  return (
    <section className="industrial-panel person-expiry-card" aria-labelledby="person-expiry-heading">
      <div className="industrial-panel-heading">
        <div>
          <p className="industrial-kicker">Fristenintegration</p>
          <h2 id="person-expiry-heading">Statusabläufe</h2>
        </div>
        <CalendarCheck className="h-5 w-5 text-yellow-300" aria-hidden="true" />
      </div>
      <div className="person-expiry-stats" aria-label="Statusablauf-Zusammenfassung">
        <span>{expiringSoon} laufen bald ab</span>
        <span>{reviewRequired} Datenschutzprüfungen</span>
      </div>
      <div className="person-toolbar compact">
        <button type="button" className="industrial-secondary-button" onClick={() => void onEvaluateExpiry()}>Ablauf prüfen</button>
        <button type="button" className="industrial-secondary-button" onClick={() => void onExportIcal()}>Fristen als iCal exportieren</button>
      </div>
      <p className="industrial-muted">Ablaufwarnungen werden im bestehenden Fristenmodul geführt und erscheinen dort mit Ampellogik.</p>
    </section>
  );
}
