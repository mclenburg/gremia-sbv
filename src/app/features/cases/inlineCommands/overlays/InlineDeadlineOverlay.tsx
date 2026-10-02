import { CalendarPlus } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";
import { InlineDeadlineFields } from "./InlineDeadlineFields";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineDeadlineDraft" | "setInlineDeadlineDraft" | "selectedCase" | "buildInlineDeadlineText" | "createInlineDeadlineFromProtocol" | "cancelInlineDeadlineDraft">;

export function InlineDeadlineOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineDeadlineDraft,
    setInlineDeadlineDraft,
    selectedCase,
    buildInlineDeadlineText,
    createInlineDeadlineFromProtocol,
    cancelInlineDeadlineDraft,
  } = props;

  return inlineDeadlineDraft ? (
    <IndustrialModalSurface
      labelledById="inline-deadline-title"
      onClose={cancelInlineDeadlineDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <CalendarPlus className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Frist</p>
            <h2 id="inline-deadline-title">Frist aus Protokoll vormerken</h2>
            <p>
              Die Frist wird vorgemerkt und erst zusammen mit der Notiz gespeichert. Fallbezug:{" "}
              {selectedCase?.caseNumber ?? "—"}
            </p>
          </div>
        </div>

        <InlineDeadlineFields inlineDeadlineDraft={inlineDeadlineDraft} setInlineDeadlineDraft={setInlineDeadlineDraft} />

        {inlineDeadlineDraft.dueAt && (
          <div className="industrial-modal-preview">
            Wird im Protokoll eingefügt:{" "}
            <strong>{buildInlineDeadlineText(inlineDeadlineDraft)}</strong>
          </div>
        )}

        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineDeadlineDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createInlineDeadlineFromProtocol()}
          >
            <CalendarPlus className="industrial-icon" />
            Frist vormerken
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
