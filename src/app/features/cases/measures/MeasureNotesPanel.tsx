import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, PlusCircle, Trash2 } from "lucide-react";
import type {
  CaseMeasureNoteProcessType,
  CaseMeasureNoteRecord,
} from "../../../core/models/case-measure.model";
import {
  IndustrialActionRow,
  IndustrialField,
  IndustrialFormGrid,
} from "../../../shared/components/WorkbenchLayout";
import { TextCommandTextarea } from "../../../shared/textCommands/TextCommandTextarea";
import { formatDateTimeShort, fromDateTimeLocal, toDateTimeLocal } from "../../../shared/format/dates";
import { waitForBridge } from "../../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../../shared/a11y/LiveRegionProvider";

type MeasureNotesPanelProps = {
  caseId: string;
  measureType: CaseMeasureNoteProcessType;
  measureId: string;
  measureTitle: string;
};

type MeasureNoteFormState = {
  title: string;
  noteAt: string;
  participants: string;
  content: string;
  nextSteps: string;
};

function createEmptyForm(): MeasureNoteFormState {
  return {
    title: "Terminnotiz",
    noteAt: toDateTimeLocal(new Date().toISOString()),
    participants: "",
    content: "",
    nextSteps: "",
  };
}

function createFormFromNote(note: CaseMeasureNoteRecord): MeasureNoteFormState {
  return {
    title: note.title,
    noteAt: toDateTimeLocal(note.noteAt),
    participants: note.participants ?? "",
    content: note.content,
    nextSteps: note.nextSteps ?? "",
  };
}

async function requireCaseMeasuresBridge() {
  const bridge = await waitForBridge();
  if (!bridge?.caseMeasures) {
    throw new Error("Maßnahmennotizdienst ist nicht erreichbar.");
  }
  return bridge.caseMeasures;
}

export function MeasureNoteFields({
  fieldPrefix,
  form,
  onChange,
}: {
  fieldPrefix: string;
  form: MeasureNoteFormState;
  onChange: (patch: Partial<MeasureNoteFormState>) => void;
}) {
  return (
    <>
      <IndustrialFormGrid columns={3}>
        <IndustrialField label="Titel">
          <input value={form.title} onChange={(event) => onChange({ title: event.target.value })} />
        </IndustrialField>
        <IndustrialField label="Termin / Zeitpunkt">
          <input type="datetime-local" value={form.noteAt} onChange={(event) => onChange({ noteAt: event.target.value })} />
        </IndustrialField>
        <IndustrialField label="Beteiligte">
          <input value={form.participants} onChange={(event) => onChange({ participants: event.target.value })} placeholder="z. B. SBV, HR, betroffene Person" />
        </IndustrialField>
      </IndustrialFormGrid>
      <IndustrialFormGrid columns={2}>
        <IndustrialField label="Protokoll">
          <TextCommandTextarea
            fieldId={`${fieldPrefix}-content`}
            value={form.content}
            onChange={(event) => onChange({ content: event.currentTarget.value })}
            rows={6}
            placeholder="Was wurde besprochen, zugesagt oder offengelassen?"
          />
        </IndustrialField>
        <IndustrialField label="Nächste Schritte">
          <TextCommandTextarea
            fieldId={`${fieldPrefix}-next`}
            value={form.nextSteps}
            onChange={(event) => onChange({ nextSteps: event.currentTarget.value })}
            rows={6}
            placeholder="Wiedervorlage, Unterlagenanforderung, Frist, Eskalation …"
          />
        </IndustrialField>
      </IndustrialFormGrid>
    </>
  );
}

