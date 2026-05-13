import { Pencil, Trash2 } from "lucide-react";
import type { CaseMeasureNoteRecord } from "../../../core/models/case-measure.model";
import { IndustrialActionRow } from "../../../shared/components/WorkbenchLayout";
import { formatDateTimeShort } from "../../../shared/format/dates";

export function MeasureNoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: CaseMeasureNoteRecord;
  onEdit: (note: CaseMeasureNoteRecord) => void;
  onDelete: (note: CaseMeasureNoteRecord) => void;
}) {
  return (
    <>
      <div className="case-note-card-header">
        <span className="industrial-badge">{note.title}</span>
        <time>{formatDateTimeShort(note.noteAt)}</time>
      </div>
      {note.participants ? <p className="industrial-meta">Beteiligte: {note.participants}</p> : null}
      <p className="case-note-content">{note.content}</p>
      {note.nextSteps ? <p className="case-note-next"><strong>Nächste Schritte:</strong> {note.nextSteps}</p> : null}
      <IndustrialActionRow>
        <button type="button" className="industrial-secondary-button" aria-label={`Notiz bearbeiten: ${note.title}`} onClick={() => onEdit(note)}>
          <Pencil className="h-4 w-4" /> Bearbeiten
        </button>
        <button type="button" className="industrial-secondary-button" aria-label={`Notiz löschen: ${note.title}`} onClick={() => onDelete(note)}>
          <Trash2 className="h-4 w-4" /> Löschen
        </button>
      </IndustrialActionRow>
    </>
  );
}
