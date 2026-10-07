import {
  workplaceAccommodationCategoryLabels, workplaceAccommodationStatusLabels,
  type WorkplaceAccommodationCategory, type WorkplaceAccommodationEmployerResponseStatus,
  type WorkplaceAccommodationImplementationStatus, type WorkplaceAccommodationRiskLevel,
  type WorkplaceAccommodationStatus,
} from "../../../domain/models/workplace-accommodation.model";
import { DeferredDateTimeInput, DeferredTextInput, SelectInput } from "../../shared/components/IndustrialForm";
import { fromDateTimeLocal, toDateTimeLocal } from "../../shared/format/dates";
import type { WorkplaceAccommodationFieldsProps } from "./WorkplaceAccommodationAssessmentFields";

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

export const riskLabels: Record<WorkplaceAccommodationRiskLevel, string> = {
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

export function WorkplaceAccommodationStatusFields({ process, update }: WorkplaceAccommodationFieldsProps) {
  return (
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
  );
}
