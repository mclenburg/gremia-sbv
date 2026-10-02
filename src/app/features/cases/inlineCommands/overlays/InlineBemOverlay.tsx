import { HeartPulse } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineBemFields } from "./InlineBemFields";

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
        <InlineBemFields inlineBemDraft={inlineBemDraft} setInlineBemDraft={setInlineBemDraft} />

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
