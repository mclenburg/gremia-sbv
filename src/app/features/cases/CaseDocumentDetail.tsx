import { FileText, Trash2 } from 'lucide-react';
import type { CaseDocumentRecord } from '../../../domain/models/case-document.model';
import { DangerButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { IndustrialActionRow } from '../../shared/components/WorkbenchLayout';

export function CaseDocumentDetail({
  document,
  formatNoteDate,
  formatBytes,
  onOpen,
  onExport,
  onDelete
}: {
  document?: CaseDocumentRecord;
  formatNoteDate: (value: string) => string;
  formatBytes: (value?: number) => string;
  onOpen: (document: CaseDocumentRecord) => void;
  onExport: (document: CaseDocumentRecord) => void;
  onDelete: (document: CaseDocumentRecord) => void;
}) {
  if (!document) return null;

  return (
    <article className="case-detail-content">
      <div className="case-note-card-header"><span className="industrial-badge">Dokument</span><time>{formatNoteDate(document.createdAt)}</time></div>
      <h2>{document.displayTitle}</h2>
      <p className="industrial-meta">{document.filename} · {document.mimeType ?? 'Datei'} · {formatBytes(document.sizeBytes)}</p>
      {document.measureTitle && (
        <p className="industrial-meta">Zugeordnete Maßnahme: {document.measureTitle}</p>
      )}
      {document.remoteOrigin ? <details>
        <summary>Herkunft aus Gremia.BR</summary>
        <dl className="industrial-meta-grid">
          <div><dt>Remote-Titel</dt><dd>{document.remoteOrigin.title}</dd></div>
          <div><dt>Dokumentkennung</dt><dd>{document.remoteOrigin.documentId}</dd></div>
          <div><dt>Versionskennung</dt><dd>{document.remoteOrigin.versionId}</dd></div>
        </dl>
      </details> : null}
      <p className="industrial-meta">SHA-256: {document.sha256}</p>
      {document.extractedText || document.ocrText ? <div className="case-note-content">
        {document.extractedText ? <p>{document.extractedText.slice(0, 2000)}</p> : null}
        {document.ocrText && document.ocrText !== document.extractedText ? <p><strong>OCR-Text:</strong> {document.ocrText.slice(0, 2000)}</p> : null}
      </div> : <p className="industrial-empty">Für dieses Dokument wurde kein lesbarer Volltext extrahiert. Dateiname und Metadaten sind trotzdem suchbar.</p>}
      <div className="industrial-message industrial-message-warning">Beim Öffnen oder Exportieren entsteht temporär bzw. bewusst eine Klartextkopie außerhalb des verschlüsselten Dokumentenspeichers.</div>
      <IndustrialActionRow>
        <ToolbarButton onClick={() => onOpen(document)}><FileText className="industrial-icon" /> Öffnen</ToolbarButton>
        <ToolbarButton onClick={() => onExport(document)}>Exportieren</ToolbarButton>
        <DangerButton compact onClick={() => onDelete(document)}><Trash2 className="industrial-icon" /> Löschen</DangerButton>
      </IndustrialActionRow>
    </article>
  );
}
