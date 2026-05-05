import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseMeasureRecord } from '../../core/models/case-measure.model';
import type { CreateDeadlineInput, DeadlineProcessType, DeadlineRecord, DeadlineSeverity, DeadlineType } from '../../core/models/deadline.model';
import { DeadlineListView } from './DeadlineListView';
import { formatCaseLabel, fromDateTimeLocalValue, toDateTimeLocalValue } from '../cases/caseWorkbenchFormat';

export function DeadlinesView({
  cases,
  deadlines,
  measures = [],
  onCreateDeadline,
  onEditDeadline,
  onCompleteDeadline
}: {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  measures?: CaseMeasureRecord[];
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
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
    <ModuleFrame
      title="Fristen & Wiedervorlagen"
      kicker="48h-Regel aktiv"
      description="Echte Fristen gehören an eine Fallakte. Freie Einträge sind nur als einfache Wiedervorlagen ohne Rechtsfrist vorgesehen."
    >
      <div className="industrial-alert">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
        <p>
          Fachregel: Rechtliche Fristen, BEM-Schritte, Präventionsvorgänge, Gleichstellungsverfahren und Kündigungsanhörungen werden immer einem Fall zugeordnet. Ohne Fallbezug erlaubt Gremia.SBV nur eine freie Wiedervorlage.
        </p>
      </div>

      <form onSubmit={addDeadline} className="industrial-form industrial-form-deadline">
        <label>
          <span>Titel</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z. B. Stellungnahme SBV" />
        </label>
        <label>
          <span>Fallbezug</span>
          <select value={caseId} disabled={freeFollowUp} onChange={(event) => setCaseId(event.target.value)}>
            <option value="">Fall auswählen</option>
            {cases.map((record) => <option key={record.id} value={record.id}>{formatCaseLabel(record)}</option>)}
          </select>
        </label>
        <label>
          <span>Fällig am</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <label>
          <span>Prozess</span>
          <select value={processType} disabled={freeFollowUp} onChange={(event) => setProcessType(event.target.value as DeadlineProcessType)}>
            <option value="case">Fall</option>
            <option value="bem">BEM</option>
            <option value="prevention">Prävention</option>
            <option value="equalization">Gleichstellung</option>
            <option value="termination_hearing">Kündigungsanhörung</option>
            <option value="gdb">GdB</option>
          </select>
        </label>
        <label>
          <span>Typ</span>
          <select value={deadlineType} disabled={freeFollowUp} onChange={(event) => setDeadlineType(event.target.value as DeadlineType)}>
            <option value="follow_up">Wiedervorlage</option>
            <option value="legal_deadline">Rechtsfrist</option>
            <option value="workflow_step">Workflow-Schritt</option>
            <option value="appointment">Termin</option>
            <option value="warning">Warnung</option>
          </select>
        </label>
        <label>
          <span>Stufe</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value as DeadlineSeverity)}>
            <option value="normal">normal</option>
            <option value="important">wichtig</option>
            <option value="critical">kritisch</option>
            <option value="fatal">fatal</option>
          </select>
        </label>
        <label>
          <span>Rechtsbezug</span>
          <input value={legalBasis} disabled={freeFollowUp} onChange={(event) => setLegalBasis(event.target.value)} placeholder="optional" />
        </label>
        <label>
          <span>Notiz</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="optional" />
        </label>
        <label className="industrial-checkbox-row">
          <input type="checkbox" checked={freeFollowUp} onChange={(event) => setFreeFollowUp(event.target.checked)} />
          <span>freie Wiedervorlage ohne Fallbezug</span>
        </label>
        <button type="submit" className="industrial-button">
          <Plus className="h-4 w-4" />
          Frist anlegen
        </button>
      </form>
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      <DeadlineListView deadlines={deadlines} cases={cases} measures={measures} onEdit={onEditDeadline} onComplete={onCompleteDeadline} />
    </ModuleFrame>
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
    <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
      <section className="industrial-modal">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Frist bearbeiten</p>
            <h2>{deadline.title}</h2>
            <p>{deadline.caseId ? `Fallbezug: ${cases.find((item: CaseRecord) => item.id === deadline.caseId)?.caseNumber ?? 'nicht auflösbar'}` : 'Freie Wiedervorlage ohne Fallbezug'}</p>
          </div>
        </div>

        <form onSubmit={submit} className="industrial-settings-form mt-5">
          <label>
            <span>Titel</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Fällig am</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <label>
            <span>Stufe</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as DeadlineSeverity)}>
              <option value="normal">normal</option>
              <option value="important">wichtig</option>
              <option value="critical">kritisch</option>
              <option value="fatal">fatal</option>
            </select>
          </label>
          <label>
            <span>Rechtsbezug</span>
            <input value={legalBasis} onChange={(event) => setLegalBasis(event.target.value)} />
          </label>
          <label>
            <span>Notiz</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <span>Änderungsgrund / Audit</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {error && <div className="industrial-message industrial-message-warning">{error}</div>}
          <div className="industrial-modal-actions">
            <button type="button" className="industrial-secondary-button" onClick={onClose}>Abbrechen</button>
            <button type="button" className="industrial-secondary-button" onClick={() => void onComplete(deadline)}>Als erledigt markieren</button>
            <button type="submit" className="industrial-button">Speichern</button>
          </div>
        </form>
      </section>
    </div>
  );
}
