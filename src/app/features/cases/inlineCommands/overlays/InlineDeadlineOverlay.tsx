import { CalendarPlus } from "lucide-react";
import type { DeadlineSeverity } from "../../../../../domain/models/deadline.model";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

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

        <div className="industrial-modal-grid">
          <label>
            <span>Fristtitel</span>
            <input
              value={inlineDeadlineDraft.title}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Antwort Arbeitgeber nachhalten" className="industrial-input" />
          </label>
          <label>
            <span>Ablaufdatum</span>
            <input
              type="datetime-local"
              value={inlineDeadlineDraft.dueAt}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, dueAt: event.target.value }
                    : current,
                )
              } className="industrial-input" />
          </label>
          <label>
            <span>Stufe</span>
            <select className="industrial-select"
              value={inlineDeadlineDraft.severity}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? {
                        ...current,
                        severity: event.target.value as DeadlineSeverity,
                      }
                    : current,
                )
              }
            >
              <option value="normal">normal</option>
              <option value="important">wichtig</option>
              <option value="critical">kritisch</option>
              <option value="fatal">fatal</option>
            </select>
          </label>
          <label>
            <span>Rechtsbezug</span>
            <input
              value={inlineDeadlineDraft.legalBasis}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, legalBasis: event.target.value }
                    : current,
                )
              }
              placeholder="optional" className="industrial-input" />
          </label>
          <label className="industrial-modal-wide">
            <span>Notiz zur Frist</span>
            <input
              value={inlineDeadlineDraft.description}
              onChange={(event) =>
                setInlineDeadlineDraft((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current,
                )
              } className="industrial-input" />
          </label>
        </div>

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
