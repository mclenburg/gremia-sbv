import { FileText, Trash2 } from 'lucide-react';
import type { CaseDocumentRecord } from '../../core/models/case-document.model';

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
      <p className="industrial-meta">SHA-256: {document.sha256}</p>
      {document.extractedText ? <p className="case-note-content">{document.extractedText.slice(0, 2000)}</p> : <p className="industrial-empty">Für dieses Dokument wurde kein lesbarer Volltext extrahiert. Dateiname und Metadaten sind trotzdem suchbar.</p>}
      <div className="industrial-message industrial-message-warning">Beim Öffnen oder Exportieren entsteht temporär bzw. bewusst eine Klartextkopie außerhalb des verschlüsselten Dokumentenspeichers.</div>
      <div className="industrial-card-actions">
        <button type="button" className="industrial-secondary-button" onClick={() => onOpen(document)}><FileText className="h-4 w-4" /> Öffnen</button>
        <button type="button" className="industrial-secondary-button" onClick={() => onExport(document)}>Exportieren</button>
        <button type="button" className="industrial-secondary-button" onClick={() => onDelete(document)}><Trash2 className="h-4 w-4" /> Löschen</button>
      </div>
    </article>
  );
}
