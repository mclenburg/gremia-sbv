import { useEffect, useState } from "react";
import type {
  DisabilityProtectionStatus,
  TerminationHearingRecord,
  TerminationHearingStatus,
  TerminationType,
} from "../../core/models/termination.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { formatDateShort } from "../../shared/format/dates";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import {
  DeferredDateTimeInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import {
  ProcessDetailHeader,
  ProcessSection,
} from "../../shared/process/ProcessDetailHeader";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../cases/caseWorkbenchFormat";
import {
  protectionStatusLabel,
  terminationStatusLabel,
  terminationStatusOrder,
  terminationTypeLabel,
} from "./terminationShared";
import {
  suggestedStatementDueAt,
  terminationStatusObjective,
  suggestNextTerminationStatus,
} from "@services/terminationWorkflowPolicy";

const terminationTypes: TerminationType[] = [
  "ordentlich",
  "ausserordentlich",
  "aenderungskuendigung",
  "verdachtskuendigung",
  "personenbedingt",
  "verhaltensbedingt",
  "betriebsbedingt",
  "sonstiges",
];
const protectionStatuses: DisabilityProtectionStatus[] = [
  "schwerbehindert",
  "gleichgestellt",
  "antrag_laeuft",
  "unklar",
  "nicht_bekannt",
];

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function TerminationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
}: {
  process: TerminationHearingRecord;
  onUpdate: (
    id: string,
    input: Partial<TerminationHearingRecord>,
  ) => Promise<void>;
  onOpenTemplates?: (process: TerminationHearingRecord) => void;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const suggestedStatus = suggestNextTerminationStatus(process);
  const suggestedDueAt = !process.sbvStatementDueAt
    ? suggestedStatementDueAt(process.receivedAt, process.terminationType)
    : undefined;

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
          <ProcessSection
            title="Eingang und Fristen"
            objective="Eingang und Stellungnahmefrist sofort sichern."
          >
            <div className="industrial-form-grid">
              <SelectInput
                label="Status"
                value={process.status}
                options={terminationStatusOrder.map((status) => ({
                  value: status,
                  label: terminationStatusLabel(status),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    status: value as TerminationHearingStatus,
                  })
                }
              />
              <SelectInput
                label="Kündigungsart"
                value={process.terminationType}
                options={terminationTypes.map((type) => ({
                  value: type,
                  label: terminationTypeLabel(type),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    terminationType: value as TerminationType,
                  })
                }
              />
              <DeferredDateTimeInput
                label="Eingang Anhörung"
                value={toDateTimeLocalValue(process.receivedAt)}
                onCommit={(value) =>
                  onUpdate(process.id, { receivedAt: normalizeDateTime(value) })
                }
              />
              <DeferredDateTimeInput
                label="SBV-Stellungnahmefrist"
                value={toDateTimeLocalValue(process.sbvStatementDueAt)}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    sbvStatementDueAt: normalizeDateTime(value),
                  })
                }
              />
              <DeferredDateTimeInput
                label="BR-Anhörung / Parallelverfahren"
                value={toDateTimeLocalValue(process.worksCouncilHearingAt)}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    worksCouncilHearingAt: normalizeDateTime(value),
                  })
                }
              />
            </div>
            <p className="industrial-field-hint">
              Fristvorschläge sind Arbeitshilfen. Maßgeblich bleiben Zugang,
              konkrete Anhörungslage und ggf. anwaltliche Prüfung.
            </p>
          </ProcessSection>

          <ProcessSection
            title="Schutzstatus und Integrationsamt"
            objective="Bei Schwerbehinderung, Gleichstellung oder laufendem Antrag muss der besondere Kündigungsschutz geprüft werden."
          >
            <div className="industrial-form-grid">
              <SelectInput
                label="Schutzstatus"
                value={process.protectionStatus}
                options={protectionStatuses.map((status) => ({
                  value: status,
                  label: protectionStatusLabel(status),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    protectionStatus: value as DisabilityProtectionStatus,
                  })
                }
              />
              <DeferredDateTimeInput
                label="Integrationsamt angefragt am"
                value={toDateTimeLocalValue(
                  process.integrationOfficeRequestedAt,
                )}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    integrationOfficeRequestedAt: normalizeDateTime(value),
                  })
                }
              />
              <DeferredDateTimeInput
                label="Entscheidung Integrationsamt am"
                value={toDateTimeLocalValue(
                  process.integrationOfficeDecisionAt,
                )}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    integrationOfficeDecisionAt: normalizeDateTime(value),
                  })
                }
              />
            </div>
            <DeferredTextareaInput
              label="Entscheidung / Stand Integrationsamt"
              value={process.integrationOfficeDecision ?? ""}
              textCommandFieldId="termination-integration-office"
              onCommit={(value) =>
                onUpdate(process.id, { integrationOfficeDecision: value })
              }
              wide
            />
          </ProcessSection>

          <ProcessSection
            title="Arbeitgebervortrag und fehlende Unterlagen"
            objective="Die SBV kann nur wirksam Stellung nehmen, wenn Unterlagen und Kündigungsgrund konkret vorliegen."
          >
            <DeferredTextareaInput
              label="Kündigungsgrund / Arbeitgebervortrag"
              value={process.employerReason ?? ""}
              textCommandFieldId="termination-employer-reason"
              onCommit={(value) =>
                onUpdate(process.id, { employerReason: value })
              }
              wide
            />
            <DeferredTextareaInput
              label="Fehlende Informationen / Nachforderung"
              value={process.missingInformation ?? ""}
              textCommandFieldId="termination-missing-information"
              onCommit={(value) =>
                onUpdate(process.id, { missingInformation: value })
              }
              wide
            />
          </ProcessSection>

          <ProcessSection
            title="SBV-Bewertung und Stellungnahme"
            objective="Stellungnahme sachlich, fristgerecht und auf die Rechte schwerbehinderter Menschen fokussiert dokumentieren."
          >
            <DeferredTextareaInput
              label="SBV-Bewertung"
              value={process.sbvAssessment ?? ""}
              textCommandFieldId="termination-assessment"
              onCommit={(value) =>
                onUpdate(process.id, { sbvAssessment: value })
              }
              wide
            />
            <DeferredTextareaInput
              label="SBV-Stellungnahme"
              value={process.statement ?? ""}
              textCommandFieldId="termination-statement"
              onCommit={(value) => onUpdate(process.id, { statement: value })}
              wide
            />
          </ProcessSection>
        </div>
      </div>
    </article>
  );
}
