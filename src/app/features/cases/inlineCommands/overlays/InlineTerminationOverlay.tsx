import { Siren } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineTerminationFields } from "./InlineTerminationFields";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineTerminationDraft" | "setInlineTerminationDraft" | "createTerminationFromProtocol" | "cancelInlineTerminationDraft">;

export function InlineTerminationOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineTerminationDraft,
    setInlineTerminationDraft,
    createTerminationFromProtocol,
    cancelInlineTerminationDraft,
  } = props;

  return inlineTerminationDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-termination-title"
      onClose={cancelInlineTerminationDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Siren className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-termination-title">
              Kündigungsanhörung vormerken
            </h2>
            <p>
              Merkt einen Kündigungsanhörungsvorgang für die aktuelle Fallakte
              vor. Angelegt wird er erst mit der Notiz. Fristen können sofort vorgemerkt werden.
            </p>
          </div>
        </div>
        <InlineTerminationFields inlineTerminationDraft={inlineTerminationDraft} setInlineTerminationDraft={setInlineTerminationDraft} />

        <div className="industrial-modal-preview">
          <Siren className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenvorgang angelegt:{" "}
          <strong>
            {inlineTerminationDraft.title.trim() || "Kündigungsanhörung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineTerminationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createTerminationFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
