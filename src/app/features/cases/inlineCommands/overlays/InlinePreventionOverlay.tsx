import { ShieldAlert } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlinePreventionFields } from "./InlinePreventionFields";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlinePreventionDraft" | "setInlinePreventionDraft" | "createPreventionFromProtocol" | "cancelInlinePreventionDraft">;

export function InlinePreventionOverlay({ props }: { props: OverlayProps }) {
  const {
    inlinePreventionDraft,
    setInlinePreventionDraft,
    createPreventionFromProtocol,
    cancelInlinePreventionDraft,
  } = props;

  return inlinePreventionDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-prevention-title"
      onClose={cancelInlinePreventionDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ShieldAlert className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-prevention-title">Prävention vormerken</h2>
            <p>
              Merkt ein Präventionsverfahren nach § 167 Abs. 1 SGB IX für die
              aktuelle Fallakte vor. Angelegt wird es erst mit der Notiz.
            </p>
          </div>
        </div>
        <InlinePreventionFields inlinePreventionDraft={inlinePreventionDraft} setInlinePreventionDraft={setInlinePreventionDraft} />

        <div className="industrial-modal-preview">
          <ShieldAlert className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenvorgang angelegt:{" "}
          <strong>
            {inlinePreventionDraft.title.trim() || "Präventionsverfahren"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlinePreventionDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createPreventionFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
