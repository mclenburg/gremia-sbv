import { useMemo } from "react";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { MeasureNoteForm } from "./MeasureNoteForm";
import { MeasureNoteList } from "./MeasureNoteList";
import type { MeasureNotesPanelProps } from "./measureNoteTypes";
import { useMeasureNotes } from "./useMeasureNotes";

export { MeasureNoteFields } from "./MeasureNoteForm";

export function MeasureNotesPanel({
  caseId,
  measureType,
  measureId,
  measureTitle,
}: MeasureNotesPanelProps) {
  const state = useMeasureNotes({ caseId, measureType, measureId });
  const fieldPrefix = useMemo(
    () => `measure-note-${measureType}-${measureId}`,
    [measureId, measureType],
  );

  return (
    <section className="industrial-subsection compact" aria-labelledby={`${fieldPrefix}-heading`}>
      <div className="case-process-title-row">
        <h3 id={`${fieldPrefix}-heading`}>
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          Maßnahmennotizen
        </h3>
        <button
          type="button"
          className="industrial-secondary-button"
          aria-expanded={state.isCreating}
          aria-controls={`${fieldPrefix}-form`}
          onClick={state.startCreate}
        >
          <PlusCircle className="h-4 w-4" /> Notiz anlegen
        </button>
      </div>
      <p className="industrial-meta">Termine und Verlauf direkt an „{measureTitle}“ protokollieren. Mehrere vertrauliche Notizen sind möglich.</p>
      <p className="industrial-meta">Maßnahmennotizen werden als sensible Falldaten gespeichert und bei der Fallanonymisierung mit anonymisiert.</p>

      {state.error ? <div className="industrial-message industrial-message-warning">{state.error}</div> : null}

      {state.isCreating ? (
        <div id={`${fieldPrefix}-form`} className="industrial-subsection compact">
          <MeasureNoteForm
            fieldPrefix={`${fieldPrefix}-create`}
            form={state.createForm}
            submitLabel="Speichern"
            onChange={(patch) => state.setCreateForm((current) => ({ ...current, ...patch }))}
            onCancel={() => state.setIsCreating(false)}
            onSubmit={() => void state.createNote()}
          />
        </div>
      ) : null}

      <MeasureNoteList
        notes={state.notes}
        fieldPrefix={fieldPrefix}
        editingNoteId={state.editingNoteId}
        editForm={state.editForm}
        onEditFormChange={(patch) => state.setEditForm((current) => ({ ...current, ...patch }))}
        onStartEdit={state.startEdit}
        onCancelEdit={state.cancelEdit}
        onUpdate={(noteId) => void state.updateNote(noteId)}
        onDelete={(note) => void state.deleteNote(note)}
      />
    </section>
  );
}
