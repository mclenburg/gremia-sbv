import { Lock } from "lucide-react";
import { formatConfidentialityText } from "@/domain/textCommands/textCommandPolicy";
import type { ConfidentialCommandLevel } from "@/domain/textCommands/textCommandPolicy";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineConfidentialityDraft" | "setInlineConfidentialityDraft" | "applyConfidentialityFromProtocol" | "cancelInlineConfidentialityDraft">;

export function InlineConfidentialityOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineConfidentialityDraft,
    setInlineConfidentialityDraft,
    applyConfidentialityFromProtocol,
    cancelInlineConfidentialityDraft,
  } = props;

  return inlineConfidentialityDraft ? (
    <IndustrialModalSurface
      labelledById="inline-conf-title"
      onClose={cancelInlineConfidentialityDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Lock className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Vertraulichkeit</p>
            <h2 id="inline-conf-title">Vertraulichkeitsstufe anheben</h2>
            <p>
              Setzt die Vertraulichkeitsstufe der gesamten Notiz direkt
              hoch.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Stufe</span>
            <select className="industrial-select"
              value={inlineConfidentialityDraft.level}
              onChange={(event) =>
                setInlineConfidentialityDraft((current) =>
                  current
                    ? {
                        ...current,
                        level: event.target
                          .value as ConfidentialCommandLevel,
                      }
                    : current,
                )
              }
            >
              <option value="normal">normal</option>
              <option value="sensibel">sensibel</option>
              <option value="hoch_sensibel">hoch sensibel</option>
            </select>
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>
            {formatConfidentialityText(inlineConfidentialityDraft.level)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineConfidentialityDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={applyConfidentialityFromProtocol}
          >
            Übernehmen
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
