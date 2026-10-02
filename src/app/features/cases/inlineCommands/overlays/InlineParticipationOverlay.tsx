import { ClipboardCheck } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineParticipationFields } from "./InlineParticipationFields";

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
        <InlineParticipationFields inlineParticipationDraft={inlineParticipationDraft} setInlineParticipationDraft={setInlineParticipationDraft} />

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
