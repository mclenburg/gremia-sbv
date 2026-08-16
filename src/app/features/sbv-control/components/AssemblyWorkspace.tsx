import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
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
        <div className="sbv-control-section-heading">
          <h3 id="assembly-plan-heading">Planung und Vorbereitung</h3>
          <p>Termin, Einladung, Barrierefreiheit und Unterlagen für die Jahresversammlung.</p>
        </div>
        <div className="industrial-form-grid">
          <label><span>Termin</span><input className="industrial-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label><span>Ort / Format</span><input className="industrial-input" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label><span>Einladung versandt am</span><input className="industrial-input" type="date" value={invitationAt} onChange={(event) => setInvitationAt(event.target.value)} /></label>
          <label><span>Arbeitgeberbericht</span><select className="industrial-select" value={report} onChange={(event) => setReport(event.target.value as EmployerReportStatus)}><option value="not_requested">nicht angefordert</option><option value="requested">angefordert</option><option value="promised">zugesagt</option><option value="completed">erfolgt</option><option value="not_completed">nicht erfolgt</option></select></label>
          <label><span>Barrierefreiheitscheck</span><select className="industrial-select" value={accessibility} onChange={(event) => setAccessibility(event.target.value)}><option value="open">offen</option><option value="checked">geprüft</option><option value="action_needed">Maßnahmen offen</option></select></label>
          <label><span>Präsentation / Unterlagen</span><select className="industrial-select" value={materials} onChange={(event) => setMaterials(event.target.value)}><option value="open">offen</option><option value="in_progress">in Arbeit</option><option value="ready">bereit</option></select></label>
        </div>
        <label><span>Tagesordnung</span><textarea className="industrial-textarea" value={agenda} onChange={(event) => setAgenda(event.target.value)} /></label>
        <div className="industrial-action-row sbv-control-action-row">
          {existing ? <IndustrialButton variant="secondary" disabled={!scheduledAt} onClick={() => void save('held')}>Durchgeführt dokumentieren</IndustrialButton> : null}
          <IndustrialButton onClick={() => void save(scheduledAt && invitationAt ? 'ready' : 'draft')}>Speichern</IndustrialButton>
        </div>
      </section>

      <section className="sbv-control-section" aria-labelledby="assembly-followup-heading">
        <div className="sbv-control-section-heading">
          <h3 id="assembly-followup-heading">Ergebnis und Nachbereitung</h3>
          <p>Eigenes Ergebnisprotokoll, Folgeaufgaben und erzeugbare Unterlagen.</p>
        </div>
        <label><span>SBV-Ergebnisprotokoll / Maßnahmen</span><textarea className="industrial-textarea" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
        {existing ? <>
          <div className="industrial-form-grid sbv-control-inline-action-grid">
            <label><span>Folgeaufgabe / Wiedervorlage</span><input className="industrial-input" type="date" value={followUpDueAt} onChange={(event) => setFollowUpDueAt(event.target.value)} /></label>
            <IndustrialButton variant="secondary" disabled={!followUpDueAt} onClick={() => void onCreateFollowUp(existing.id, followUpDueAt)}>Wiedervorlage anlegen</IndustrialButton>
          </div>
          <div className="industrial-action-row sbv-control-action-row" aria-label="Dokumente erzeugen">
            {(['invitation', 'agenda', 'activity_report_draft', 'result_minutes'] as AssemblyDocumentKind[]).map((kind) => (
              <IndustrialButton key={kind} variant="secondary" onClick={() => void onGenerateDocument(existing.id, kind)}>
                {kind === 'invitation' ? 'Einladung' : kind === 'agenda' ? 'Tagesordnung' : kind === 'activity_report_draft' ? 'Tätigkeitsbericht' : 'Ergebnisprotokoll'}
              </IndustrialButton>
            ))}
          </div>
        </> : <p className="industrial-meta">Nach dem ersten Speichern stehen Wiedervorlagen und Dokumente zur Verfügung.</p>}
      </section>
    </SbvControlPanel>
  );
}
