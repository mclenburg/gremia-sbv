import { useEffect, useState } from "react";
import type { TerminationHearingRecord } from "../../../domain/models/termination.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { formatDateShort } from "../../shared/format/dates";
import { ProcessDetailHeader } from "../../shared/process/ProcessDetailHeader";
import {
  protectionStatusLabel,
  terminationStatusLabel,
} from "./terminationShared";
import { TerminationGuidancePanel } from "./TerminationGuidancePanel";
import { ActivityJournalContextButton } from "../activity-journal/components/ActivityJournalContextButton";

import {
  TerminationIntakeSection,
  TerminationProtectionSection,
  TerminationStatementSections,
  type TerminationEditorProps,
} from "./TerminationProcessSections";

export function TerminationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
}: {
  process: TerminationHearingRecord;
  onUpdate: TerminationEditorProps["onUpdate"];
  onOpenTemplates?: (process: TerminationHearingRecord) => void;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function loadWarnings() {
      try {
        const bridge = await waitForBridge();
        const rows = await bridge?.termination?.warnings(process.id);
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
          title="Kündigungsanhörung"
          description="Fristen, Schutzstatus, Integrationsamt und SBV-Stellungnahme sind hier die kritischen Punkte."
          documentAction={
            onOpenTemplates ? () => onOpenTemplates(process) : undefined
          }
          actions={
            <ActivityJournalContextButton
              context={{
                contextType: "termination_hearing",
                contextId: process.id,
                caseId: process.caseId,
                title: "Kündigungsanhörung",
              }}
            />
          }
          badges={[
            { label: "Status", value: terminationStatusLabel(process.status) },
            {
              label: "Frist",
              value: formatDateShort(process.sbvStatementDueAt),
            },
            {
              label: "Schutz",
              value: protectionStatusLabel(process.protectionStatus),
            },
          ]}
        />

        <TerminationGuidancePanel process={process} onUpdate={onUpdate} />

        <div className="industrial-message termination-privacy-panel">
          <strong>Kündigungsdaten sind vertraulich.</strong>
          <p>
            Arbeitgebervortrag, Schutzstatus, SBV-Bewertung und Stellungnahme
            können Gesundheits-, Leistungs- oder Verhaltensdaten enthalten.
            Exporte nur mit Zweckbindung und minimal notwendigem Inhalt nutzen.
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
          <TerminationIntakeSection process={process} onUpdate={onUpdate} />
          <TerminationProtectionSection process={process} onUpdate={onUpdate} />
          <TerminationStatementSections process={process} onUpdate={onUpdate} />
        </div>
      </div>
    </article>
  );
}
