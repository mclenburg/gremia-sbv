import type { EqualizationProcessRecord, EqualizationStatus } from "../../../domain/models/equalization.model";
import { DeferredDateTimeInput, DeferredTextInput, DeferredTextareaInput, SelectInput } from "../../shared/components/IndustrialForm";
import { ProcessSection } from "../../shared/process/ProcessDetailHeader";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../cases/caseWorkbenchFormat";
import { equalizationStatusLabel, equalizationStatusOrder } from "./equalizationShared";

export type EqualizationEditorProps = {
  process: EqualizationProcessRecord;
  onUpdate: (id: string, input: Partial<EqualizationProcessRecord>) => Promise<void>;
};

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function EqualizationApplicationSections({ process, onUpdate }: EqualizationEditorProps) {
  return (
    <>
      <ProcessSection
        title="Status und Antrag"
        objective="Antragseinreichung, Geschäftszeichen und Bearbeitungsstand nachvollziehbar halten."
      >
        <div className="industrial-form-grid">
          <SelectInput
            label="Status"
            value={process.applicationStatus}
            options={equalizationStatusOrder.map((status) => ({
              value: status,
              label: equalizationStatusLabel(status),
            }))}
            onValueChange={(value) =>
              void onUpdate(process.id, {
                applicationStatus: value as EqualizationStatus,
              })
            }
          />
          <DeferredTextInput
            label="Geschäftszeichen / Agentur"
            value={process.agencyReference ?? ""}
            onCommit={(value) =>
              onUpdate(process.id, { agencyReference: value })
            }
          />
          <DeferredDateTimeInput
            label="Antrag eingereicht am"
            value={toDateTimeLocalValue(process.applicationSubmittedAt)}
            onCommit={(value) =>
              onUpdate(process.id, {
                applicationSubmittedAt: normalizeDateTime(value),
              })
            }
          />
        </div>
      </ProcessSection>

      <ProcessSection
        title="Bescheid und Widerspruch"
        objective="Bei Ablehnung ist die Widerspruchsfrist der kritische Punkt."
      >
        <div className="industrial-form-grid">
          <DeferredDateTimeInput
            label="Bescheid erhalten am"
            value={toDateTimeLocalValue(process.decisionReceivedAt)}
            onCommit={(value) =>
              onUpdate(process.id, {
                decisionReceivedAt: normalizeDateTime(value),
              })
            }
          />
          <DeferredDateTimeInput
            label="Widerspruchsfrist"
            value={toDateTimeLocalValue(process.objectionDueAt)}
            onCommit={(value) =>
              onUpdate(process.id, {
                objectionDueAt: normalizeDateTime(value),
              })
            }
          />
        </div>
        <DeferredTextareaInput
          label="Ergebnis / Bescheid"
          value={process.outcome ?? ""}
          textCommandFieldId="equalization-outcome"
          onCommit={(value) => onUpdate(process.id, { outcome: value })}
          wide
        />
      </ProcessSection>
    </>
  );
}
