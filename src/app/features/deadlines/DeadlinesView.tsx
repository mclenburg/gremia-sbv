import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarPlus, Download } from 'lucide-react';
import { GhostButton, IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import {
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextInput
} from '../../shared/components/IndustrialForm';
import {
  WorkbenchPage,
  WorkbenchSummary
} from '../../shared/components/WorkbenchLayout';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseMeasureRecord } from '../../core/models/case-measure.model';
import type { CreateDeadlineInput, DeadlineListFilters, DeadlineRecord, DeadlineSeverity } from '../../core/models/deadline.model';
import { DeadlineListView } from './DeadlineListView';
import { DeadlineIcalExportModal } from './DeadlineIcalExportPanel';
import { DeadlineCreateModal } from './DeadlineCreateModal';
import type { IcalExportPrivacyLevel } from './useIcalExportHandlers';
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '../cases/caseWorkbenchFormat';
import { resolveDeadlineWorkSummary } from './deadlineViewLogic';
import { deadlineSeverityLabels } from './deadlineLabels';


const severityOptions: Array<{ value: DeadlineSeverity; label: string }> = [
  { value: 'normal', label: deadlineSeverityLabels.normal },
  { value: 'important', label: deadlineSeverityLabels.important },
  { value: 'critical', label: deadlineSeverityLabels.critical },
  { value: 'fatal', label: deadlineSeverityLabels.fatal }
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const summary = resolveDeadlineWorkSummary(deadlines);

  return (
    <WorkbenchPage
      title="Fristen & Wiedervorlagen"
      kicker="48h-Regel aktiv"
      description="Übersicht, Priorisierung und Kontrolle zeitkritischer SBV-Arbeit. Rechtliche Fristen werden einem Fall oder Verfahren zugeordnet."
      actions={
        <>
          <ToolbarButton onClick={() => setExportModalOpen(true)} data-e2e="open-deadline-ical-export">
            <Download className="h-4 w-4" aria-hidden="true" />
            Kalender exportieren
          </ToolbarButton>
          <IndustrialButton onClick={() => setCreateModalOpen(true)} data-e2e="open-deadline-create">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Frist anlegen
          </IndustrialButton>
        </>
      }
    >
      <WorkbenchSummary
        ariaLabel="Fristenübersicht"
        items={[
          { label: 'überfällig', value: summary.overdueCount, tone: summary.overdueCount > 0 ? 'danger' : 'default' },
          { label: 'kritisch', value: summary.criticalCount, tone: summary.criticalCount > 0 ? 'danger' : 'default' },
          { label: 'innerhalb 48h', value: summary.dueSoonCount, tone: summary.dueSoonCount > 0 ? 'warning' : 'default' },
          { label: 'offen gesamt', value: summary.openCount, tone: 'default' }
        ]}
      />

      <p className="industrial-inline-rule">
        Fachregel: Ohne Fallbezug kann nur eine freie Wiedervorlage angelegt werden. Rechtliche Fristen und Verfahrensschritte werden im Erfassungsdialog validiert.
      </p>

      <DeadlineListView deadlines={deadlines} cases={cases} measures={measures} onEdit={onEditDeadline} onComplete={onCompleteDeadline} />

      {createModalOpen ? (
        <DeadlineCreateModal cases={cases} onCreateDeadline={onCreateDeadline} onClose={() => setCreateModalOpen(false)} />
      ) : null}
      {exportModalOpen ? (
        <DeadlineIcalExportModal onExport={onExportIcal} onClose={() => setExportModalOpen(false)} />
      ) : null}
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
          <SelectInput label="Priorität" value={severity} onValueChange={(value) => setSeverity(value as DeadlineSeverity)} options={severityOptions} />
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
