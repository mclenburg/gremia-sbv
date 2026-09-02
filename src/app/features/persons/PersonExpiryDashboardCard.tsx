import { CalendarCheck, Loader2 } from 'lucide-react';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { ToolbarButton } from '../../shared/components/IndustrialButton';

function isExpiringSoon(person: ProtectedPersonRecord): boolean {
  return person.lifecycleState === 'expiring_soon';
}

function needsReview(person: ProtectedPersonRecord): boolean {
  return person.lifecycleState === 'expired_review_required';
}

export function PersonExpiryDashboardCard({
  persons,
  evaluating,
  lastEvaluationMessage,
  onEvaluateExpiry,
  onExportIcal
}: {
  persons: ProtectedPersonRecord[];
  evaluating: boolean;
  lastEvaluationMessage?: string;
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
        <ToolbarButton type="button" disabled={evaluating} aria-busy={evaluating} onClick={() => void onEvaluateExpiry()}>{evaluating && <Loader2 className="h-4 w-4 spin" aria-hidden="true" />}{evaluating ? 'Prüfung läuft …' : 'Ablauf prüfen'}</ToolbarButton>
        <ToolbarButton type="button" onClick={() => void onExportIcal()}>Fristen als iCal exportieren</ToolbarButton>
      </div>
      {lastEvaluationMessage && <p className="industrial-meta" role="status">{lastEvaluationMessage}</p>}
      <p className="industrial-muted">Ablaufwarnungen werden im bestehenden Fristenmodul geführt und erscheinen dort mit Ampellogik.</p>
    </section>
  );
}
