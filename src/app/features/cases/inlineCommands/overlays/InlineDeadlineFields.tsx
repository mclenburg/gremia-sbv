import type { DeadlineSeverity } from "../../../../../domain/models/deadline.model";
import type { InlineDeadlineDraft } from "../useInlineCommands";
import type { Setter } from "./inlineCommandOverlayShared";

export function InlineDeadlineFields({ inlineDeadlineDraft, setInlineDeadlineDraft }: {
  inlineDeadlineDraft: InlineDeadlineDraft;
  setInlineDeadlineDraft: Setter<InlineDeadlineDraft>;
}) {
  return (
    <div className="industrial-modal-grid">
      <label>
        <span>Fristtitel</span>
        <input
          value={inlineDeadlineDraft.title}
          onChange={(event) =>
            setInlineDeadlineDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Antwort Arbeitgeber nachhalten" className="industrial-input" />
      </label>
      <label>
        <span>Ablaufdatum</span>
        <input
          type="datetime-local"
          value={inlineDeadlineDraft.dueAt}
          onChange={(event) =>
            setInlineDeadlineDraft((current) =>
              current
                ? { ...current, dueAt: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label>
        <span>Stufe</span>
        <select className="industrial-select"
          value={inlineDeadlineDraft.severity}
          onChange={(event) =>
            setInlineDeadlineDraft((current) =>
              current
                ? {
                    ...current,
                    severity: event.target.value as DeadlineSeverity,
                  }
                : current,
            )
          }
        >
          <option value="normal">normal</option>
          <option value="important">wichtig</option>
          <option value="critical">kritisch</option>
          <option value="fatal">fatal</option>
        </select>
      </label>
      <label>
        <span>Rechtsbezug</span>
        <input
          value={inlineDeadlineDraft.legalBasis}
          onChange={(event) =>
            setInlineDeadlineDraft((current) =>
              current
                ? { ...current, legalBasis: event.target.value }
                : current,
            )
          }
          placeholder="optional" className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <span>Notiz zur Frist</span>
        <input
          value={inlineDeadlineDraft.description}
          onChange={(event) =>
            setInlineDeadlineDraft((current) =>
              current
                ? { ...current, description: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </div>
  );
}
