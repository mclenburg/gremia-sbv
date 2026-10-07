import { FileText } from "lucide-react";
import { formatTemplateMarkerText } from "@/domain/textCommands/textCommandPolicy";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineTemplateDraft" | "setInlineTemplateDraft" | "applyTemplateMarkerFromProtocol" | "cancelInlineTemplateDraft">;

export function InlineTemplateOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineTemplateDraft,
    setInlineTemplateDraft,
    applyTemplateMarkerFromProtocol,
    cancelInlineTemplateDraft,
  } = props;

  return inlineTemplateDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-template-title"
      onClose={cancelInlineTemplateDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <FileText className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Vorlage</p>
            <h2 id="inline-template-title">Vorlage vormerken</h2>
            <p>
              Der Vorlagenbezug wird im Protokoll markiert. Die konkrete
              Dokumenterzeugung bleibt im Vorlagenmodul.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <span>Such-/Vorlagenhinweis</span>
            <input
              value={inlineTemplateDraft.query}
              onChange={(event) =>
                setInlineTemplateDraft((current) =>
                  current
                    ? { ...current, query: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Unterlagenanforderung Beteiligung" className="industrial-input" />
          </label>
        </div>
        <div className="industrial-modal-preview">
          <FileText className="industrial-icon" /> Wird eingefügt:{" "}
          <strong>
            {formatTemplateMarkerText(inlineTemplateDraft.query)}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineTemplateDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={applyTemplateMarkerFromProtocol}
          >
            Vormerken
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
