import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import {
  CheckboxField,
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextareaInput,
  TextInput
} from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import type { CaseRecord } from '../../core/models/case.model';
import type { CreateDeadlineInput, DeadlineProcessType, DeadlineSeverity, DeadlineType } from '../../core/models/deadline.model';
import { formatCaseLabel, fromDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { deadlineProcessTypeLabels, deadlineSeverityLabels, deadlineTypeLabels } from './deadlineLabels';

const processOptions: Array<{ value: DeadlineProcessType; label: string }> = [
  { value: 'case', label: deadlineProcessTypeLabels.case },
  { value: 'bem', label: deadlineProcessTypeLabels.bem },
  { value: 'prevention', label: deadlineProcessTypeLabels.prevention },
  { value: 'equalization', label: deadlineProcessTypeLabels.equalization },
  { value: 'termination_hearing', label: deadlineProcessTypeLabels.termination_hearing },
  { value: 'gdb', label: deadlineProcessTypeLabels.gdb }
];

const deadlineTypeOptions: Array<{ value: DeadlineType; label: string }> = [
  { value: 'follow_up', label: deadlineTypeLabels.follow_up },
  { value: 'legal_deadline', label: deadlineTypeLabels.legal_deadline },
  { value: 'workflow_step', label: deadlineTypeLabels.workflow_step },
  { value: 'appointment', label: deadlineTypeLabels.appointment },
  { value: 'warning', label: deadlineTypeLabels.warning }
];

const severityOptions: Array<{ value: DeadlineSeverity; label: string }> = [
  { value: 'normal', label: deadlineSeverityLabels.normal },
  { value: 'important', label: deadlineSeverityLabels.important },
  { value: 'critical', label: deadlineSeverityLabels.critical },
  { value: 'fatal', label: deadlineSeverityLabels.fatal }
];

export function DeadlineCreateModal({
  cases,
  onCreateDeadline,
  onClose
}: {
  cases: CaseRecord[];
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [caseId, setCaseId] = useState('');
  const [freeFollowUp, setFreeFollowUp] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [severity, setSeverity] = useState<DeadlineSeverity>('important');
  const [processType, setProcessType] = useState<DeadlineProcessType>('case');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('follow_up');
  const [legalBasis, setLegalBasis] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  async function addDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!title.trim() || !dueAt) {
      setError('Bitte Titel und Fälligkeitsdatum erfassen.');
      return;
    }

    if (!freeFollowUp && !caseId) {
      setError('Bitte einen Fall auswählen. Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.');
      return;
    }

    try {
      await onCreateDeadline({
        title: title.trim(),
        caseId: freeFollowUp ? undefined : caseId,
        processType: freeFollowUp ? 'custom' : processType,
        deadlineType: freeFollowUp ? 'follow_up' : deadlineType,
        dueAt: fromDateTimeLocalValue(dueAt),
        severity,
        legalBasis: legalBasis.trim() || undefined,
        description: description.trim() || undefined,
        isLegalDeadline: !freeFollowUp && deadlineType === 'legal_deadline',
        calculationMode: 'manual'
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frist konnte nicht angelegt werden.');
    }
  }

  return (
    <IndustrialModal
      title="Frist oder Wiedervorlage anlegen"
      kicker="Fristenerfassung"
      description="Rechtliche Fristen und Verfahrensschritte werden einem Fall zugeordnet. Ohne Fallbezug ist nur eine freie Wiedervorlage möglich."
      onClose={onClose}
      wide
      dataE2e="deadline-create-modal"
    >
      <form onSubmit={addDeadline} className="industrial-settings-form mt-5" noValidate>
        <FormSection title="Fristdaten" description="Erfasse nur Informationen, die für die Fristensteuerung erforderlich sind.">
          <div className="industrial-form-grid industrial-form-grid-2">
            <TextInput label="Titel" value={title} onValueChange={setTitle} placeholder="z. B. Stellungnahme SBV" required />
            <DateTimeInput label="Fällig am" value={dueAt} onValueChange={setDueAt} required />
            <SelectInput
              label="Fallbezug"
              value={caseId}
              disabled={freeFollowUp}
              onValueChange={setCaseId}
              options={[{ value: '', label: 'Fall auswählen' }, ...cases.map((record) => ({ value: record.id, label: formatCaseLabel(record) }))]}
              helpText={freeFollowUp ? 'Freie Wiedervorlagen werden bewusst ohne Fallbezug angelegt.' : 'Rechtliche Fristen brauchen einen Fallbezug.'}
            />
            <SelectInput label="Vorgang" value={processType} disabled={freeFollowUp} onValueChange={(value) => setProcessType(value as DeadlineProcessType)} options={processOptions} />
            <SelectInput label="Fristenart" value={deadlineType} disabled={freeFollowUp} onValueChange={(value) => setDeadlineType(value as DeadlineType)} options={deadlineTypeOptions} />
            <SelectInput label="Priorität" value={severity} onValueChange={(value) => setSeverity(value as DeadlineSeverity)} options={severityOptions} />
            <TextInput label="Rechtsbezug" value={legalBasis} disabled={freeFollowUp} onValueChange={setLegalBasis} placeholder="optional" />
            <CheckboxField
              label="Freie Wiedervorlage ohne Fallbezug"
              checked={freeFollowUp}
              onCheckedChange={setFreeFollowUp}
              helpText="Nur für einfache Erinnerung ohne Rechtsfrist oder Verfahrensbindung nutzen."
            />
            <TextareaInput label="Notiz" value={description} onValueChange={setDescription} placeholder="optional" wide />
          </div>
        </FormSection>
        {error ? <ModuleFeedback items={[{ id: 'deadline-create-error', tone: 'warning', message: error }]} /> : null}
        <FormActions>
          <GhostButton onClick={onClose}>Abbrechen</GhostButton>
          <IndustrialButton type="submit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Frist anlegen
          </IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
