import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markdownToPrintableHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inTable = false;

  function closeTable() {
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }
  }

  for (const line of lines) {
    if (/^\|.+\|$/.test(line.trim())) {
      const cells = line.trim().slice(1, -1).split('|').map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!inTable) {
        html.push('<table><tbody>');
        inTable = true;
      }
      html.push(`<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`);
      continue;
    }

    closeTable();
    if (line.startsWith('# ')) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (line.startsWith('## ')) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (line.startsWith('### ')) html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    else if (line.startsWith('- ')) html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    else if (line.trim()) html.push(`<p>${escapeHtml(line)}</p>`);
    else html.push('<br />');
  }

  closeTable();
  return html.join('\n');
}

function openPdfPrintView(document: ComplianceDocument) {
  const printable = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!printable) throw new Error('PDF-Druckansicht konnte nicht geöffnet werden.');

  printable.document.write(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; }
    h1 { font-size: 22pt; margin: 0 0 12pt; }
    h2 { font-size: 15pt; margin: 18pt 0 8pt; border-bottom: 1px solid #d1d5db; padding-bottom: 4pt; }
    h3 { font-size: 12pt; margin: 14pt 0 6pt; }
    p, li, td { font-size: 10.5pt; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; page-break-inside: avoid; }
    td { border: 1px solid #d1d5db; padding: 5pt; vertical-align: top; }
    li { margin: 2pt 0; }
    .meta { color: #4b5563; font-size: 9pt; margin-bottom: 14pt; }
    .no-print { margin-bottom: 16pt; }
    .no-print button { padding: 8pt 12pt; font-weight: 700; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">Als PDF drucken / speichern</button>
  </div>
  <div class="meta">Gremia.SBV · ${escapeHtml(document.filename)}</div>
  ${markdownToPrintableHtml(document.body)}
</body>
</html>`);
  printable.document.close();
  printable.focus();
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

  function exportPdfCurrent() {
    try {
      openPdfPrintView(document);
      const info = `${document.title} wurde als PDF-Druckansicht geöffnet.`;
      setMessage(info);
      announce(info, 'polite');
    } catch (error) {
      const info = error instanceof Error ? error.message : 'PDF-Druckansicht konnte nicht geöffnet werden.';
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
