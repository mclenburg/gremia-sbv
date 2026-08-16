import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { DateInput, DateTimeInput, SelectInput, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import type { EmployerReportStatus, SbvAssemblyRecord } from '../../../core/models/sbv-office-workflow.model';
import { SbvControlPanel } from './SbvControlPanel';

type AssemblyDocumentKind = 'invitation' | 'agenda' | 'activity_report_draft' | 'result_minutes';

export function AssemblyWorkspace({ records, onSave, onGenerateDocument, onCreateFollowUp }: {
  records: SbvAssemblyRecord[];
  onSave: (input: { id?: string; year: number; scheduledAt?: string; locationOrMode?: string; invitationAt?: string; agenda?: string; accessibilityCheckStatus?: string; materialsStatus?: string; employerReportStatus: EmployerReportStatus; minutes?: string; status: string }) => Promise<void>;
  onGenerateDocument: (id: string, kind: AssemblyDocumentKind) => Promise<void>;
  onCreateFollowUp: (id: string, dueAt: string) => Promise<void>;
}) {
  const year = new Date().getFullYear();
  const existing = records.find((record) => record.year === year);
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [invitationAt, setInvitationAt] = useState('');
  const [agenda, setAgenda] = useState('');
  const [accessibility, setAccessibility] = useState('open');
  const [materials, setMaterials] = useState('open');
  const [minutes, setMinutes] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [report, setReport] = useState<EmployerReportStatus>('not_requested');

  useEffect(() => {
    setScheduledAt(existing?.scheduledAt?.slice(0, 16) ?? '');
    setLocation(existing?.locationOrMode ?? '');
    setInvitationAt(existing?.invitationAt?.slice(0, 10) ?? '');
    setAgenda(existing?.agenda ?? '');
    setAccessibility(existing?.accessibilityCheckStatus ?? 'open');
    setMaterials(existing?.materialsStatus ?? 'open');
    setMinutes(existing?.minutes ?? '');
    setReport(existing?.employerReportStatus ?? 'not_requested');
  }, [existing]);

  const save = (status: string) => onSave({
    id: existing?.id,
    year,
    scheduledAt: scheduledAt || undefined,
    locationOrMode: location || undefined,
    invitationAt: invitationAt || undefined,
    agenda,
    accessibilityCheckStatus: accessibility,
    materialsStatus: materials,
    employerReportStatus: report,
    minutes,
    status,
  });

  return (
    <SbvControlPanel
      kicker="Jahresworkflow"
      title={`Schwerbehindertenversammlung ${year}`}
      actions={<IndustrialHelpButton helpId="sbvOffice.assembly" label="Hilfe zur Schwerbehindertenversammlung öffnen" />}
    >
      <section className="sbv-control-section" aria-labelledby="assembly-plan-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="assembly-plan-heading">Planung und Vorbereitung</h3>
            <p>Termin, Einladung, Barrierefreiheit und Unterlagen für die Jahresversammlung.</p>
          </div>
          <div className="industrial-action-row">
            {existing ? <IndustrialButton variant="secondary" disabled={!scheduledAt} onClick={() => void save('held')}>Durchgeführt dokumentieren</IndustrialButton> : null}
            <IndustrialButton onClick={() => void save(scheduledAt && invitationAt ? 'ready' : 'draft')}>Speichern</IndustrialButton>
          </div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-3 sbv-assembly-plan-grid">
          <DateTimeInput label="Termin" value={scheduledAt} onValueChange={setScheduledAt} />
          <TextInput label="Ort / Format" value={location} onValueChange={setLocation} />
          <DateInput label="Einladung versandt am" value={invitationAt} onValueChange={setInvitationAt} />
          <SelectInput label="Arbeitgeberbericht" value={report} onValueChange={(value) => setReport(value as EmployerReportStatus)} options={[{ value: 'not_requested', label: 'nicht angefordert' }, { value: 'requested', label: 'angefordert' }, { value: 'promised', label: 'zugesagt' }, { value: 'completed', label: 'erfolgt' }, { value: 'not_completed', label: 'nicht erfolgt' }]} />
          <SelectInput label="Barrierefreiheitscheck" value={accessibility} onValueChange={setAccessibility} options={[{ value: 'open', label: 'offen' }, { value: 'checked', label: 'geprüft' }, { value: 'action_needed', label: 'Maßnahmen offen' }]} />
          <SelectInput label="Präsentation / Unterlagen" value={materials} onValueChange={setMaterials} options={[{ value: 'open', label: 'offen' }, { value: 'in_progress', label: 'in Arbeit' }, { value: 'ready', label: 'bereit' }]} />
        </div>
        <TextareaInput label="Tagesordnung" value={agenda} onValueChange={setAgenda} wide />
      </section>

      <section className="sbv-control-section" aria-labelledby="assembly-followup-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="assembly-followup-heading">Ergebnis und Nachbereitung</h3>
            <p>Eigenes Ergebnisprotokoll, Folgeaufgaben und erzeugbare Unterlagen.</p>
          </div>
          {existing ? (
            <div className="industrial-action-row" aria-label="Dokumente erzeugen">
              {(['invitation', 'agenda', 'activity_report_draft', 'result_minutes'] as AssemblyDocumentKind[]).map((kind) => (
                <IndustrialButton key={kind} variant="secondary" onClick={() => void onGenerateDocument(existing.id, kind)}>
                  {kind === 'invitation' ? 'Einladung' : kind === 'agenda' ? 'Tagesordnung' : kind === 'activity_report_draft' ? 'Tätigkeitsbericht' : 'Ergebnisprotokoll'}
                </IndustrialButton>
              ))}
            </div>
          ) : null}
        </div>
        <TextareaInput label="SBV-Ergebnisprotokoll / Maßnahmen" value={minutes} onValueChange={setMinutes} wide />
        {existing ? (
          <div className="industrial-form-grid industrial-form-grid-2 sbv-control-followup-grid">
            <DateInput label="Folgeaufgabe / Wiedervorlage" value={followUpDueAt} onValueChange={setFollowUpDueAt} />
            <div className="industrial-action-row sbv-control-field-action">
              <IndustrialButton variant="secondary" disabled={!followUpDueAt} onClick={() => void onCreateFollowUp(existing.id, followUpDueAt)}>Wiedervorlage anlegen</IndustrialButton>
            </div>
          </div>
        ) : <p className="industrial-meta">Nach dem ersten Speichern stehen Wiedervorlagen und Dokumente zur Verfügung.</p>}
      </section>
    </SbvControlPanel>
  );
}
