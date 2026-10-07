import { AlertTriangle } from "lucide-react";
import {
  workplaceAccommodationCategoryLabels,
  workplaceAccommodationStatusLabels,
  type UpdateWorkplaceAccommodationInput,
  type WorkplaceAccommodationRecord,
} from "../../../domain/models/workplace-accommodation.model";
import { MeasureDetailFrame } from "../cases/measures/MeasureDetailFrame";
import { WorkplaceAccommodationFundingSection } from "./WorkplaceAccommodationFundingSection";

import { WorkplaceAccommodationStatusFields, riskLabels } from "./WorkplaceAccommodationStatusFields";
import { WorkplaceAccommodationAssessmentFields, WorkplaceAccommodationOutcomeFields } from "./WorkplaceAccommodationAssessmentFields";

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
            <AlertTriangle className="industrial-icon" />
            {rejectedWithoutInclusionOffice
              ? "Ablehnung dokumentiert. Einschaltung des Inklusionsamts bzw. weitere Eskalation prüfen."
              : "Arbeitgeberreaktion ist offen. Wiedervorlage und konkrete Unterlagenanforderung prüfen."}
          </div>
        )}

        <WorkplaceAccommodationStatusFields process={process} update={update} />
        <WorkplaceAccommodationAssessmentFields process={process} update={update} />
        <WorkplaceAccommodationFundingSection process={process} onUpdate={update} />
        <WorkplaceAccommodationOutcomeFields process={process} update={update} />
      </div>
    </MeasureDetailFrame>
  );
}
