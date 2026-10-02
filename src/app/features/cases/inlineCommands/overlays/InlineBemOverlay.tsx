import { HeartPulse } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import type { InlineBemDraft } from "../inlineCommandTypes";
import { FieldCaption, IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineBemDraft" | "setInlineBemDraft" | "createBemFromProtocol" | "cancelInlineBemDraft">;

export function InlineBemOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineBemDraft,
    setInlineBemDraft,
    createBemFromProtocol,
    cancelInlineBemDraft,
  } = props;

  return inlineBemDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-bem-title"
      onClose={cancelInlineBemDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <HeartPulse className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-bem-title">BEM-Vorgang vormerken</h2>
            <p>
              Merkt einen BEM-Vorgang für die aktuelle Fallakte vor.
              Angelegt wird er erst zusammen mit dem Speichern der Notiz.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="title">
              Titel
            </FieldCaption>
            <input
              value={inlineBemDraft.title}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. BEM wegen wiederholter Arbeitsunfähigkeit" className="industrial-input" />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="triggerDescription">
              Anlass / Kurznotiz
            </FieldCaption>
            <input
              value={inlineBemDraft.triggerDescription}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, triggerDescription: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Rückkehr nach längerer AU, Beschäftigte wünscht Begleitung" className="industrial-input" />
          </label>
          <label>
            <FieldCaption draft={inlineBemDraft} field="triggerType">
              Auslöser
            </FieldCaption>
            <select className="industrial-select"
              value={inlineBemDraft.triggerType}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? {
                        ...current,
                        triggerType: event.target
                          .value as InlineBemDraft["triggerType"],
                      }
                    : current,
                )
              }
            >
              <option value="sechs_wochen_au">mehr als 6 Wochen AU</option>
              <option value="wiederholt_au">wiederholte AU</option>
              <option value="praeventiv">präventiv</option>
              <option value="arbeitgeberangebot">Arbeitgeberangebot</option>
              <option value="sbv_anregung">SBV-Anregung</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            <span>Rückmeldefrist optional</span>
            <input
              type="datetime-local"
              value={inlineBemDraft.responseDueAt}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, responseDueAt: event.target.value }
                    : current,
                )
              } className="industrial-input" />
          </label>
          <label className="industrial-modal-wide">
            <FieldCaption draft={inlineBemDraft} field="nextStep">
              Nächster Schritt
            </FieldCaption>
            <input
              value={inlineBemDraft.nextStep}
              onChange={(event) =>
                setInlineBemDraft((current) =>
                  current
                    ? { ...current, nextStep: event.target.value }
                    : current,
                )
              } className="industrial-input" />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <HeartPulse className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenvorgang angelegt:{" "}
          <strong>{inlineBemDraft.title.trim() || "BEM-Vorgang"}</strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineBemDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createBemFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
