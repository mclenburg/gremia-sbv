import {
  suggestedStatementDueAt,
  suggestNextTerminationStatus,
  terminationStatusObjective,
} from "@/domain/termination/terminationWorkflowPolicy";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import { formatDateShort } from "../../shared/format/dates";
import { terminationStatusLabel } from "./terminationShared";
import type { TerminationEditorProps } from "./TerminationProcessSections";

export function TerminationGuidancePanel({ process, onUpdate }: TerminationEditorProps) {
  const suggestedStatus = suggestNextTerminationStatus(process);
  const suggestedDueAt = !process.sbvStatementDueAt
    ? suggestedStatementDueAt(process.receivedAt, process.terminationType)
    : undefined;
  return (
    <div className="industrial-message termination-guidance-panel">
      <div>
        <strong>Kündigungsanhörung-Statusführung</strong>
        <p>{terminationStatusObjective(process.status)}</p>
      </div>
      <div className="termination-guidance-actions">
        {suggestedDueAt && (
          <ToolbarButton
            onClick={() =>
              void onUpdate(process.id, {
                sbvStatementDueAt: suggestedDueAt,
              })
            }
          >
            Frist vorschlagen: {formatDateShort(suggestedDueAt)}
          </ToolbarButton>
        )}
        {suggestedStatus && (
          <ToolbarButton
            onClick={() =>
              void onUpdate(process.id, { status: suggestedStatus })
            }
          >
            Status vorschlagen: {terminationStatusLabel(suggestedStatus)}
          </ToolbarButton>
        )}
      </div>
    </div>
  );
}
