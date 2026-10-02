import { Scale } from "lucide-react";
import { LEGAL_NORM_SUGGESTIONS, formatLegalNormText } from "@/domain/textCommands/textCommandPolicy";
import { filterNormsForInlineCommand } from "../inlineCommandSearch";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineLegalNormDraft" | "setInlineLegalNormDraft" | "insertLegalNormFromProtocol" | "cancelInlineLegalNormDraft">;

export function InlineLegalNormOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineLegalNormDraft,
    setInlineLegalNormDraft,
    insertLegalNormFromProtocol,
    cancelInlineLegalNormDraft,
  } = props;

  return inlineLegalNormDraft ? (
    <IndustrialModalSurface
      labelledById="inline-legal-title"
      onClose={cancelInlineLegalNormDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Scale className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Rechtsnorm</p>
            <h2 id="inline-legal-title">Rechtsnorm einfügen</h2>
            <p>
              Die Norm wird als Kurzverweis in den Text eingefügt. Das ist
              die Grundlage für die spätere Wissensdatenbank-Verknüpfung.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <span>Norm suchen</span>
            <input
              value={inlineLegalNormDraft.query}
              onChange={(event) =>
                setInlineLegalNormDraft((current) =>
                  current
                    ? { ...current, query: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. 178, Prävention, Kündigung, AGG …" className="industrial-input" />
          </label>
        </div>
        <div className="inline-contact-results">
          {filterNormsForInlineCommand(
            LEGAL_NORM_SUGGESTIONS,
            inlineLegalNormDraft.query,
          ).map((norm) => (
            <button
              key={norm.id}
              type="button"
              className="industrial-command-result inline-contact-result"
              onClick={() => void insertLegalNormFromProtocol(norm)}
            >
              <strong>{formatLegalNormText(norm)}</strong>
              <span>{norm.shortText}</span>
            </button>
          ))}
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineLegalNormDraft}
          >
            Abbrechen
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
