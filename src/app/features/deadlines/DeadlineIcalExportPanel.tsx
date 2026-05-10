import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { DeadlineListFilters } from '../../core/models/deadline.model';
import type { IcalExportPrivacyLevel } from './useIcalExportHandlers';

type ExportScope = 'open' | 'dashboard' | 'all';

const PRIVACY_HELP: Record<IcalExportPrivacyLevel, string> = {
  privacy_first: 'Maximal anonym: generische Wiedervorlage ohne Fallbezug.',
  process_type: 'Standard: sprechender Prozesstyp ohne Personen- oder Fallinhalte.',
  case_reference: 'Zusätzlich technische Fallreferenz ohne Personennamen.',
  details: 'Nur bewusst nutzen: Detailtitel werden weiterhin auf Direktidentifikatoren geprüft.'
};

function filtersForScope(scope: ExportScope): DeadlineListFilters {
  if (scope === 'all') return {};
  if (scope === 'dashboard') return { status: ['open', 'overdue'], dashboardOnly: true };
  return { status: ['open', 'overdue'] };
}

export function DeadlineIcalExportPanel({ onExport }: { onExport: (privacyLevel: IcalExportPrivacyLevel, filters: DeadlineListFilters) => Promise<void> }) {
  const announce = useAnnouncer();
  const [privacyLevel, setPrivacyLevel] = useState<IcalExportPrivacyLevel>('process_type');
  const [scope, setScope] = useState<ExportScope>('open');
  const [error, setError] = useState('');

  async function exportIcal() {
    setError('');
    try {
      await onExport(privacyLevel, filtersForScope(scope));
      announce('Fristenexport wurde erstellt.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'iCal-Export konnte nicht erstellt werden.';
      setError(message);
      announce(message);
    }
  }

  return (
    <section className="industrial-panel industrial-ical-export" data-e2e="deadline-ical-export-panel" aria-labelledby="ical-export-title" aria-describedby="ical-export-desc">
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">iCal-Export</p>
          <h2 id="ical-export-title">Fristen datensparsam exportieren</h2>
          <p id="ical-export-desc">Standard ist process_type: echte Fristen mit sprechendem Prozesstitel, ohne Personen- oder Fallinhalte.</p>
        </div>
      </div>
      <div className="industrial-form industrial-form-deadline mt-4">
        <label>
          <span>Datenschutzstufe</span>
          <select data-e2e="deadline-ical-privacy-level" value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value as IcalExportPrivacyLevel)} aria-describedby="ical-privacy-help">
            <option value="process_type">process_type · Standard</option>
            <option value="privacy_first">privacy_first · maximal anonym</option>
            <option value="case_reference">case_reference · mit Fallreferenz</option>
            <option value="details">details · nur nach Prüfung</option>
          </select>
        </label>
        <label>
          <span>Umfang</span>
          <select data-e2e="deadline-ical-scope" value={scope} onChange={(event) => setScope(event.target.value as ExportScope)}>
            <option value="open">offene und überfällige Fristen</option>
            <option value="dashboard">nur Dashboard-relevante Fristen</option>
            <option value="all">alle Fristen</option>
          </select>
        </label>
        <button type="button" className="industrial-secondary-button" onClick={() => void exportIcal()} data-e2e="export-deadlines-ical">
          <Download className="h-4 w-4" aria-hidden="true" /> iCal exportieren
        </button>
      </div>
      <p id="ical-privacy-help" className="industrial-table-secondary">{PRIVACY_HELP[privacyLevel]}</p>
      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
    </section>
  );
}
