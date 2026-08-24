import type { ActivityJournalCategory } from '../../../domain/models/activity-journal.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import {
  CheckboxField,
  DateInput,
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextareaInput,
  TextInput,
} from '../../shared/components/IndustrialForm';
import { IndustrialWarningPanel } from '../../shared/components/WorkbenchLayout';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import type { useActivityJournal } from './hooks/useActivityJournal';

type ActivityJournalState = ReturnType<typeof useActivityJournal>;

export function ActivityJournalCreateDialog({
  journal,
  categoryOptions,
  timeModeOptions,
  onClose,
}: {
  journal: ActivityJournalState;
  categoryOptions: Array<{ value: ActivityJournalCategory; label: string }>;
  timeModeOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
}) {
  return <IndustrialModal title="Tätigkeit erfassen" kicker="Neuer Journaleintrag" onClose={onClose} wide>
    <FormSection kicker="Schnellerfassung" title="Tätigkeit erfassen">
      <div className="industrial-form-grid industrial-form-grid-auto">
        <TextInput label="Was wurde gemacht?" value={journal.form.title} required placeholder="z. B. Unterlagen für BEM-Gespräch geprüft" onValueChange={(title) => journal.setForm({ ...journal.form, title })} />
        <DateInput label="Datum" value={journal.form.entryDate} onValueChange={(entryDate) => journal.setForm({ ...journal.form, entryDate })} />
        <SelectInput label="Kategorie" value={journal.form.category} options={categoryOptions} onValueChange={(category) => journal.setForm({ ...journal.form, category: category as ActivityJournalCategory })} />
        <SelectInput label="Zeitmodus" value={journal.form.timeMode} options={timeModeOptions} onValueChange={(timeMode) => journal.setForm({ ...journal.form, timeMode: timeMode as typeof journal.form.timeMode })} />
        {journal.form.timeMode === 'duration' ? <TextInput label="Minuten" type="number" min={0} value={journal.form.durationMinutes} onValueChange={(durationMinutes) => journal.setForm({ ...journal.form, durationMinutes })} /> : null}
        {journal.form.timeMode === 'range' ? <>
          <DateTimeInput label="Start" value={journal.form.startedAt} onValueChange={(startedAt) => journal.setForm({ ...journal.form, startedAt })} />
          <DateTimeInput label="Ende" value={journal.form.endedAt} onValueChange={(endedAt) => journal.setForm({ ...journal.form, endedAt })} />
        </> : null}
        <TextareaInput label="Kurzbeschreibung / Kontext" value={journal.form.description} wide textCommandFieldId="activity-journal-description" helpId="activityJournal.textCommands" onValueChange={journal.updateDescription} />
        <TextareaInput label="Ergebnis / nächster Schritt" value={journal.form.resultNote} wide textCommandFieldId="activity-journal-result" onValueChange={journal.updateResultNote} />
        {journal.timeSuggestion ? <IndustrialWarningPanel className="industrial-field-wide">
          <strong>/zeit-Vorschlag</strong><p>{journal.timeSuggestion.label}</p>
          <div className="industrial-action-row mt-2"><ToolbarButton onClick={journal.acceptTimeSuggestion}>Übernehmen</ToolbarButton><ToolbarButton onClick={journal.dismissTimeSuggestion}>Verwerfen</ToolbarButton></div>
        </IndustrialWarningPanel> : null}
        <DateInput label="Wiedervorlage optional" value={journal.form.followUpDueAt} onValueChange={(followUpDueAt) => journal.setForm({ ...journal.form, followUpDueAt, status: followUpDueAt ? 'follow_up_open' : journal.form.status })} />
        <CheckboxField label="Außerhalb der regulären Arbeitszeit angefallen" checked={journal.form.performedOutsideContractWorkTime} onCheckedChange={(performedOutsideContractWorkTime) => journal.setForm({ ...journal.form, performedOutsideContractWorkTime })} />
      </div>
      <FormActions align="end"><IndustrialButton loading={journal.busy} disabled={!journal.form.title.trim()} onClick={() => void journal.saveEntry().then((saved) => { if (saved) onClose(); })}>Speichern</IndustrialButton></FormActions>
    </FormSection>
  </IndustrialModal>;
}
