import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type {
  UpdateWorkplaceAccommodationInput,
  WorkplaceAccommodationCategory,
  WorkplaceAccommodationEmployerResponseStatus,
  WorkplaceAccommodationImplementationStatus,
  WorkplaceAccommodationRecord,
  WorkplaceAccommodationRiskLevel,
  WorkplaceAccommodationStatus,
} from "../../core/models/workplace-accommodation.model";
import {
  workplaceAccommodationCategoryLabels,
  workplaceAccommodationStatusLabels,
} from "../../core/models/workplace-accommodation.model";
import {
  CheckboxField,
  DeferredDateTimeInput,
  DeferredTextInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import { MeasureDetailFrame } from "../cases/measures/MeasureDetailFrame";

const statusOrder = Object.keys(
  workplaceAccommodationStatusLabels,
) as WorkplaceAccommodationStatus[];
const categoryOrder = Object.keys(
  workplaceAccommodationCategoryLabels,
) as WorkplaceAccommodationCategory[];
const riskOrder: WorkplaceAccommodationRiskLevel[] = [
  "normal",
  "erhoeht",
  "kritisch",
];
const employerResponseOrder: WorkplaceAccommodationEmployerResponseStatus[] = [
  "offen",
  "zugesagt",
  "teilweise_zugesagt",
  "abgelehnt",
  "klaerung_noetig",
];
const implementationOrder: WorkplaceAccommodationImplementationStatus[] = [
  "nicht_begonnen",
  "geplant",
  "in_umsetzung",
  "umgesetzt",
  "nicht_umgesetzt",
  "nicht_mehr_erforderlich",
];

const riskLabels: Record<WorkplaceAccommodationRiskLevel, string> = {
  normal: "normal",
  erhoeht: "erhöht",
  kritisch: "kritisch",
};
const employerResponseLabels: Record<
  WorkplaceAccommodationEmployerResponseStatus,
  string
> = {
  offen: "offen",
  zugesagt: "zugesagt",
  teilweise_zugesagt: "teilweise zugesagt",
  abgelehnt: "abgelehnt",
  klaerung_noetig: "Klärung nötig",
};
const implementationLabels: Record<
  WorkplaceAccommodationImplementationStatus,
  string
> = {
  nicht_begonnen: "nicht begonnen",
  geplant: "geplant",
  in_umsetzung: "in Umsetzung",
  umgesetzt: "umgesetzt",
  nicht_umgesetzt: "nicht umgesetzt",
  nicht_mehr_erforderlich: "nicht mehr erforderlich",
};

function toDateTimeLocal(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function WorkplaceAccommodationProcessDetail({
  process,
  onUpdate,
}: {
  process?: WorkplaceAccommodationRecord;
  onUpdate: (
    processId: string,
    input: UpdateWorkplaceAccommodationInput,
  ) => void | Promise<void>;
}) {
  if (!process) {
    return (
      <article className="case-detail-content">
        <h2>Arbeitsplatzgestaltung</h2>
        <p>
          Wähle eine Arbeitsplatzgestaltungsmaßnahme im Fallbaum aus oder lege
          sie über „Maßnahme“ in dieser Fallakte an.
        </p>
      </article>
    );
  }

  const update = (input: UpdateWorkplaceAccommodationInput) =>
    void onUpdate(process.id, input);
  const hasOpenEmployerResponse =
    process.employerResponseStatus === "offen" &&
    process.status !== "entwurf" &&
    process.status !== "abgeschlossen";
  const rejectedWithoutInclusionOffice =
    process.status === "arbeitgeber_lehnt_ab" &&
    !process.inclusionOfficeInvolved;

  return (
    <MeasureDetailFrame
      typeLabel="Arbeitsplatzgestaltung"
      title={process.title}
      statusLabel={workplaceAccommodationStatusLabels[process.status]}
      riskLevel={process.riskLevel}
      riskLabel={riskLabels[process.riskLevel]}
      summary={`§ 164 Abs. 4 SGB IX · ${workplaceAccommodationCategoryLabels[process.category]}`}
      nextStep={process.nextStep}
      requiresFollowUp={
        process.employerResponseStatus === "offen" ||
        process.implementationStatus === "nicht_begonnen"
      }
    >
      <div className="workplace-accommodation-detail">
        {(hasOpenEmployerResponse || rejectedWithoutInclusionOffice) && (
          <div className="industrial-message industrial-message-warning">
            <AlertTriangle className="h-4 w-4" />
            {rejectedWithoutInclusionOffice
              ? "Ablehnung dokumentiert. Einschaltung des Inklusionsamts bzw. weitere Eskalation prüfen."
              : "Arbeitgeberreaktion ist offen. Wiedervorlage und konkrete Unterlagenanforderung prüfen."}
          </div>
        )}

        <div className="industrial-form-grid">
          <SelectInput
            label="Status"
            value={process.status}
            options={statusOrder.map((item) => ({
              value: item,
              label: workplaceAccommodationStatusLabels[item],
            }))}
            onValueChange={(value) =>
              update({ status: value as WorkplaceAccommodationStatus })
            }
          />
          <SelectInput
            label="Kategorie"
            value={process.category}
            options={categoryOrder.map((item) => ({
              value: item,
              label: workplaceAccommodationCategoryLabels[item],
            }))}
            onValueChange={(value) =>
              update({ category: value as WorkplaceAccommodationCategory })
            }
          />
          <SelectInput
            label="Risiko"
            value={process.riskLevel}
            options={riskOrder.map((item) => ({
              value: item,
              label: riskLabels[item],
            }))}
            onValueChange={(value) =>
              update({ riskLevel: value as WorkplaceAccommodationRiskLevel })
            }
          />
          <SelectInput
            label="Arbeitgeberreaktion"
            value={process.employerResponseStatus}
            options={employerResponseOrder.map((item) => ({
              value: item,
              label: employerResponseLabels[item],
            }))}
            onValueChange={(value) =>
              update({
                employerResponseStatus:
                  value as WorkplaceAccommodationEmployerResponseStatus,
              })
            }
          />
          <DeferredDateTimeInput
            label="Reaktion erhalten"
            value={toDateTimeLocal(process.employerResponseAt)}
            onCommit={(value) =>
              update({ employerResponseAt: fromDateTimeLocal(value) })
            }
          />
          <SelectInput
            label="Umsetzung"
            value={process.implementationStatus}
            options={implementationOrder.map((item) => ({
              value: item,
              label: implementationLabels[item],
            }))}
            onValueChange={(value) =>
              update({
                implementationStatus:
                  value as WorkplaceAccommodationImplementationStatus,
              })
            }
          />
          <DeferredDateTimeInput
            label="Umsetzung bis"
            value={toDateTimeLocal(process.implementationDueAt)}
            onCommit={(value) =>
              update({ implementationDueAt: fromDateTimeLocal(value) })
            }
          />
          <DeferredDateTimeInput
            label="Wirksamkeitsprüfung"
            value={toDateTimeLocal(process.effectivenessReviewAt)}
            onCommit={(value) =>
              update({ effectivenessReviewAt: fromDateTimeLocal(value) })
            }
          />
          <DeferredTextInput
            label="Rechtsgrundlage"
            value={process.legalBasis}
            onCommit={(value) => update({ legalBasis: value })}
          />
        </div>

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
          <legend>
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            Prüfpunkte
          </legend>
          <div className="industrial-checkbox-grid">
            <CheckboxField
              label="technische Arbeitshilfe"
              checked={process.technicalAidNeeded}
              onCheckedChange={(checked) =>
                update({ technicalAidNeeded: checked })
              }
            />
            <CheckboxField
              label="Arbeitsorganisation"
              checked={process.organizationalAdjustmentNeeded}
              onCheckedChange={(checked) =>
                update({ organizationalAdjustmentNeeded: checked })
              }
            />
            <CheckboxField
              label="Arbeitszeit / Lage"
              checked={process.workingTimeAdjustmentNeeded}
              onCheckedChange={(checked) =>
                update({ workingTimeAdjustmentNeeded: checked })
              }
            />
            <CheckboxField
              label="Qualifizierung"
              checked={process.qualificationNeeded}
              onCheckedChange={(checked) =>
                update({ qualificationNeeded: checked })
              }
            />
            <CheckboxField
              label="fester Arbeitsplatz"
              checked={process.fixedWorkplaceNeeded}
              onCheckedChange={(checked) =>
                update({ fixedWorkplaceNeeded: checked })
              }
            />
            <CheckboxField
              label="Homeoffice / mobile Arbeit"
              checked={process.homeofficeOrMobileWorkRelevant}
              onCheckedChange={(checked) =>
                update({ homeofficeOrMobileWorkRelevant: checked })
              }
            />
            <CheckboxField
              label="Inklusionsamt einbezogen"
              checked={process.inclusionOfficeInvolved}
              onCheckedChange={(checked) =>
                update({ inclusionOfficeInvolved: checked })
              }
            />
            <CheckboxField
              label="Reha-Träger einbezogen"
              checked={process.rehabCarrierInvolved}
              onCheckedChange={(checked) =>
                update({ rehabCarrierInvolved: checked })
              }
            />
          </div>
        </fieldset>

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
      </div>
    </MeasureDetailFrame>
  );
}
