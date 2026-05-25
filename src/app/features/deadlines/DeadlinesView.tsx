import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { GhostButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import {
  CheckboxField,
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextInput
} from '../../shared/components/IndustrialForm';
import {
  IndustrialWarningPanel,
  WorkbenchPage
} from '../../shared/components/WorkbenchLayout';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseMeasureRecord } from '../../core/models/case-measure.model';
import type { CreateDeadlineInput, DeadlineListFilters, DeadlineProcessType, DeadlineRecord, DeadlineSeverity, DeadlineType } from '../../core/models/deadline.model';
import { DeadlineListView } from './DeadlineListView';
import { DeadlineIcalExportPanel } from './DeadlineIcalExportPanel';
import type { IcalExportPrivacyLevel } from './useIcalExportHandlers';
import { formatCaseLabel, fromDateTimeLocalValue, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';

const processOptions: Array<{ value: DeadlineProcessType; label: string }> = [
  { value: 'case', label: 'Fall' },
  { value: 'bem', label: 'BEM' },
  { value: 'prevention', label: 'Prävention' },
  { value: 'equalization', label: 'Gleichstellung' },
  { value: 'termination_hearing', label: 'Kündigungsanhörung' },
  { value: 'gdb', label: 'GdB' }
];

const deadlineTypeOptions: Array<{ value: DeadlineType; label: string }> = [
  { value: 'follow_up', label: 'Wiedervorlage' },
  { value: 'legal_deadline', label: 'Rechtsfrist' },
  { value: 'workflow_step', label: 'Workflow-Schritt' },
  { value: 'appointment', label: 'Termin' },
  { value: 'warning', label: 'Warnung' }
];

const severityOptions: Array<{ value: DeadlineSeverity; label: string }> = [
  { value: 'normal', label: 'normal' },
  { value: 'important', label: 'wichtig' },
  { value: 'critical', label: 'kritisch' },
  { value: 'fatal', label: 'fatal' }
];

export function DeadlinesView({
  cases,
  deadlines,
  measures = [],
  onCreateDeadline,
  onEditDeadline,
  onCompleteDeadline,
  onExportIcal
}: {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  measures?: CaseMeasureRecord[];
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
  onExportIcal: (privacyLevel: IcalExportPrivacyLevel, filters: DeadlineListFilters) => Promise<void>;
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
      setTitle('');
      setDueAt('');
      setLegalBasis('');
      setDescription('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frist konnte nicht angelegt werden.');
    }
  }

  return (
    <WorkbenchPage
      title="Fristen & Wiedervorlagen"
      kicker="48h-Regel aktiv"
      description="Echte Fristen gehören an eine Fallakte. Freie Einträge sind nur als einfache Wiedervorlagen ohne Rechtsfrist vorgesehen."
    >
      <ModuleFeedback items={[error ? { id: 'deadlines-error', tone: 'warning', message: error } : null]} />
      <IndustrialWarningPanel>
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
        <p>
          Fachregel: Rechtliche Fristen, BEM-Schritte, Präventionsvorgänge, Gleichstellungsverfahren und Kündigungsanhörungen werden immer einem Fall zugeordnet. Ohne Fallbezug erlaubt Gremia.SBV nur eine freie Wiedervorlage.
        </p>
      </IndustrialWarningPanel>

      <form onSubmit={addDeadline} className="industrial-form industrial-form-deadline" noValidate>
        <FormSection>
          <div className="industrial-form-grid">
            <TextInput label="Titel" value={title} onValueChange={setTitle} placeholder="z. B. Stellungnahme SBV" required />
            <SelectInput
              label="Fallbezug"
              value={caseId}
              disabled={freeFollowUp}
              onValueChange={setCaseId}
              options={[{ value: '', label: 'Fall auswählen' }, ...cases.map((record) => ({ value: record.id, label: formatCaseLabel(record) }))]}
            />
            <DateTimeInput label="Fällig am" value={dueAt} onValueChange={setDueAt} required />
            <SelectInput label="Prozess" value={processType} disabled={freeFollowUp} onValueChange={(value) => setProcessType(value as DeadlineProcessType)} options={processOptions} />
            <SelectInput label="Typ" value={deadlineType} disabled={freeFollowUp} onValueChange={(value) => setDeadlineType(value as DeadlineType)} options={deadlineTypeOptions} />
            <SelectInput label="Stufe" value={severity} onValueChange={(value) => setSeverity(value as DeadlineSeverity)} options={severityOptions} />
            <TextInput label="Rechtsbezug" value={legalBasis} disabled={freeFollowUp} onValueChange={setLegalBasis} placeholder="optional" />
            <TextInput label="Notiz" value={description} onValueChange={setDescription} placeholder="optional" />
            <CheckboxField label="freie Wiedervorlage ohne Fallbezug" checked={freeFollowUp} onCheckedChange={setFreeFollowUp} />
          </div>
        </FormSection>
        <FormActions>
          <IndustrialButton type="submit">
            <Plus className="h-4 w-4" />
            Frist anlegen
          </IndustrialButton>
        </FormActions>
      </form>
      <DeadlineIcalExportPanel onExport={onExportIcal} />

      <DeadlineListView deadlines={deadlines} cases={cases} measures={measures} onEdit={onEditDeadline} onComplete={onCompleteDeadline} />
    </WorkbenchPage>
  );
}

