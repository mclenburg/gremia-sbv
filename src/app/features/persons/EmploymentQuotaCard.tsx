import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { calculateEmploymentQuota } from '../../../domain/persons/employmentQuota';
import { legalToday } from '../../../domain/time/legalTime';
import { WorkbenchSummary } from '../../shared/components/WorkbenchLayout';

export function EmploymentQuotaCard({
  workplaces,
  persons,
  today = legalToday(),
}: {
  workplaces: number | null;
  persons: readonly ProtectedPersonRecord[];
  today?: string;
}) {
  if (workplaces === null) return null;
  const snapshot = calculateEmploymentQuota(workplaces, persons, today);
  const statusText = snapshot.status === 'no_obligation'
    ? 'Für weniger als 20 maßgebliche Arbeitsplätze besteht keine Beschäftigungspflicht nach § 154 SGB IX.'
    : snapshot.status === 'recorded_target_met'
      ? 'Nach den erfassten Personen ist die aktuelle Sollzahl erreicht.'
      : `Nach den erfassten Personen fehlen aktuell ${snapshot.openPlaces} anrechenbare ${snapshot.openPlaces === 1 ? 'Person' : 'Personen'}.`;

  return (
    <section className="industrial-panel" aria-labelledby="employment-quota-heading">
      <div className="industrial-panel-heading">
        <div>
          <p className="industrial-kicker">Aktuelle Orientierung</p>
          <h2 id="employment-quota-heading">Beschäftigungsquote</h2>
        </div>
      </div>
      <WorkbenchSummary ariaLabel="Beschäftigungsquote Kennzahlen" items={[
        { label: 'Maßgebliche Arbeitsplätze', value: snapshot.workplaces },
        { label: 'Pflichtplätze', value: snapshot.requiredPlaces },
        { label: 'Erfasst anrechenbar', value: snapshot.recordedPersons, tone: 'success' },
        { label: 'Offen', value: snapshot.openPlaces, tone: snapshot.openPlaces > 0 ? 'warning' : 'default' },
      ]} />
      <p className="industrial-meta" role="status">{statusText}</p>
      <p className="industrial-muted">Erfasste Quote: {snapshot.recordedRatePercent === null ? '–' : `${snapshot.recordedRatePercent.toLocaleString('de-DE')} %`}. Momentaufnahme nach §§ 154, 157 SGB IX; Jahresdurchschnitt, Teilzeit-Ausnahmen und Mehrfachanrechnungen sind nicht berücksichtigt. Keine amtliche Feststellung.</p>
    </section>
  );
}
