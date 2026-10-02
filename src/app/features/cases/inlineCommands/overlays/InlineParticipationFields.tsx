import type { InlineParticipationDraft } from "../inlineCommandTypes";
import { FieldCaption, type Setter } from "./inlineCommandOverlayShared";

export function InlineParticipationFields({ inlineParticipationDraft, setInlineParticipationDraft }: {
  inlineParticipationDraft: InlineParticipationDraft;
  setInlineParticipationDraft: Setter<InlineParticipationDraft>;
}) {
  return (
    <div className="industrial-modal-grid">
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineParticipationDraft} field="title">
          Titel
        </FieldCaption>
        <input
          value={inlineParticipationDraft.title}
          onChange={(event) =>
            setInlineParticipationDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Versetzung ohne vorherige SBV-Anhörung" className="industrial-input" />
      </label>
      <label>
        <FieldCaption
          draft={inlineParticipationDraft}
          field="employerMeasure"
        >
          Arbeitgebermaßnahme / Kurznotiz
        </FieldCaption>
        <input
          value={inlineParticipationDraft.employerMeasure}
          onChange={(event) =>
            setInlineParticipationDraft((current) =>
              current
                ? { ...current, employerMeasure: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Versetzung angekündigt, Unterlagen fehlen" className="industrial-input" />
      </label>
      <label>
        <FieldCaption
          draft={inlineParticipationDraft}
          field="riskLevel"
        >
          Risikostufe
        </FieldCaption>
        <select className="industrial-select"
          value={inlineParticipationDraft.riskLevel}
          onChange={(event) =>
            setInlineParticipationDraft((current) =>
              current
                ? {
                    ...current,
                    riskLevel: event.target
                      .value as InlineParticipationDraft["riskLevel"],
                  }
                : current,
            )
          }
        >
          <option value="normal">normal</option>
          <option value="erhoeht">erhöht</option>
          <option value="kritisch">kritisch</option>
        </select>
      </label>
      <label>
        <span>Stellungnahmefrist optional</span>
        <input
          type="datetime-local"
          value={inlineParticipationDraft.statementDueAt}
          onChange={(event) =>
            setInlineParticipationDraft((current) =>
              current
                ? { ...current, statementDueAt: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineParticipationDraft} field="nextStep">
          Nächster Schritt
        </FieldCaption>
        <input
          value={inlineParticipationDraft.nextStep}
          onChange={(event) =>
            setInlineParticipationDraft((current) =>
              current
                ? { ...current, nextStep: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </div>
  );
}
