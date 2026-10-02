import { BadgeCheck } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import type { InlineEqualizationDraft } from "../inlineCommandTypes";
import { FieldCaption, IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineEqualizationDraft" | "setInlineEqualizationDraft" | "createEqualizationFromProtocol" | "cancelInlineEqualizationDraft">;

export function InlineEqualizationOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineEqualizationDraft,
    setInlineEqualizationDraft,
    createEqualizationFromProtocol,
    cancelInlineEqualizationDraft,
  } = props;

  return inlineEqualizationDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-equalization-title"
      onClose={cancelInlineEqualizationDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <BadgeCheck className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-equalization-title">
              Gleichstellung/GdB vormerken
            </h2>
            <p>
              Merkt einen Beratungs-/Begleitvorgang zur Gleichstellung oder
              zum GdB für die aktuelle Fallakte vor. Angelegt wird er erst mit der Notiz.
            </p>
          </div>
        </div>
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
        <div className="industrial-modal-preview">
          <BadgeCheck className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenvorgang angelegt:{" "}
          <strong>
            {inlineEqualizationDraft.title.trim() || "Gleichstellung/GdB"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineEqualizationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createEqualizationFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
