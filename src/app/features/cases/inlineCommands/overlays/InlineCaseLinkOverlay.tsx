import { FolderKanban } from "lucide-react";
import { filterCasesForInlineCommand } from "../inlineCommandSearch";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineCaseLinkDraft" | "setInlineCaseLinkDraft" | "cases" | "insertCaseReferenceFromProtocol" | "cancelInlineCaseLinkDraft">;

export function InlineCaseLinkOverlay({ props }: { props: OverlayProps }) {
  const {
    inlineCaseLinkDraft,
    setInlineCaseLinkDraft,
    cases,
    insertCaseReferenceFromProtocol,
    cancelInlineCaseLinkDraft,
  } = props;

  return inlineCaseLinkDraft ? (
    <IndustrialModalSurface
      labelledById="inline-case-link-title"
      onClose={cancelInlineCaseLinkDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <FolderKanban className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Fallbezug</p>
            <h2 id="inline-case-link-title">Fallbezug verknüpfen</h2>
            <p>
              Der gewählte Fall wird in den Text eingefügt und als weiterer
              Fallbezug der Notiz gespeichert.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
          <label className="industrial-modal-wide">
            <span>Fall suchen</span>
            <input
              value={inlineCaseLinkDraft.query}
              onChange={(event) =>
                setInlineCaseLinkDraft((current) =>
                  current
                    ? { ...current, query: event.target.value }
                    : current,
                )
              }
              placeholder="Aktenzeichen, Name/Pseudonym, Kategorie …" className="industrial-input" />
          </label>
        </div>
        <div className="inline-contact-results">
          {filterCasesForInlineCommand(
            cases,
            inlineCaseLinkDraft.query,
          ).map((record) => (
            <button
              key={record.id}
              type="button"
              className="industrial-command-result inline-contact-result"
              onClick={() => void insertCaseReferenceFromProtocol(record)}
            >
              <strong>{record.caseNumber}</strong>
              <span>
                {record.displayName} · {record.category}
              </span>
            </button>
          ))}
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlineCaseLinkDraft}
          >
            Abbrechen
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
