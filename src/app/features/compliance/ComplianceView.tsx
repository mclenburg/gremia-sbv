import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { ComplianceDocument, ComplianceDocumentType, DataSubjectAccessRequestInput } from '../../core/models/compliance.model';
import { defaultDsarInput, listComplianceDocuments, renderComplianceDocument, renderDsarResponseDocument } from '@services/complianceCenterService';

function downloadTextFile(document: ComplianceDocument) {
  const blob = new Blob([document.body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ComplianceView() {
  const descriptors = useMemo(() => listComplianceDocuments(), []);
  const [selectedType, setSelectedType] = useState<ComplianceDocumentType>('toms');
  const [document, setDocument] = useState<ComplianceDocument>(() => renderComplianceDocument('toms'));
  const [message, setMessage] = useState('');
  const [dsarInput, setDsarInput] = useState<DataSubjectAccessRequestInput>(() => defaultDsarInput());
  const announce = useAnnouncer();

  function render(type: ComplianceDocumentType) {
    const next = renderComplianceDocument(type);
    setSelectedType(type);
    setDocument(next);
    const info = `${next.title} wurde erzeugt.`;
    setMessage(info);
    announce(info, 'polite');
  }

  function updateDsarInput<K extends keyof DataSubjectAccessRequestInput>(key: K, value: DataSubjectAccessRequestInput[K]) {
    setDsarInput((current) => ({ ...current, [key]: value }));
  }

  function renderDsar() {
    const next = renderDsarResponseDocument(dsarInput);
    setSelectedType('dsar_response');
    setDocument(next);
    const info = 'Antwort auf DSGVO-Auskunftsersuchen wurde erzeugt.';
    setMessage(info);
    announce(info, 'polite');
  }

  function downloadCurrent() {
    downloadTextFile(document);
    const info = `${document.title} wurde als Markdown exportiert.`;
    setMessage(info);
    announce(info, 'polite');
  }

  async function exportPdfCurrent() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.reports) throw new Error('Berichtsdienst ist nicht erreichbar.');
      const result = await bridge.reports.generate({
        type: 'compliance_document',
        complianceTitle: document.title,
        complianceSubtitle: document.description,
        complianceClassification: document.type === 'toms' || document.type === 'dsgvo_bdsg_matrix' ? 'Intern / Compliance' : 'Intern vertraulich',
        complianceBody: document.body
      });
      if (!result.ok) throw new Error(result.error ?? 'PDF-Dokument konnte nicht erzeugt werden.');
      const info = `${document.title} wurde als PDF erzeugt: ${result.fileName}`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'PDF-Dokument konnte nicht erzeugt werden.';
      setMessage(info);
      announce(info, 'assertive');
    }
  }

  return (
    <ModuleFrame
      title="Compliance Center"
      description="TOMs, DSFA-Entwurf, DSGVO-/BDSG-Auswertung und Freigabeformular für DSB und IT-Security."
    >
      <div className="compliance-layout">
        <section className="compliance-actions" aria-label="Compliance-Dokumente">
          {descriptors.map((item) => (
            <article key={item.type} className={`compliance-card ${selectedType === item.type ? 'active' : ''}`}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <button type="button" className="industrial-button" onClick={() => item.type === 'dsar_response' ? renderDsar() : render(item.type)}>
                {item.buttonLabel}
              </button>
            </article>
          ))}
        </section>

        <section className="compliance-dsar-form" aria-label="DSGVO-Auskunftsersuchen">
          <p className="industrial-kicker">Art. 15 DSGVO</p>
          <h2>Auskunftsersuchen beantworten</h2>
          <p>Diese Eingaben werden nur in das erzeugte Markdown-Dokument übernommen.</p>
          <div className="compliance-form-grid">
            <label>
              <span>Name der anfragenden Person</span>
              <input value={dsarInput.requesterName} onChange={(event) => updateDsarInput('requesterName', event.currentTarget.value)} />
            </label>
            <label>
              <span>Fall-/Aktenbezug</span>
              <input value={dsarInput.caseReference} onChange={(event) => updateDsarInput('caseReference', event.currentTarget.value)} />
            </label>
            <label>
              <span>Eingang</span>
              <input type="date" value={dsarInput.requestReceivedAt} onChange={(event) => updateDsarInput('requestReceivedAt', event.currentTarget.value)} />
            </label>
            <label>
              <span>Antwortfrist</span>
              <input type="date" value={dsarInput.responseDueAt} onChange={(event) => updateDsarInput('responseDueAt', event.currentTarget.value)} />
            </label>
            <label>
              <span>Bearbeitet durch</span>
              <input value={dsarInput.preparedBy} onChange={(event) => updateDsarInput('preparedBy', event.currentTarget.value)} />
            </label>
            <label className="compliance-checkbox">
              <input type="checkbox" checked={dsarInput.identityVerified} onChange={(event) => updateDsarInput('identityVerified', event.currentTarget.checked)} />
              <span>Identität geprüft</span>
            </label>
            <label className="compliance-wide">
              <span>Umfang des Ersuchens</span>
              <textarea value={dsarInput.requestScope} onChange={(event) => updateDsarInput('requestScope', event.currentTarget.value)} />
            </label>
          </div>
          <button type="button" className="industrial-button" onClick={renderDsar}>
            Auskunftsantwort erzeugen
          </button>
        </section>

        <section className="compliance-preview" aria-label="Dokumentvorschau">
          <div className="compliance-preview-header">
            <div>
              <p className="industrial-kicker">Vorschau</p>
              <h2>{document.title}</h2>
              <p>{document.description}</p>
            </div>
            <div className="compliance-export-actions">
              <button type="button" className="industrial-secondary-button" onClick={downloadCurrent}>
                <Download className="h-4 w-4" />
                Markdown exportieren
              </button>
              <button type="button" className="industrial-button" onClick={exportPdfCurrent}>
                PDF exportieren
              </button>
            </div>
          </div>
          {message && <div className="industrial-message">{message}</div>}
          <textarea className="industrial-output-area compliance-output" value={document.body} readOnly aria-label={`${document.title} Vorschau`} />
        </section>
      </div>
    </ModuleFrame>
  );
}
