import { Wrench } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineWorkplaceAccommodationFields } from "./InlineWorkplaceAccommodationFields";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineWorkplaceAccommodationDraft" | "setInlineWorkplaceAccommodationDraft" | "createWorkplaceAccommodationFromProtocol" | "cancelInlineWorkplaceAccommodationDraft">;

export function InlineWorkplaceAccommodationOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineWorkplaceAccommodationDraft,
    setInlineWorkplaceAccommodationDraft,
    createWorkplaceAccommodationFromProtocol,
    cancelInlineWorkplaceAccommodationDraft,
  } = props;

  return inlineWorkplaceAccommodationDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-workplace-title"
      onClose={cancelInlineWorkplaceAccommodationDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <Wrench className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-workplace-title">
              Arbeitsplatzgestaltung vormerken
            </h2>
            <p>
              Merkt eine Maßnahme nach § 164 Abs. 4 SGB IX für die aktuelle
              Fallakte vor. Angelegt wird sie erst mit der Notiz. Details können nach dem Gespräch
              ergänzt werden.
            </p>
          </div>
        </div>
        <InlineWorkplaceAccommodationFields inlineWorkplaceAccommodationDraft={inlineWorkplaceAccommodationDraft} setInlineWorkplaceAccommodationDraft={setInlineWorkplaceAccommodationDraft} />

        <div className="industrial-modal-preview">
          <Wrench className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenmaßnahme angelegt:{" "}
          <strong>
            {inlineWorkplaceAccommodationDraft.title.trim() ||
              "Arbeitsplatzgestaltung"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineWorkplaceAccommodationDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createWorkplaceAccommodationFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
