import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { ToolbarButton } from '../../shared/components/IndustrialButton';
import { SelectInput } from '../../shared/components/IndustrialForm';
import { IndustrialPanel } from '../../shared/components/WorkbenchLayout';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
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
    <IndustrialPanel
      className="industrial-ical-export"
      kicker="iCal-Export"
      title="Fristen datensparsam exportieren"
      description="Standard ist process_type: echte Fristen mit sprechendem Prozesstitel, ohne Personen- oder Fallinhalte."
      ariaLabel="iCal-Export"
    >
      <div className="industrial-form industrial-form-deadline mt-4" data-e2e="deadline-ical-export-panel">
        <SelectInput
          label="Datenschutzstufe"
          data-e2e="deadline-ical-privacy-level"
          value={privacyLevel}
          onValueChange={(value) => setPrivacyLevel(value as IcalExportPrivacyLevel)}
          helpText={PRIVACY_HELP[privacyLevel]}
          options={[
            { value: 'process_type', label: 'process_type · Standard' },
            { value: 'privacy_first', label: 'privacy_first · maximal anonym' },
            { value: 'case_reference', label: 'case_reference · mit Fallreferenz' },
            { value: 'details', label: 'details · nur nach Prüfung' }
          ]}
        />
        <SelectInput
          label="Umfang"
          data-e2e="deadline-ical-scope"
          value={scope}
          onValueChange={(value) => setScope(value as ExportScope)}
          options={[
            { value: 'open', label: 'offene und überfällige Fristen' },
            { value: 'dashboard', label: 'nur Dashboard-relevante Fristen' },
            { value: 'all', label: 'alle Fristen' }
          ]}
        />
        <ToolbarButton onClick={() => void exportIcal()} data-e2e="export-deadlines-ical">
          <Download className="h-4 w-4" aria-hidden="true" /> iCal exportieren
        </ToolbarButton>
      </div>
      {error ? <ModuleFeedback items={[{ id: 'ical-export-error', tone: 'warning', message: error }]} /> : null}
    </IndustrialPanel>
  );
}
