import type { DisabilityProtectionStatus, TerminationHearingRecord, TerminationHearingStatus, TerminationType } from "../../../domain/models/termination.model";
import { DeferredDateTimeInput, DeferredTextareaInput, SelectInput } from "../../shared/components/IndustrialForm";
import { ProcessSection } from "../../shared/process/ProcessDetailHeader";
import { fromDateTimeLocal as normalizeDateTime, toDateTimeLocal as toDateTimeLocalValue } from "../../shared/format/dates";
import { protectionStatusLabel, terminationStatusLabel, terminationStatusOrder, terminationTypeLabel } from "./terminationShared";

export type TerminationEditorProps = {
  process: TerminationHearingRecord;
  onUpdate: (id: string, input: Partial<TerminationHearingRecord>) => Promise<void>;
};

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

export function TerminationIntakeSection({ process, onUpdate }: TerminationEditorProps) {
  return (
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
  );
}

export function TerminationProtectionSection({ process, onUpdate }: TerminationEditorProps) {
  return (
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
  );
}

type StatementField = "employerReason" | "missingInformation" | "sbvAssessment" | "statement";
const statementSections: Array<{ title: string; objective: string; fields: Array<{ field: StatementField; label: string; commandId: string }> }> = [
  {
    title: "Arbeitgebervortrag und fehlende Unterlagen",
    objective: "Die SBV kann nur wirksam Stellung nehmen, wenn Unterlagen und Kündigungsgrund konkret vorliegen.",
    fields: [
      { field: "employerReason", label: "Kündigungsgrund / Arbeitgebervortrag", commandId: "termination-employer-reason" },
      { field: "missingInformation", label: "Fehlende Informationen / Nachforderung", commandId: "termination-missing-information" },
    ],
  },
  {
    title: "SBV-Bewertung und Stellungnahme",
    objective: "Stellungnahme sachlich, fristgerecht und auf die Rechte schwerbehinderter Menschen fokussiert dokumentieren.",
    fields: [
      { field: "sbvAssessment", label: "SBV-Bewertung", commandId: "termination-assessment" },
      { field: "statement", label: "SBV-Stellungnahme", commandId: "termination-statement" },
    ],
  },
];

export function TerminationStatementSections({ process, onUpdate }: TerminationEditorProps) {
  return (
    <>
      {statementSections.map(({ title, objective, fields }) => (
        <ProcessSection key={title} title={title} objective={objective}>
          {fields.map(({ field, label, commandId }) => (
            <DeferredTextareaInput key={field} label={label} value={process[field] ?? ""} textCommandFieldId={commandId}
              onCommit={(value) => onUpdate(process.id, { [field]: value })} wide />
          ))}
        </ProcessSection>
      ))}
    </>
  );
}
