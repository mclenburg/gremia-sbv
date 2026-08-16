import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { SelectInput, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
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
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="complaint-start-heading">Beschwerdevorgang anlegen</h3>
            <p>Der Workflow bleibt an eine Fallakte gebunden; sensible Inhalte gehören weiterhin in die Fallakte.</p>
          </div>
          <div className="industrial-action-row">
            <IndustrialButton disabled={!caseId} onClick={() => void onSave({ caseId, receivedAt: new Date().toISOString(), assessmentStatus: 'open' })}>Beschwerdeworkflow starten</IndustrialButton>
          </div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-2">
          <SelectInput label="Fallakte" value={caseId} onValueChange={setCaseId} options={[{ value: '', label: 'Auswählen …' }, ...cases.map((item) => ({ value: item.id, label: `${item.caseNumber} · ${item.displayName}` }))]} />
        </div>
      </section>

      <section className="sbv-control-section" aria-labelledby="complaint-edit-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="complaint-edit-heading">Beschwerdevorgang bearbeiten</h3>
            <p>Prüfung, Verhandlung und Ergebnis aus Sicht der SBV dokumentieren.</p>
          </div>
          {current ? (
            <div className="industrial-action-row">
              <IndustrialButton variant="secondary" onClick={() => void onSave({ ...current, assessmentStatus: assessment, employerContactedAt: new Date().toISOString(), negotiationStatus, resultSummary: result, status: 'in_progress' })}>Arbeitgeberkontakt dokumentieren</IndustrialButton>
              <IndustrialButton onClick={() => void onSave({ ...current, assessmentStatus: assessment, negotiationStatus, resultSummary: result, status: result.trim() ? 'closed' : 'in_progress' })}>Beschwerdevorgang speichern</IndustrialButton>
            </div>
          ) : null}
        </div>
        <SelectInput label="Beschwerdevorgang" value={selectedId} onValueChange={setSelectedId} options={[{ value: '', label: 'Auswählen …' }, ...records.map((record) => ({ value: record.id, label: `${record.receivedAt.slice(0, 10)} · ${record.assessmentStatus}` }))]} />
        {current ? (
          <div className="sbv-control-detail-grid">
            <div className="industrial-form-grid industrial-form-grid-2">
              <SelectInput label="Prüfung" value={assessment} onValueChange={(value) => setAssessment(value as ComplaintAssessment)} options={[{ value: 'open', label: 'offen' }, { value: 'justified', label: 'berechtigt' }, { value: 'unclear', label: 'unklar' }, { value: 'unjustified', label: 'unberechtigt' }]} />
              <TextInput label="Verhandlung / Sachstand" value={negotiationStatus} onValueChange={setNegotiationStatus} />
            </div>
            <TextareaInput label="Ergebnis" value={result} onValueChange={setResult} wide />
          </div>
        ) : <p className="industrial-meta">Wähle einen bestehenden Vorgang, um Prüfung und Ergebnis zu bearbeiten.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="complaint-template-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="complaint-template-heading">Schnellfall-Checkliste</h3>
            <p>Eine Vorlage wird als interne Notiz in der ausgewählten Fallakte angelegt.</p>
          </div>
          <div className="industrial-action-row">
            <IndustrialButton variant="secondary" disabled={!caseId || !template} onClick={() => template ? void onCreateQuickNote(caseId, template) : undefined}>Checkliste in Fallakte anlegen</IndustrialButton>
          </div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-2">
          <SelectInput label="Vorlage" value={selectedTemplate} onValueChange={setSelectedTemplate} options={[{ value: '', label: 'Auswählen …' }, ...templates.map((item) => ({ value: item.key, label: item.title }))]} />
        </div>
      </section>
    </SbvControlPanel>
  );
}
