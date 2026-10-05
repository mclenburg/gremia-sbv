import { useState } from "react";
import type { CaseNoteRecord } from "../../../domain/models/case-note.model";
import type { EqualizationProcessRecord } from "../../../domain/models/equalization.model";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import { TextareaInput } from "../../shared/components/IndustrialForm";
import { ProcessSection } from "../../shared/process/ProcessDetailHeader";

export type CreateEqualizationSecureNote = (process: EqualizationProcessRecord, content: string) => Promise<boolean>;

function stripEqualizationNoteMarker(content: string): string {
  return content.replace(/^\[\[equalization:[^\]]+\]\]\s*/m, "").trim();
}

export function EqualizationSecureNotesSection({ process, secureNotes, onCreateSecureNote }: {
  process: EqualizationProcessRecord;
  secureNotes: CaseNoteRecord[];
  onCreateSecureNote?: CreateEqualizationSecureNote;
}) {
  const [secureNoteDraft, setSecureNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveSecureNote() {
    const content = secureNoteDraft.trim();
    if (busy || !content || !onCreateSecureNote) return;
    setBusy(true);
    setError("");
    try {
      if (await onCreateSecureNote(process, content)) {
        setSecureNoteDraft((current) => current === secureNoteDraft ? "" : current);
      } else {
        setError("Die verschlüsselte Notiz konnte nicht gespeichert werden.");
      }
    } catch {
      setError("Die verschlüsselte Notiz konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProcessSection
      title="Verschlüsselte SBV-Notizen / nächste Schritte"
      objective="Notizen zu Gleichstellung, GdB und Gesundheit werden als verschlüsselte Fallnotizen geführt und nicht mehr im Gleichstellungsdatensatz gespeichert."
    >
      {process.legacyPlaintextNotesPresent && (
        <div className="industrial-message industrial-message-warning">
          Es gibt noch unverschlüsselte Notizen. Bitte in eine
          verschlüsselte Fallnotiz übertragen und danach die unverschlüsselten
          Notizen bereinigen.
        </div>
      )}
      {secureNotes.length > 0 && (
        <div className="case-note-secure-list">
          {secureNotes.map((note) => (
            <article key={note.id} className="case-note-secure-item">
              <strong>{note.title}</strong>
              <p>{stripEqualizationNoteMarker(note.content ?? "")}</p>
            </article>
          ))}
        </div>
      )}
      <TextareaInput
        label="Neue verschlüsselte Notiz"
        value={secureNoteDraft}
        textCommandFieldId="equalization-secure-note"
        onValueChange={(value) => { setSecureNoteDraft(value); setError(""); }}
        helpText="Die Notiz wird erst über den Button gespeichert. Verlassen des Feldes legt keine neue verschlüsselte Notiz mehr an."
        wide
      />
      <ToolbarButton
        onClick={() => void saveSecureNote()}
        disabled={busy || !secureNoteDraft.trim() || !onCreateSecureNote}
      >
        Verschlüsselte Notiz speichern
      </ToolbarButton>
      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
    </ProcessSection>
  );
}
