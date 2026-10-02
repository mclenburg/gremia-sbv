import { ClipboardCheck } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import type { InlineParticipationDraft } from "../inlineCommandTypes";
import { FieldCaption, IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineParticipationDraft" | "setInlineParticipationDraft" | "createParticipationFromProtocol" | "cancelInlineParticipationDraft">;

export function InlineParticipationOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineParticipationDraft,
    setInlineParticipationDraft,
    createParticipationFromProtocol,
    cancelInlineParticipationDraft,
  } = props;

  return inlineParticipationDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-participation-title"
      onClose={cancelInlineParticipationDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ClipboardCheck className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-participation-title">SBV-Beteiligung vormerken</h2>
            <p>
              Merkt die Beteiligung als Maßnahme der aktuellen Fallakte vor.
              Angelegt wird sie erst zusammen mit dem Speichern der Notiz.
            </p>
          </div>
        </div>
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
        <div className="industrial-modal-preview">
          <ClipboardCheck className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenmaßnahme angelegt:{" "}
          <strong>
            {inlineParticipationDraft.title.trim() || "SBV-Beteiligung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineParticipationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createParticipationFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
