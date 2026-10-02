import { ShieldAlert } from "lucide-react";
import { formatAnonymizationMarkerText } from "@/domain/textCommands/textCommandPolicy";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineAnonymizationDraft" | "setInlineAnonymizationDraft" | "applyAnonymizationMarkerFromProtocol" | "cancelInlineAnonymizationDraft">;

export function InlineAnonymizationOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineAnonymizationDraft,
    setInlineAnonymizationDraft,
    applyAnonymizationMarkerFromProtocol,
    cancelInlineAnonymizationDraft,
  } = props;

  return inlineAnonymizationDraft ? (
    <IndustrialModalSurface className="inline-anonymization-modal"
      labelledById="inline-anon-title"
      onClose={cancelInlineAnonymizationDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ShieldAlert className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Anonymisierung</p>
            <h2 id="inline-anon-title">Anonymisierung vormerken</h2>
            <p>
              Setzt eine sichtbare Vormerkung im Protokoll. Berichtslogik
              kann diese Markierung später gezielt auswerten.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Art der Textstelle</span>
            <input
              value={inlineAnonymizationDraft.label}
              onChange={(event) =>
                setInlineAnonymizationDraft((current) =>
                  current
                    ? { ...current, label: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Name, Bereich, Funktion, Gesundheitsdetail" className="industrial-input" />
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>
            {formatAnonymizationMarkerText(inlineAnonymizationDraft.label)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineAnonymizationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={applyAnonymizationMarkerFromProtocol}
          >
            Vormerken
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
