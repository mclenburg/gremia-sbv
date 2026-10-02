import { AlertTriangle } from "lucide-react";
import { formatRiskText } from "@/domain/textCommands/textCommandPolicy";
import type { RiskLevelCommand } from "@/domain/textCommands/textCommandPolicy";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineRiskDraft" | "setInlineRiskDraft" | "insertRiskFromProtocol" | "cancelInlineRiskDraft">;

export function InlineRiskOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineRiskDraft,
    setInlineRiskDraft,
    insertRiskFromProtocol,
    cancelInlineRiskDraft,
  } = props;

  return inlineRiskDraft ? (
    <IndustrialModalSurface
      labelledById="inline-risk-title"
      onClose={cancelInlineRiskDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <AlertTriangle className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Risiko</p>
            <h2 id="inline-risk-title">Risiko markieren</h2>
            <p>
              Die Markierung bleibt im Protokoll sichtbar und hebt bei hohen
              Risiken die Vertraulichkeit der Notiz an.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Risikostufe</span>
            <select className="industrial-select"
              value={inlineRiskDraft.level}
              onChange={(event) =>
                setInlineRiskDraft((current) =>
                  current
                    ? {
                        ...current,
                        level: event.target.value as RiskLevelCommand,
                      }
                    : current,
                )
              }
            >
              <option value="low">niedrig</option>
              <option value="medium">mittel</option>
              <option value="high">hoch</option>
              <option value="critical">kritisch</option>
            </select>
          </label>
          <label className="industrial-modal-wide">
            <span>Hinweis</span>
            <input
              value={inlineRiskDraft.text}
              onChange={(event) =>
                setInlineRiskDraft((current) =>
                  current
                    ? { ...current, text: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Kündigungsrisiko, Chronifizierungsrisiko, Arbeitgeber blockiert …" className="industrial-input" />
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>
            {formatRiskText(inlineRiskDraft.level, inlineRiskDraft.text)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineRiskDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void insertRiskFromProtocol()}
          >
            Risiko einfügen
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
