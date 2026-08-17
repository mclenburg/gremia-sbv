import { useEffect, useState } from 'react';
import { IndustrialButton } from '../../../shared/components/IndustrialButton';
import { DateInput, SelectInput, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
import { IndustrialHelpButton } from '../../../shared/help/IndustrialHelp';
import { INCLUSION_AGREEMENT_TOPIC_LABELS, type InclusionAgreementRecord, type InclusionAgreementTopicRecord, type SaveInclusionAgreementInput, type SaveInclusionAgreementTopicInput } from '../../../../domain/models/sbv-office-workflow.model';
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
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="inclusion-start-heading">Verhandlung anstoßen</h3>
            <p>Verhandlungsakte anlegen, Anforderung vorbereiten und Antwortfrist nachhalten.</p>
          </div>
          <div className="industrial-action-row"><IndustrialButton onClick={() => void onSave({ title, status: 'negotiation_requested', requestedAt: new Date().toISOString() })}>Verhandlungsakte anlegen</IndustrialButton></div>
        </div>
        <div className="industrial-form-grid industrial-form-grid-2">
          <TextInput label="Titel" value={title} onValueChange={setTitle} />
        </div>
        <div className="industrial-form-grid industrial-form-grid-2 sbv-control-followup-grid">
          <DateInput label="Gewünschte Antwortfrist" value={responseDueAt} onValueChange={setResponseDueAt} />
          <div className="industrial-action-row sbv-control-field-action">
            <IndustrialButton variant="secondary" onClick={async () => setDraft((await onRequestDraft(responseDueAt || undefined)).text)}>Anforderung entwerfen</IndustrialButton>
            {current ? <IndustrialButton variant="secondary" disabled={!responseDueAt} onClick={() => void onResponseDeadline(current.id, responseDueAt)}>Antwortfrist vormerken</IndustrialButton> : null}
          </div>
        </div>
        {draft ? <TextareaInput label="Entwurf" value={draft} onValueChange={() => undefined} readOnly wide /> : null}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-negotiation-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="inclusion-negotiation-heading">Verhandlungsakte bearbeiten</h3>
            <p>Themenfelder und Positionen getrennt dokumentieren; die App trifft keine rechtliche oder taktische Entscheidung.</p>
          </div>
          {current ? <div className="industrial-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: 'negotiating' })}>Status: in Verhandlung</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, employerResponseAt: new Date().toISOString() })}>Arbeitgeberreaktion</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, integrationOfficeInvitedAt: new Date().toISOString() })}>Inklusionsamt beteiligt</IndustrialButton>
            <IndustrialButton onClick={() => void onSave({ id: current.id, title: current.title, status: 'agreed', signedAt: new Date().toISOString() })}>Abschluss dokumentieren</IndustrialButton>
          </div> : null}
        </div>
        <SelectInput label="Verhandlungsakte" value={selected} onValueChange={(value) => { setSelected(value); setTopicId(''); }} options={[{ value: '', label: 'Auswählen …' }, ...records.map((record) => ({ value: record.id, label: `${record.title} · ${record.status}` }))]} />
        {current ? <>
          <p className="industrial-meta">{current.topics.filter((item) => item.status === 'open').length} Themenfelder offen</p>
          <SelectInput label="Themenfeld" value={topicId} onValueChange={setTopicId} options={[{ value: '', label: 'Auswählen …' }, ...current.topics.map((item) => ({ value: item.id, label: `${INCLUSION_AGREEMENT_TOPIC_LABELS[item.topicKey]} · ${item.status}` }))]} />
          {topic ? <TopicEditor topic={topic} currentState={currentState} sbvTarget={sbvTarget} employerPosition={employerPosition} councilPosition={councilPosition} resultText={resultText} setters={{ setCurrentState, setSbvTarget, setEmployerPosition, setCouncilPosition, setResultText }} onSave={() => onSaveTopic(current.id, { topicKey: topic.topicKey, currentState, sbvTarget, employerPosition, councilPosition, resultText, status: resultText.trim() ? 'handled' : 'open' })} /> : null}

        </> : <p className="industrial-meta">Wähle eine Verhandlungsakte für die Detailbearbeitung aus.</p>}
      </section>

      <section className="sbv-control-section" aria-labelledby="inclusion-followup-heading">
        <div className="sbv-control-section-heading-with-actions">
          <div>
            <h3 id="inclusion-followup-heading">Evaluation und Übermittlung</h3>
            <p>Evaluation terminieren und den Versand nach Abschluss dokumentieren.</p>
          </div>
          {current?.signedAt ? <div className="industrial-action-row">
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, sentAgencyAt: new Date().toISOString() })}>Übermittlung BA</IndustrialButton>
            <IndustrialButton variant="secondary" onClick={() => void onSave({ id: current.id, title: current.title, status: current.status, sentIntegrationOfficeAt: new Date().toISOString() })}>Übermittlung Inklusionsamt</IndustrialButton>
          </div> : null}
        </div>
        <div className="industrial-form-grid industrial-form-grid-2 sbv-control-followup-grid">
          <DateInput label="Evaluation am" value={reviewDueAt} onValueChange={setReviewDueAt} />
          <div className="industrial-action-row sbv-control-field-action"><IndustrialButton variant="secondary" disabled={!current || !reviewDueAt} onClick={() => current ? void onSave({ id: current.id, title: current.title, status: 'review_due', reviewDueAt }) : undefined}>Evaluation vormerken</IndustrialButton></div>
        </div>
        {!current?.signedAt ? <p className="industrial-meta">Übermittlungsnachweise werden nach dokumentiertem Abschluss freigeschaltet.</p> : null}
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
      <div className="industrial-action-row sbv-control-topic-toolbar"><IndustrialButton onClick={() => void onSave()}>Themenfeld speichern</IndustrialButton></div>
      <div className="industrial-form-grid industrial-form-grid-2">
        <TextareaInput label="Ist-Stand" value={currentState} onValueChange={setters.setCurrentState} />
        <TextareaInput label="SBV-Ziel" value={sbvTarget} onValueChange={setters.setSbvTarget} />
        <TextareaInput label="Arbeitgeberposition" value={employerPosition} onValueChange={setters.setEmployerPosition} />
        <TextareaInput label="BR-Position" value={councilPosition} onValueChange={setters.setCouncilPosition} />
        <TextareaInput label="Vereinbarung / Ergebnis" value={resultText} onValueChange={setters.setResultText} wide />
      </div>
    </fieldset>
  );
}
