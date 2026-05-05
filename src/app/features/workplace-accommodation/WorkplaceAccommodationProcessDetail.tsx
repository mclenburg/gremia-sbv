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
  IndustrialCheckboxRow,
  IndustrialField,
  IndustrialFormGrid,
} from "../../shared/components/WorkbenchLayout";
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

        <IndustrialFormGrid columns={3}>
          <IndustrialField label="Status">
            <select
              value={process.status}
              onChange={(event) =>
                update({
                  status: event.target.value as WorkplaceAccommodationStatus,
                })
              }
            >
              {statusOrder.map((item) => (
                <option key={item} value={item}>
                  {workplaceAccommodationStatusLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Kategorie">
            <select
              value={process.category}
              onChange={(event) =>
                update({
                  category: event.target
                    .value as WorkplaceAccommodationCategory,
                })
              }
            >
              {categoryOrder.map((item) => (
                <option key={item} value={item}>
                  {workplaceAccommodationCategoryLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Risiko">
            <select
              value={process.riskLevel}
              onChange={(event) =>
                update({
                  riskLevel: event.target
                    .value as WorkplaceAccommodationRiskLevel,
                })
              }
            >
              {riskOrder.map((item) => (
                <option key={item} value={item}>
                  {riskLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Arbeitgeberreaktion">
            <select
              value={process.employerResponseStatus}
              onChange={(event) =>
                update({
                  employerResponseStatus: event.target
                    .value as WorkplaceAccommodationEmployerResponseStatus,
                })
              }
            >
              {employerResponseOrder.map((item) => (
                <option key={item} value={item}>
                  {employerResponseLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Reaktion erhalten">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.employerResponseAt)}
              onChange={(event) =>
                update({
                  employerResponseAt: fromDateTimeLocal(event.target.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Umsetzung">
            <select
              value={process.implementationStatus}
              onChange={(event) =>
                update({
                  implementationStatus: event.target
                    .value as WorkplaceAccommodationImplementationStatus,
                })
              }
            >
              {implementationOrder.map((item) => (
                <option key={item} value={item}>
                  {implementationLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Umsetzung bis">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.implementationDueAt)}
              onChange={(event) =>
                update({
                  implementationDueAt: fromDateTimeLocal(event.target.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Wirksamkeitsprüfung">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.effectivenessReviewAt)}
              onChange={(event) =>
                update({
                  effectivenessReviewAt: fromDateTimeLocal(event.target.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Rechtsgrundlage">
            <input
              value={process.legalBasis}
              onChange={(event) => update({ legalBasis: event.target.value })}
            />
          </IndustrialField>
        </IndustrialFormGrid>

        <IndustrialFormGrid columns={2}>
          <IndustrialField label="Gewünschte Gestaltung / Nachteilsausgleich">
            <textarea
              value={process.requestedAdjustment}
              rows={4}
              onChange={(event) =>
                update({ requestedAdjustment: event.target.value })
              }
            />
          </IndustrialField>
          <IndustrialField label="Barriere / Einschränkung im Arbeitskontext">
            <textarea
              value={process.barrierOrLimitation ?? ""}
              rows={4}
              onChange={(event) =>
                update({ barrierOrLimitation: event.target.value })
              }
            />
          </IndustrialField>
          <IndustrialField label="Arbeitsplatz / Arbeitsumfeld">
            <textarea
              value={process.workplaceContext ?? ""}
              rows={3}
              onChange={(event) =>
                update({ workplaceContext: event.target.value })
              }
            />
          </IndustrialField>
          <IndustrialField label="Lösungsvorschlag / konkrete Maßnahme">
            <textarea
              value={process.proposedSolution ?? ""}
              rows={3}
              onChange={(event) =>
                update({ proposedSolution: event.target.value })
              }
            />
          </IndustrialField>
        </IndustrialFormGrid>

        <div className="industrial-subsection compact">
          <h3>
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            Prüfpunkte
          </h3>
          <div className="industrial-checkbox-grid">
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.technicalAidNeeded}
                  onChange={(event) =>
                    update({ technicalAidNeeded: event.target.checked })
                  }
                />{" "}
                <span>technische Arbeitshilfe</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.organizationalAdjustmentNeeded}
                  onChange={(event) =>
                    update({
                      organizationalAdjustmentNeeded: event.target.checked,
                    })
                  }
                />{" "}
                <span>Arbeitsorganisation</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.workingTimeAdjustmentNeeded}
                  onChange={(event) =>
                    update({
                      workingTimeAdjustmentNeeded: event.target.checked,
                    })
                  }
                />{" "}
                <span>Arbeitszeit / Lage</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.qualificationNeeded}
                  onChange={(event) =>
                    update({ qualificationNeeded: event.target.checked })
                  }
                />{" "}
                <span>Qualifizierung</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.fixedWorkplaceNeeded}
                  onChange={(event) =>
                    update({ fixedWorkplaceNeeded: event.target.checked })
                  }
                />{" "}
                <span>fester Arbeitsplatz</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.homeofficeOrMobileWorkRelevant}
                  onChange={(event) =>
                    update({
                      homeofficeOrMobileWorkRelevant: event.target.checked,
                    })
                  }
                />{" "}
                <span>Homeoffice / mobile Arbeit</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.inclusionOfficeInvolved}
                  onChange={(event) =>
                    update({ inclusionOfficeInvolved: event.target.checked })
                  }
                />{" "}
                <span>Inklusionsamt einbezogen</span>
              </label>
            </IndustrialCheckboxRow>
            <IndustrialCheckboxRow>
              <label>
                <input
                  type="checkbox"
                  checked={process.rehabCarrierInvolved}
                  onChange={(event) =>
                    update({ rehabCarrierInvolved: event.target.checked })
                  }
                />{" "}
                <span>Reha-Träger einbezogen</span>
              </label>
            </IndustrialCheckboxRow>
          </div>
        </div>

        <IndustrialFormGrid columns={2}>
          <IndustrialField label="Nächster Schritt">
            <textarea
              value={process.nextStep ?? ""}
              rows={3}
              onChange={(event) => update({ nextStep: event.target.value })}
            />
          </IndustrialField>
          <IndustrialField label="Ergebnis / Abschlussvermerk">
            <textarea
              value={process.outcome ?? ""}
              rows={3}
              onChange={(event) => update({ outcome: event.target.value })}
            />
          </IndustrialField>
        </IndustrialFormGrid>
      </div>
    </MeasureDetailFrame>
  );
}
