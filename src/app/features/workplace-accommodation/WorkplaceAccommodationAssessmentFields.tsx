import { CheckCircle2 } from "lucide-react";
import type { WorkplaceAccommodationRecord, UpdateWorkplaceAccommodationInput } from "../../../domain/models/workplace-accommodation.model";
import { CheckboxField, DeferredTextareaInput } from "../../shared/components/IndustrialForm";

export type WorkplaceAccommodationFieldsProps = {
  process: WorkplaceAccommodationRecord;
  update: (input: UpdateWorkplaceAccommodationInput) => void;
};

type CheckpointField = "technicalAidNeeded" | "organizationalAdjustmentNeeded" | "workingTimeAdjustmentNeeded" | "qualificationNeeded" | "fixedWorkplaceNeeded" | "homeofficeOrMobileWorkRelevant" | "inclusionOfficeInvolved" | "rehabCarrierInvolved";
const checkpoints: Array<{ field: CheckpointField; label: string }> = [
  { field: "technicalAidNeeded", label: "technische Arbeitshilfe" },
  { field: "organizationalAdjustmentNeeded", label: "Arbeitsorganisation" },
  { field: "workingTimeAdjustmentNeeded", label: "Arbeitszeit / Lage" },
  { field: "qualificationNeeded", label: "Qualifizierung" },
  { field: "fixedWorkplaceNeeded", label: "fester Arbeitsplatz" },
  { field: "homeofficeOrMobileWorkRelevant", label: "Homeoffice / mobile Arbeit" },
  { field: "inclusionOfficeInvolved", label: "Inklusionsamt einbezogen" },
  { field: "rehabCarrierInvolved", label: "Reha-Träger einbezogen" },
];

export function WorkplaceAccommodationAssessmentFields({ process, update }: WorkplaceAccommodationFieldsProps) {
  return (
    <>
    <div className="industrial-form-grid two-columns">
      <DeferredTextareaInput
        label="Gewünschte Gestaltung / Nachteilsausgleich"
        value={process.requestedAdjustment}
        textCommandFieldId="workplace-requested-adjustment"
        rows={4}
        onCommit={(value) => update({ requestedAdjustment: value })}
        wide
      />
      <DeferredTextareaInput
        label="Barriere / Einschränkung im Arbeitskontext"
        value={process.barrierOrLimitation ?? ""}
        textCommandFieldId="workplace-barrier-or-limitation"
        rows={4}
        onCommit={(value) => update({ barrierOrLimitation: value })}
        wide
      />
      <DeferredTextareaInput
        label="Arbeitsplatz / Arbeitsumfeld"
        value={process.workplaceContext ?? ""}
        textCommandFieldId="workplace-context"
        rows={3}
        onCommit={(value) => update({ workplaceContext: value })}
        wide
      />
      <DeferredTextareaInput
        label="Lösungsvorschlag / konkrete Maßnahme"
        value={process.proposedSolution ?? ""}
        textCommandFieldId="workplace-proposed-solution"
        rows={3}
        onCommit={(value) => update({ proposedSolution: value })}
        wide
      />
    </div>
      <fieldset className="industrial-subsection compact">
        <legend><CheckCircle2 className="inline-icon" /> Prüfpunkte</legend>
        <div className="industrial-checkbox-grid">
          {checkpoints.map(({ field, label }) => (
            <CheckboxField key={field} label={label} checked={process[field]} onCheckedChange={(checked) => update({ [field]: checked })} />
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function WorkplaceAccommodationOutcomeFields({ process, update }: WorkplaceAccommodationFieldsProps) {
  return (
    <div className="industrial-form-grid two-columns">
      <DeferredTextareaInput
        label="Nächster Schritt"
        value={process.nextStep ?? ""}
        textCommandFieldId="workplace-next-step"
        rows={3}
        onCommit={(value) => update({ nextStep: value })}
        wide
      />
      <DeferredTextareaInput
        label="Ergebnis / Abschlussvermerk"
        value={process.outcome ?? ""}
        textCommandFieldId="workplace-outcome"
        rows={3}
        onCommit={(value) => update({ outcome: value })}
        wide
      />
    </div>
  );
}
