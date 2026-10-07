import type { InlineEqualizationDraft } from "../inlineCommandTypes";
import { FieldCaption, type Setter } from "./inlineCommandOverlayShared";

export function InlineEqualizationFields({ inlineEqualizationDraft, setInlineEqualizationDraft }: {
  inlineEqualizationDraft: InlineEqualizationDraft;
  setInlineEqualizationDraft: Setter<InlineEqualizationDraft>;
}) {
  return (
    <div className="industrial-modal-grid">
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineEqualizationDraft} field="title">
          Titel
        </FieldCaption>
        <input
          value={inlineEqualizationDraft.title}
          onChange={(event) =>
            setInlineEqualizationDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Gleichstellungsantrag vorbereiten" className="industrial-input" />
      </label>
      <label>
        <span>Status</span>
        <select className="industrial-select"
          value={inlineEqualizationDraft.status}
          onChange={(event) =>
            setInlineEqualizationDraft((current) =>
              current
                ? {
                    ...current,
                    status: event.target
                      .value as InlineEqualizationDraft["status"],
                  }
                : current,
            )
          }
        >
          <option value="beratung">Beratung</option>
          <option value="vorbereitung">Vorbereitung</option>
          <option value="eingereicht">eingereicht</option>
          <option value="nachfrage">Nachfrage</option>
          <option value="bewilligt">bewilligt</option>
          <option value="abgelehnt">abgelehnt</option>
          <option value="widerspruch">Widerspruch</option>
          <option value="abgeschlossen">abgeschlossen</option>
        </select>
      </label>
      <label>
        <span>Widerspruchs-/Prüffrist optional</span>
        <input
          type="datetime-local"
          value={inlineEqualizationDraft.objectionDueAt}
          onChange={(event) =>
            setInlineEqualizationDraft((current) =>
              current
                ? { ...current, objectionDueAt: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineEqualizationDraft} field="note">
          Kurznotiz
        </FieldCaption>
        <input
          value={inlineEqualizationDraft.note}
          onChange={(event) =>
            setInlineEqualizationDraft((current) =>
              current
                ? { ...current, note: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Voraussetzungen prüfen, Unterlagen sammeln" className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineEqualizationDraft} field="nextStep">
          Nächster Schritt
        </FieldCaption>
        <input
          value={inlineEqualizationDraft.nextStep}
          onChange={(event) =>
            setInlineEqualizationDraft((current) =>
              current
                ? { ...current, nextStep: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </div>
  );
}
