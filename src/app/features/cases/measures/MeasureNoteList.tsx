import type { CaseMeasureNoteRecord } from "../../../core/models/case-measure.model";
import type { MeasureNoteFormState } from "./measureNoteTypes";
import { MeasureNoteCard } from "./MeasureNoteCard";
import { MeasureNoteForm } from "./MeasureNoteForm";

export function MeasureNoteList({
  notes,
  fieldPrefix,
  editingNoteId,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  notes: CaseMeasureNoteRecord[];
  fieldPrefix: string;
  editingNoteId: string | null;
  editForm: MeasureNoteFormState;
  onEditFormChange: (patch: Partial<MeasureNoteFormState>) => void;
  onStartEdit: (note: CaseMeasureNoteRecord) => void;
  onCancelEdit: () => void;
  onUpdate: (noteId: string) => void;
  onDelete: (note: CaseMeasureNoteRecord) => void;
}) {
  return (
    <div className="prevention-status-sections">
      {notes.map((note) => (
        <article key={note.id} className="industrial-subsection compact">
          {editingNoteId === note.id ? (
            <MeasureNoteForm
              fieldPrefix={`${fieldPrefix}-edit-${note.id}`}
              form={editForm}
              submitLabel="Änderungen speichern"
              onChange={onEditFormChange}
              onCancel={onCancelEdit}
              onSubmit={() => onUpdate(note.id)}
            />
          ) : (
            <MeasureNoteCard note={note} onEdit={onStartEdit} onDelete={onDelete} />
          )}
        </article>
      ))}
      {!notes.length ? <p className="case-tree-empty">Noch keine Notiz zu dieser Maßnahme.</p> : null}
    </div>
  );
}
