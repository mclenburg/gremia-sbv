import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PlusCircle, Trash2 } from "lucide-react";
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
import { formatDateShort } from "../../../shared/format/dates";
import { waitForBridge } from "../../../core/bridge/waitForBridge";

type MeasureNotesPanelProps = {
  caseId: string;
  measureType: CaseMeasureNoteProcessType;
  measureId: string;
  measureTitle: string;
};

function toDateTimeLocal(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

async function requireCaseMeasuresBridge() {
  const bridge = await waitForBridge();
  if (!bridge?.caseMeasures) {
    throw new Error("Maßnahmennotizdienst ist nicht erreichbar.");
  }
  return bridge.caseMeasures;
}

export function MeasureNotesPanel({
  caseId,
  measureType,
  measureId,
  measureTitle,
}: MeasureNotesPanelProps) {
  const [notes, setNotes] = useState<CaseMeasureNoteRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("Terminnotiz");
  const [noteAt, setNoteAt] = useState(() => toDateTimeLocal(new Date().toISOString()));
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [error, setError] = useState("");

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
          setError(loadError instanceof Error ? loadError.message : "Maßnahmennotizen konnten nicht geladen werden.");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [caseId, measureId, measureType]);

  async function createNote() {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.createNote({
        caseId,
        measureType,
        measureId,
        title,
        noteAt: fromDateTimeLocal(noteAt),
        participants,
        content,
        nextSteps,
        containsHealthData: true,
        confidentialLevel: "sensibel",
      });
      setTitle("Terminnotiz");
      setNoteAt(toDateTimeLocal(new Date().toISOString()));
      setParticipants("");
      setContent("");
      setNextSteps("");
      setIsCreating(false);
      await loadNotes();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Maßnahmennotiz konnte nicht gespeichert werden.");
    }
  }

  async function deleteNote(note: CaseMeasureNoteRecord) {
    setError("");
    try {
      const caseMeasures = await requireCaseMeasuresBridge();
      await caseMeasures.deleteNote(note.id);
      await loadNotes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Maßnahmennotiz konnte nicht gelöscht werden.");
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
          onClick={() => setIsCreating((current) => !current)}
        >
          <PlusCircle className="h-4 w-4" /> Notiz anlegen
        </button>
      </div>
      <p className="industrial-meta">Termine und Verlauf direkt an „{measureTitle}“ protokollieren. Mehrere vertrauliche Notizen sind möglich.</p>

      {error ? <div className="industrial-message industrial-message-warning">{error}</div> : null}

      {isCreating ? (
        <div id={`${fieldPrefix}-form`} className="industrial-subsection compact">
          <IndustrialFormGrid columns={3}>
            <IndustrialField label="Titel">
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </IndustrialField>
            <IndustrialField label="Termin / Zeitpunkt">
              <input type="datetime-local" value={noteAt} onChange={(event) => setNoteAt(event.target.value)} />
            </IndustrialField>
            <IndustrialField label="Beteiligte">
              <input value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="z. B. SBV, HR, betroffene Person" />
            </IndustrialField>
          </IndustrialFormGrid>
          <IndustrialFormGrid columns={2}>
            <IndustrialField label="Protokoll">
              <TextCommandTextarea
                fieldId={`${fieldPrefix}-content`}
                value={content}
                onChange={(event) => setContent(event.currentTarget.value)}
                rows={6}
                placeholder="Was wurde besprochen, zugesagt oder offengelassen?"
              />
            </IndustrialField>
            <IndustrialField label="Nächste Schritte">
              <TextCommandTextarea
                fieldId={`${fieldPrefix}-next`}
                value={nextSteps}
                onChange={(event) => setNextSteps(event.currentTarget.value)}
                rows={6}
                placeholder="Wiedervorlage, Unterlagenanforderung, Frist, Eskalation …"
              />
            </IndustrialField>
          </IndustrialFormGrid>
          <IndustrialActionRow>
            <button type="button" className="industrial-secondary-button" onClick={() => setIsCreating(false)}>Abbrechen</button>
            <button type="button" className="industrial-button" onClick={() => void createNote()}>Speichern</button>
          </IndustrialActionRow>
        </div>
      ) : null}

      <div className="prevention-status-sections">
        {notes.map((note) => (
          <article key={note.id} className="industrial-subsection compact">
            <div className="case-note-card-header">
              <span className="industrial-badge">{note.title}</span>
              <time>{formatDateShort(note.noteAt)}</time>
            </div>
            {note.participants ? <p className="industrial-meta">Beteiligte: {note.participants}</p> : null}
            <p className="case-note-content">{note.content}</p>
            {note.nextSteps ? <p className="case-note-next"><strong>Nächste Schritte:</strong> {note.nextSteps}</p> : null}
            <IndustrialActionRow>
              <button type="button" className="industrial-secondary-button" aria-label={`Notiz löschen: ${note.title}`} onClick={() => void deleteNote(note)}>
                <Trash2 className="h-4 w-4" /> Löschen
              </button>
            </IndustrialActionRow>
          </article>
        ))}
        {!notes.length ? <p className="case-tree-empty">Noch keine Notiz zu dieser Maßnahme.</p> : null}
      </div>
    </section>
  );
}
