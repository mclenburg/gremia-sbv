import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import type { CaseRecord } from '../../../core/models/case.model';
import type { ComplaintAssessment, ComplaintWorkflowRecord, QuickCaseTemplate, SaveComplaintWorkflowInput } from '../../../core/models/sbv-office-workflow.model';
import { SbvControlPanel } from './SbvControlPanel';

export function ComplaintsWorkspace({ cases, records, templates, onSave, onCreateQuickNote }: {
  cases: CaseRecord[];
  records: ComplaintWorkflowRecord[];
  templates: QuickCaseTemplate[];
  onSave: (input: SaveComplaintWorkflowInput) => Promise<void>;
  onCreateQuickNote: (caseId: string, template: QuickCaseTemplate) => Promise<void>;
}) {
  const [caseId, setCaseId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [assessment, setAssessment] = useState<ComplaintAssessment>('open');
  const [negotiationStatus, setNegotiationStatus] = useState('');
  const [result, setResult] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const current = records.find((record) => record.id === selectedId);
  const template = templates.find((item) => item.key === selectedTemplate);

  useEffect(() => {
    setAssessment(current?.assessmentStatus ?? 'open');
    setNegotiationStatus(current?.negotiationStatus ?? '');
    setResult(current?.resultSummary ?? '');
  }, [current]);

  return (
    <SbvControlPanel
      kicker="Fallakte"
      title="Anregungen und Beschwerden"
      actions={<IndustrialHelpButton helpId="sbvOffice.complaints" label="Hilfe zu Beschwerden öffnen" />}
    >
      <section className="sbv-control-section" aria-labelledby="complaint-start-heading">
        <div className="sbv-control-section-heading">
          <h3 id="complaint-start-heading">Beschwerdevorgang anlegen</h3>
          <p>Der Workflow bleibt an eine Fallakte gebunden; sensible Inhalte gehören weiterhin in die Fallakte.</p>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Fallakte</span><select className="industrial-select" value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Auswählen …</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} · {item.displayName}</option>)}</select></label>
          <IndustrialButton disabled={!caseId} onClick={() => void onSave({ caseId, receivedAt: new Date().toISOString(), assessmentStatus: 'open' })}>Beschwerdeworkflow starten</IndustrialButton>
        </div>
      </section>

      <section className="sbv-control-section" aria-labelledby="complaint-edit-heading">
        <div className="sbv-control-section-heading">
          <h3 id="complaint-edit-heading">Beschwerdevorgang bearbeiten</h3>
          <p>Prüfung, Verhandlung und Ergebnis aus Sicht der SBV dokumentieren.</p>
        </div>
        <label><span>Beschwerdevorgang</span><select className="industrial-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Auswählen …</option>{records.map((record) => <option key={record.id} value={record.id}>{record.receivedAt.slice(0, 10)} · {record.assessmentStatus}</option>)}</select></label>
        {current ? <>
          <div className="industrial-form-grid">
            <label><span>Prüfung</span><select className="industrial-select" value={assessment} onChange={(event) => setAssessment(event.target.value as ComplaintAssessment)}><option value="open">offen</option><option value="justified">berechtigt</option><option value="unclear">unklar</option><option value="unjustified">unberechtigt</option></select></label>
            <label><span>Verhandlung / Sachstand</span><input className="industrial-input" value={negotiationStatus} onChange={(event) => setNegotiationStatus(event.target.value)} /></label>
          </div>
          <label><span>Ergebnis</span><textarea className="industrial-textarea" value={result} onChange={(event) => setResult(event.target.value)} /></label>
          <div className="industrial-action-row sbv-control-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onSave({ ...current, assessmentStatus: assessment, employerContactedAt: new Date().toISOString(), negotiationStatus, resultSummary: result, status: 'in_progress' })}>Arbeitgeberkontakt dokumentieren</IndustrialButton>
            <IndustrialButton onClick={() => void onSave({ ...current, assessmentStatus: assessment, negotiationStatus, resultSummary: result, status: result.trim() ? 'closed' : 'in_progress' })}>Beschwerdevorgang speichern</IndustrialButton>
          </div>
        </> : <p className="industrial-meta">Wähle einen bestehenden Vorgang, um Prüfung und Ergebnis zu bearbeiten.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="complaint-template-heading">
        <div className="sbv-control-section-heading">
          <h3 id="complaint-template-heading">Schnellfall-Checkliste</h3>
          <p>Eine Vorlage wird als interne Notiz in der ausgewählten Fallakte angelegt.</p>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Vorlage</span><select className="industrial-select" value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><option value="">Auswählen …</option>{templates.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
          <IndustrialButton variant="secondary" disabled={!caseId || !template} onClick={() => template ? void onCreateQuickNote(caseId, template) : undefined}>Checkliste in Fallakte anlegen</IndustrialButton>
        </div>
      </section>
    </SbvControlPanel>
  );
}
