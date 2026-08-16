import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import { INCLUSION_AGREEMENT_TOPIC_LABELS, type InclusionAgreementRecord, type InclusionAgreementTopicRecord, type SaveInclusionAgreementInput, type SaveInclusionAgreementTopicInput } from '../../../core/models/sbv-office-workflow.model';
import { SbvControlPanel } from './SbvControlPanel';

export function InclusionAgreementWorkspace({ records, onSave, onSaveTopic, onRequestDraft, onResponseDeadline }: {
  records: InclusionAgreementRecord[];
  onSave: (input: SaveInclusionAgreementInput) => Promise<void>;
  onSaveTopic: (agreementId: string, input: SaveInclusionAgreementTopicInput) => Promise<void>;
  onRequestDraft: (dueAt?: string) => Promise<{ text: string; responseDueAt?: string }>;
  onResponseDeadline: (agreementId: string, dueAt: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('Inklusionsvereinbarung');
  const [selected, setSelected] = useState('');
  const [responseDueAt, setResponseDueAt] = useState('');
  const [reviewDueAt, setReviewDueAt] = useState('');
  const [draft, setDraft] = useState('');
  const [topicId, setTopicId] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [sbvTarget, setSbvTarget] = useState('');
  const [employerPosition, setEmployerPosition] = useState('');
  const [councilPosition, setCouncilPosition] = useState('');
  const [resultText, setResultText] = useState('');
  const current = records.find((record) => record.id === selected);
  const topic = current?.topics.find((item) => item.id === topicId);

  useEffect(() => {
    setCurrentState(topic?.currentState ?? '');
    setSbvTarget(topic?.sbvTarget ?? '');
    setEmployerPosition(topic?.employerPosition ?? '');
    setCouncilPosition(topic?.councilPosition ?? '');
    setResultText(topic?.resultText ?? '');
  }, [topic]);

  return (
    <SbvControlPanel
      kicker="§ 166 SGB IX"
      title="Inklusionsvereinbarung"
      actions={<IndustrialHelpButton helpId="sbvOffice.inclusionAgreement" label="Hilfe zur Inklusionsvereinbarung öffnen" />}
    >
      <section className="sbv-control-section" aria-labelledby="inclusion-start-heading">
        <div className="sbv-control-section-heading">
          <h3 id="inclusion-start-heading">Verhandlung anstoßen</h3>
          <p>Verhandlungsakte anlegen, Anforderung vorbereiten und Antwortfrist nachhalten.</p>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Titel</span><input className="industrial-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <IndustrialButton onClick={() => void onSave({ title, status: 'negotiation_requested', requestedAt: new Date().toISOString() })}>Verhandlungsakte anlegen</IndustrialButton>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Gewünschte Antwortfrist</span><input className="industrial-input" type="date" value={responseDueAt} onChange={(event) => setResponseDueAt(event.target.value)} /></label>
          <div className="industrial-action-row sbv-control-action-row">
            <IndustrialButton variant="secondary" onClick={async () => setDraft((await onRequestDraft(responseDueAt || undefined)).text)}>Anforderung entwerfen</IndustrialButton>
            {current ? <IndustrialButton variant="secondary" disabled={!responseDueAt} onClick={() => void onResponseDeadline(current.id, responseDueAt)}>Antwortfrist vormerken</IndustrialButton> : null}
          </div>
        </div>
        {draft ? <label><span>Entwurf</span><textarea className="industrial-textarea" readOnly value={draft} /></label> : null}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-negotiation-heading">
        <div className="sbv-control-section-heading">
          <h3 id="inclusion-negotiation-heading">Verhandlungsakte bearbeiten</h3>
          <p>Themenfelder und Positionen getrennt dokumentieren; die App trifft keine rechtliche oder taktische Entscheidung.</p>
        </div>
        <label><span>Verhandlungsakte</span><select className="industrial-select" value={selected} onChange={(event) => { setSelected(event.target.value); setTopicId(''); }}><option value="">Auswählen …</option>{records.map((record) => <option value={record.id} key={record.id}>{record.title} · {record.status}</option>)}</select></label>
        {current ? <>
          <p className="industrial-meta">{current.topics.filter((item) => item.status === 'open').length} Themenfelder offen</p>
          <label><span>Themenfeld</span><select className="industrial-select" value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">Auswählen …</option>{current.topics.map((item) => <option key={item.id} value={item.id}>{INCLUSION_AGREEMENT_TOPIC_LABELS[item.topicKey]} · {item.status}</option>)}</select></label>
          {topic ? <TopicEditor topic={topic} currentState={currentState} sbvTarget={sbvTarget} employerPosition={employerPosition} councilPosition={councilPosition} resultText={resultText} setters={{ setCurrentState, setSbvTarget, setEmployerPosition, setCouncilPosition, setResultText }} onSave={() => onSaveTopic(current.id, { topicKey: topic.topicKey, currentState, sbvTarget, employerPosition, councilPosition, resultText, status: resultText.trim() ? 'handled' : 'open' })} /> : null}
          <div className="industrial-action-row sbv-control-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: 'negotiating' })}>Status: in Verhandlung</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, employerResponseAt: new Date().toISOString() })}>Arbeitgeberreaktion dokumentieren</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, integrationOfficeInvitedAt: new Date().toISOString() })}>Inklusionsamt beteiligt</IndustrialButton>
            <IndustrialButton onClick={() => void onSave({ id: current.id, title: current.title, status: 'agreed', signedAt: new Date().toISOString() })}>Abschluss dokumentieren</IndustrialButton>
          </div>
        </> : <p className="industrial-meta">Wähle eine Verhandlungsakte für die Detailbearbeitung aus.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-followup-heading">
        <div className="sbv-control-section-heading">
          <h3 id="inclusion-followup-heading">Evaluation und Übermittlung</h3>
          <p>Evaluation terminieren und den Versand nach Abschluss dokumentieren.</p>
        </div>
        <div className="industrial-form-grid sbv-control-inline-action-grid">
          <label><span>Evaluation am</span><input className="industrial-input" type="date" value={reviewDueAt} onChange={(event) => setReviewDueAt(event.target.value)} /></label>
          <IndustrialButton variant="secondary" disabled={!current || !reviewDueAt} onClick={() => current ? void onSave({ id: current.id, title: current.title, status: 'review_due', reviewDueAt }) : undefined}>Evaluation vormerken</IndustrialButton>
        </div>
        {current?.signedAt ? <div className="industrial-action-row sbv-control-action-row">
          <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, sentAgencyAt: new Date().toISOString() })}>Übermittlung BA dokumentieren</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, sentIntegrationOfficeAt: new Date().toISOString() })}>Übermittlung Inklusionsamt dokumentieren</IndustrialButton>
        </div> : <p className="industrial-meta">Übermittlungsnachweise werden nach dokumentiertem Abschluss freigeschaltet.</p>}
      </section>
    </SbvControlPanel>
  );
}

