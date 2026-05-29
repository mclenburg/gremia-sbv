import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import { GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { FormActions, FormSection, SelectInput } from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import type { DeadlineListFilters } from '../../core/models/deadline.model';
import type { IcalExportPrivacyLevel } from './useIcalExportHandlers';
import { filtersForDeadlineExportScope } from './deadlineViewLogic';
import { icalPrivacyLevelHelp, icalPrivacyLevelLabels, icalScopeLabels, type DeadlineExportScope } from './deadlineLabels';

export function DeadlineIcalExportModal({
  onExport,
  onClose
}: {
  onExport: (privacyLevel: IcalExportPrivacyLevel, filters: DeadlineListFilters) => Promise<void>;
  onClose: () => void;
}) {
  const announce = useAnnouncer();
  const [privacyLevel, setPrivacyLevel] = useState<IcalExportPrivacyLevel>('process_type');
  const [scope, setScope] = useState<DeadlineExportScope>('open');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function exportIcal() {
    setError('');
    setSuccess('');
    try {
      await onExport(privacyLevel, filtersForDeadlineExportScope(scope));
      const message = 'Fristenexport wurde erstellt.';
      setSuccess(message);
      announce(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'iCal-Export konnte nicht erstellt werden.';
      setError(message);
      announce(message);
    }
  }

  return (
    <IndustrialModal
      title="Kalenderdatei exportieren"
      kicker="Datensparsamer iCal-Export"
      description="Gremia.SBV erzeugt Kalendereinträge ohne Diagnosen, Personennamen oder Fallinhalte. Wähle bewusst, wie sprechend die Kalendertitel sein dürfen."
      onClose={onClose}
      dataE2e="deadline-ical-export-modal"
    >
      <div className="industrial-form mt-5" data-e2e="deadline-ical-export-panel">
        <FormSection title="Export-Einstellungen">
          <div className="industrial-form-grid industrial-form-grid-2">
            <SelectInput
              label="Kalendertitel"
              data-e2e="deadline-ical-privacy-level"
              value={privacyLevel}
              onValueChange={(value) => setPrivacyLevel(value as IcalExportPrivacyLevel)}
              helpText={icalPrivacyLevelHelp[privacyLevel]}
              options={[
                { value: 'process_type', label: icalPrivacyLevelLabels.process_type },
                { value: 'privacy_first', label: icalPrivacyLevelLabels.privacy_first },
                { value: 'case_reference', label: icalPrivacyLevelLabels.case_reference },
                { value: 'details', label: icalPrivacyLevelLabels.details }
              ]}
            />
            <SelectInput
              label="Welche Fristen exportieren?"
              data-e2e="deadline-ical-scope"
              value={scope}
              onValueChange={(value) => setScope(value as DeadlineExportScope)}
              options={[
                { value: 'open', label: icalScopeLabels.open },
                { value: 'dashboard', label: icalScopeLabels.dashboard },
                { value: 'all', label: icalScopeLabels.all }
              ]}
            />
          </div>
          <div className="industrial-inline-summary" data-e2e="deadline-ical-privacy-summary">
            <span className="industrial-kicker">Aktueller Kalendertitel</span>
            <strong>{icalPrivacyLevelLabels[privacyLevel]}</strong>
            <span>{icalPrivacyLevelHelp[privacyLevel]}</span>
          </div>
        </FormSection>
        {error ? <ModuleFeedback items={[{ id: 'ical-export-error', tone: 'warning', message: error }]} /> : null}
        {success ? <ModuleFeedback items={[{ id: 'ical-export-success', tone: 'success', message: success }]} /> : null}
        <FormActions>
          <GhostButton onClick={onClose}>Schließen</GhostButton>
          <IndustrialButton onClick={() => void exportIcal()} data-e2e="export-deadlines-ical">
            <Download className="h-4 w-4" aria-hidden="true" />
            iCal-Datei erzeugen
          </IndustrialButton>
        </FormActions>
      </div>
    </IndustrialModal>
  );
}
