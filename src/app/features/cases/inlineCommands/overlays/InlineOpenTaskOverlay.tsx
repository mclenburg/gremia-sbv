import { CheckCircle2 } from "lucide-react";
import { formatOpenTaskText } from "@/domain/textCommands/textCommandPolicy";
import type { DeadlineSeverity } from "../../../../../domain/models/deadline.model";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineOpenTaskDraft" | "setInlineOpenTaskDraft" | "createOpenTaskFromProtocol" | "cancelInlineOpenTaskDraft">;

export function InlineOpenTaskOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineOpenTaskDraft,
    setInlineOpenTaskDraft,
    createOpenTaskFromProtocol,
    cancelInlineOpenTaskDraft,
  } = props;

  return inlineOpenTaskDraft ? (
    <IndustrialModalSurface
      labelledById="inline-task-title"
      onClose={cancelInlineOpenTaskDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <CheckCircle2 className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Aufgabe</p>
            <h2 id="inline-task-title">Offene Aufgabe ohne Datum</h2>
            <p>
              Merkt eine Wiedervorlage ohne konkretes Ablaufdatum vor. Sie wird erst zusammen mit der Notiz gespeichert und im Text vermerkt.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label>
            <span>Aufgabe</span>
            <input
              value={inlineOpenTaskDraft.title}
              onChange={(event) =>
                setInlineOpenTaskDraft((current) =>
                  current
                    ? { ...current, title: event.target.value }
                    : current,
                )
              }
              placeholder="z. B. Inklusionsamt nachfassen" className="industrial-input" />
          </label>
          <label>
            <span>Stufe</span>
            <select className="industrial-select"
              value={inlineOpenTaskDraft.severity}
              onChange={(event) =>
                setInlineOpenTaskDraft((current) =>
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
          <label className="industrial-modal-wide">
            <span>Notiz</span>
            <input
              value={inlineOpenTaskDraft.description}
              onChange={(event) =>
                setInlineOpenTaskDraft((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current,
                )
              } className="industrial-input" />
          </label>
        </div>
        <div className="industrial-modal-preview">
          Wird eingefügt:{" "}
          <strong>{formatOpenTaskText(inlineOpenTaskDraft.title)}</strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineOpenTaskDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createOpenTaskFromProtocol()}
          >
            Aufgabe vormerken
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