function TopicEditor({ topic, currentState, sbvTarget, employerPosition, councilPosition, resultText, setters, onSave }: {
  topic: InclusionAgreementTopicRecord;
  currentState: string;
  sbvTarget: string;
  employerPosition: string;
  councilPosition: string;
  resultText: string;
  setters: { setCurrentState(value: string): void; setSbvTarget(value: string): void; setEmployerPosition(value: string): void; setCouncilPosition(value: string): void; setResultText(value: string): void };
  onSave(): Promise<void>;
}) {
  return (
    <fieldset className="industrial-subsection sbv-control-topic-editor" aria-label={`Themenmatrix ${INCLUSION_AGREEMENT_TOPIC_LABELS[topic.topicKey]}`}>
      <legend>{INCLUSION_AGREEMENT_TOPIC_LABELS[topic.topicKey]}</legend>
      <div className="industrial-form-grid industrial-form-grid-2">
        <label><span>Ist-Stand</span><textarea className="industrial-textarea" value={currentState} onChange={(event) => setters.setCurrentState(event.target.value)} /></label>
        <label><span>SBV-Ziel</span><textarea className="industrial-textarea" value={sbvTarget} onChange={(event) => setters.setSbvTarget(event.target.value)} /></label>
        <label><span>Arbeitgeberposition</span><textarea className="industrial-textarea" value={employerPosition} onChange={(event) => setters.setEmployerPosition(event.target.value)} /></label>
        <label><span>BR-Position</span><textarea className="industrial-textarea" value={councilPosition} onChange={(event) => setters.setCouncilPosition(event.target.value)} /></label>
        <label className="industrial-field-wide"><span>Vereinbarung / Ergebnis</span><textarea className="industrial-textarea" value={resultText} onChange={(event) => setters.setResultText(event.target.value)} /></label>
      </div>
      <div className="industrial-action-row sbv-control-action-row"><IndustrialButton onClick={() => void onSave()}>Themenfeld speichern</IndustrialButton></div>
    </fieldset>
  );
}