export function DeadlineEditor({
  deadline,
  cases,
  onClose,
  onSave,
  onComplete
}: {
  deadline: DeadlineRecord;
  cases: CaseRecord[];
  onClose: () => void;
  onSave: (id: string, input: { title: string; dueAt: string; severity: DeadlineSeverity; description?: string; legalBasis?: string; reason: string }) => Promise<void>;
  onComplete: (deadline: DeadlineRecord) => Promise<void>;
}) {
  const [title, setTitle] = useState(deadline.title);
  const [dueAt, setDueAt] = useState(toDateTimeLocalValue(deadline.dueAt));
  const [severity, setSeverity] = useState<DeadlineSeverity>(deadline.severity);
  const [description, setDescription] = useState(deadline.description ?? '');
  const [legalBasis, setLegalBasis] = useState(deadline.legalBasis ?? '');
  const [reason, setReason] = useState('Bearbeitung aus Dashboard/Fristenregister');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !dueAt) {
      setError('Bitte Titel und Fälligkeitsdatum erfassen.');
      return;
    }
    try {
      await onSave(deadline.id, {
        title: title.trim(),
        dueAt: fromDateTimeLocalValue(dueAt),
        severity,
        description: description.trim() || undefined,
        legalBasis: legalBasis.trim() || undefined,
        reason: reason.trim() || 'Frist bearbeitet'
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frist konnte nicht gespeichert werden.');
    }
  }

  return (
    <IndustrialModal
      title={deadline.title}
      kicker="Frist bearbeiten"
      description={deadline.caseId ? `Fallbezug: ${cases.find((item: CaseRecord) => item.id === deadline.caseId)?.caseNumber ?? 'nicht auflösbar'}` : 'Freie Wiedervorlage ohne Fallbezug'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="industrial-settings-form mt-5" noValidate>
        <FormSection>
          <TextInput label="Titel" value={title} onValueChange={setTitle} required />
          <DateTimeInput label="Fällig am" value={dueAt} onValueChange={setDueAt} required />
          <SelectInput label="Stufe" value={severity} onValueChange={(value) => setSeverity(value as DeadlineSeverity)} options={severityOptions} />
          <TextInput label="Rechtsbezug" value={legalBasis} onValueChange={setLegalBasis} />
          <TextInput label="Notiz" value={description} onValueChange={setDescription} />
          <TextInput label="Änderungsgrund / Audit" value={reason} onValueChange={setReason} />
        </FormSection>
        {error ? <ModuleFeedback items={[{ id: 'deadline-editor-error', tone: 'warning', message: error }]} /> : null}
        <FormActions>
          <GhostButton onClick={onClose}>Abbrechen</GhostButton>
          <ToolbarButton onClick={() => void onComplete(deadline)}>Als erledigt markieren</ToolbarButton>
          <IndustrialButton type="submit">Speichern</IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
