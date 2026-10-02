import { BadgeCheck } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineEqualizationFields } from "./InlineEqualizationFields";

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
        <InlineEqualizationFields inlineEqualizationDraft={inlineEqualizationDraft} setInlineEqualizationDraft={setInlineEqualizationDraft} />

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
