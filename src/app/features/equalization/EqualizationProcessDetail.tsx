import { useEffect, useState } from "react";
import type { CaseNoteRecord } from "../../../domain/models/case-note.model";
import type { EqualizationProcessRecord } from "../../../domain/models/equalization.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import { formatDateShort } from "../../shared/format/dates";
import { ProcessDetailHeader } from "../../shared/process/ProcessDetailHeader";
import { buildEqualizationGuidance } from "@/domain/equalization/equalizationGuidancePolicy";
import { equalizationStatusLabel } from "./equalizationShared";
import { EqualizationApplicationSections, type EqualizationEditorProps } from "./EqualizationApplicationSections";
import { EqualizationSecureNotesSection, type CreateEqualizationSecureNote } from "./EqualizationSecureNotesSection";

export function EqualizationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
  secureNotes = [],
  onCreateSecureNote,
}: {
  process: EqualizationProcessRecord;
  onUpdate: EqualizationEditorProps["onUpdate"];
  onOpenTemplates?: (process: EqualizationProcessRecord) => void;
  secureNotes?: CaseNoteRecord[];
  onCreateSecureNote?: CreateEqualizationSecureNote;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const guidance = buildEqualizationGuidance(process);

  useEffect(() => {
    let active = true;
    async function loadWarnings() {
      try {
        const bridge = await waitForBridge();
        const rows = await bridge?.equalization?.warnings(process.id);
        if (active) setWarnings((rows ?? []).map((item) => item.message));
      } catch {
        if (active) setWarnings([]);
      }
    }
    void loadWarnings();
    return () => {
      active = false;
    };
  }, [process]);

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title="Gleichstellung / GdB"
          description="Beratung, Antrag, Bescheid und Widerspruchsfrist sauber dokumentieren. Die SBV unterstützt, entscheidet aber nicht über Antrag oder Widerspruch."
          documentAction={
            onOpenTemplates ? () => onOpenTemplates(process) : undefined
          }
          badges={[
            {
              label: "Status",
              value: equalizationStatusLabel(process.applicationStatus),
            },
            {
              label: "Bescheid",
              value: formatDateShort(process.decisionReceivedAt),
            },
            {
              label: "Widerspruch",
              value: formatDateShort(process.objectionDueAt),
            },
          ]}
        />

        <div className="industrial-message equalization-guidance-panel">
          <div>
            <strong>{guidance.title}</strong>
            <p>{guidance.objective}</p>
          </div>
          {guidance.suggestedNextStatus && (
            <ToolbarButton
              onClick={() =>
                void onUpdate(process.id, {
                  applicationStatus: guidance.suggestedNextStatus,
                })
              }
            >
              Status vorschlagen:{" "}
              {equalizationStatusLabel(guidance.suggestedNextStatus)}
            </ToolbarButton>
          )}
        </div>

        <div className="industrial-message equalization-privacy-panel">
          <strong>Gesundheitsdaten sparsam dokumentieren.</strong>
          <p>
            Für Gleichstellung und GdB reichen häufig Verfahrensstand, Fristen
            und SBV-Handlungsschritte. Diagnosen und Bescheiddetails gehören nur
            in verschlüsselte Notizen, wenn sie wirklich erforderlich sind.
          </p>
        </div>

        {warnings.length > 0 && (
          <div className="industrial-message industrial-message-warning">
            <strong>Hinweise</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="prevention-status-sections bem-status-sections">
          <EqualizationApplicationSections process={process} onUpdate={onUpdate} />
          <EqualizationSecureNotesSection key={process.id} process={process} secureNotes={secureNotes} onCreateSecureNote={onCreateSecureNote} />

        </div>
      </div>
    </article>
  );
}