export function MeasureNotesPanel({
  caseId,
  measureType,
  measureId,
  measureTitle,
}: MeasureNotesPanelProps) {
  const [notes, setNotes] = useState<CaseMeasureNoteRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<MeasureNoteFormState>(() => createEmptyForm());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MeasureNoteFormState>(() => createEmptyForm());
  const [error, setError] = useState("");
  const announce = useAnnouncer();

  const fieldPrefix = useMemo(
    () => `measure-note-${measureType}-${measureId}`,
    [measureId, measureType],
  );

  async function loadNotes() {
    const caseMeasures = await requireCaseMeasuresBridge();
    const rows = await caseMeasures.listNotes(caseId, measureType, measureId);
    setNotes(rows);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const caseMeasures = await requireCaseMeasuresBridge();
        const rows = await caseMeasures.listNotes(caseId, measureType, measureId);
        if (active) setNotes(rows);
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Maßnahmennotizen konnten nicht geladen werden.";
          setError(message);
          announce(message, "assertive");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [announce, caseId, measureId, measureType]);

  function startEdit(note: CaseMeasureNoteRecord) {
    setError("");
    setIsCreating(false);
    setEditingNoteId(note.id);
    setEditForm(createFormFromNote(note));
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditForm(createEmptyForm());
  }

  async function createNote() {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.createNote({
        caseId,
        measureType,
        measureId,
        title: createForm.title,
        noteAt: fromDateTimeLocal(createForm.noteAt),
        participants: createForm.participants,
        content: createForm.content,
        nextSteps: createForm.nextSteps,
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      setCreateForm(createEmptyForm());
      setIsCreating(false);
      await loadNotes();
      announce("Maßnahmennotiz wurde gespeichert.", "polite");
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Maßnahmennotiz konnte nicht gespeichert werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

  async function updateNote(noteId: string) {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.updateNote(noteId, {
        title: editForm.title,
        noteAt: fromDateTimeLocal(editForm.noteAt),
        participants: editForm.participants,
        content: editForm.content,
        nextSteps: editForm.nextSteps,
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      cancelEdit();
      await loadNotes();
      announce("Maßnahmennotiz wurde aktualisiert.", "polite");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Maßnahmennotiz konnte nicht aktualisiert werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

  async function deleteNote(note: CaseMeasureNoteRecord) {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.deleteNote(note.id);
      if (editingNoteId === note.id) cancelEdit();
      await loadNotes();
      announce("Maßnahmennotiz wurde gelöscht.", "polite");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Maßnahmennotiz konnte nicht gelöscht werden.";
      setError(message);
      announce(message, "assertive");
    }
  }

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
          aria-expanded={isCreating}
          aria-controls={`${fieldPrefix}-form`}
          onClick={() => {
            setEditingNoteId(null);
            setIsCreating((current) => !current);
          }}
        >
          <PlusCircle className="h-4 w-4" /> Notiz anlegen
        </button>
      </div>
      <p className="industrial-meta">Termine und Verlauf direkt an „{measureTitle}“ protokollieren. Mehrere vertrauliche Notizen sind möglich.</p>
      <p className="industrial-meta">Maßnahmennotizen werden als sensible Falldaten gespeichert und bei der Fallanonymisierung mit anonymisiert.</p>

      {error ? <div className="industrial-message industrial-message-warning">{error}</div> : null}

      {isCreating ? (
        <div id={`${fieldPrefix}-form`} className="industrial-subsection compact">
          <MeasureNoteFields
            fieldPrefix={`${fieldPrefix}-create`}
            form={createForm}
            onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
          />
          <IndustrialActionRow>
            <button type="button" className="industrial-secondary-button" onClick={() => setIsCreating(false)}>Abbrechen</button>
            <button type="button" className="industrial-button" onClick={() => void createNote()}>Speichern</button>
          </IndustrialActionRow>
        </div>
      ) : null}

      <div className="prevention-status-sections">
        {notes.map((note) => (
          <article key={note.id} className="industrial-subsection compact">
            {editingNoteId === note.id ? (
              <>
                <MeasureNoteFields
                  fieldPrefix={`${fieldPrefix}-edit-${note.id}`}
                  form={editForm}
                  onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
                />
                <IndustrialActionRow>
                  <button type="button" className="industrial-secondary-button" onClick={cancelEdit}>Abbrechen</button>
                  <button type="button" className="industrial-button" onClick={() => void updateNote(note.id)}>Änderungen speichern</button>
                </IndustrialActionRow>
              </>
            ) : (
              <>
                <div className="case-note-card-header">
                  <span className="industrial-badge">{note.title}</span>
                  <time>{formatDateTimeShort(note.noteAt)}</time>
                </div>
                {note.participants ? <p className="industrial-meta">Beteiligte: {note.participants}</p> : null}
                <p className="case-note-content">{note.content}</p>
                {note.nextSteps ? <p className="case-note-next"><strong>Nächste Schritte:</strong> {note.nextSteps}</p> : null}
                <IndustrialActionRow>
                  <button type="button" className="industrial-secondary-button" aria-label={`Notiz bearbeiten: ${note.title}`} onClick={() => startEdit(note)}>
                    <Pencil className="h-4 w-4" /> Bearbeiten
                  </button>
                  <button type="button" className="industrial-secondary-button" aria-label={`Notiz löschen: ${note.title}`} onClick={() => void deleteNote(note)}>
                    <Trash2 className="h-4 w-4" /> Löschen
                  </button>
                </IndustrialActionRow>
              </>
            )}
          </article>
        ))}
        {!notes.length ? <p className="case-tree-empty">Noch keine Notiz zu dieser Maßnahme.</p> : null}
      </div>
    </section>
  );
}
