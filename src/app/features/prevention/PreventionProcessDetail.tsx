import type {
  PreventionDifficultyType,
  PreventionProcessRecord,
  PreventionRiskType,
  PreventionStatus,
} from "../../../domain/models/prevention.model";
import {
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import {
  ProcessDetailHeader,
  ProcessSection,
} from "../../shared/process/ProcessDetailHeader";
import {
  processTypeLabel,
} from "../cases/caseWorkbenchFormat";
import { preventionStatusOrder, statusLabel } from "./preventionShared";
import { ActivityJournalContextButton } from "../activity-journal/components/ActivityJournalContextButton";

const preventionDifficultyOptions: {
  value: PreventionDifficultyType;
  label: string;
}[] = [
  { value: "personenbedingt", label: "personenbedingt" },
  { value: "verhaltensbedingt", label: "verhaltensbedingt" },
  { value: "betriebsbedingt", label: "betriebsbedingt" },
  { value: "organisatorisch", label: "organisatorisch" },
  {
    value: "gesundheitlich_arbeitsplatzbezogen",
    label: "gesundheitlich / arbeitsplatzbezogen",
  },
  { value: "konflikt_fuehrung", label: "Konflikt / Führung" },
  { value: "sonstiges", label: "sonstiges" },
];

const preventionRiskOptions: { value: PreventionRiskType; label: string }[] = [
  { value: "abmahnung", label: "Abmahnung" },
  { value: "kuendigung", label: "Kündigung" },
  { value: "umsetzung", label: "Umsetzung" },
  { value: "arbeitsunfaehigkeit", label: "Arbeitsunfähigkeit" },
  { value: "ueberlastung", label: "Überlastung" },
  { value: "leistungsverlust", label: "Leistungsverlust" },
  { value: "arbeitsplatzverlust", label: "Arbeitsplatzverlust" },
  { value: "sonstiges", label: "sonstiges" },
];

const personStatusOptions: {
  value: PreventionProcessRecord["personStatus"];
  label: string;
}[] = [
  { value: "unklar", label: "unklar" },
  { value: "schwerbehindert", label: "schwerbehindert" },
  { value: "gleichgestellt", label: "gleichgestellt" },
  { value: "antrag_laeuft", label: "Antrag läuft" },
];

import { PreventionFollowUpSections, type PreventionProcessEditorProps } from "./PreventionFollowUpSections";

export function PreventionProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
}: {
  process?: PreventionProcessRecord;
  onUpdate: PreventionProcessEditorProps["onUpdate"];
  onOpenTemplates: (process: PreventionProcessRecord) => void | Promise<void>;
}) {
  if (!process) {
    return (
      <article className="case-detail-content">
        <p className="industrial-meta">Präventionsverfahren nicht gefunden.</p>
      </article>
    );
  }

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title={processTypeLabel("prevention")}
          description="Prävention setzt vor dem BEM an: erkennbare Gefährdung, unverzügliche Beteiligung, konkrete Maßnahmenklärung."
          documentAction={() => void onOpenTemplates(process)}
          actions={
            <ActivityJournalContextButton
              context={{
                contextType: "prevention_process",
                contextId: process.id,
                caseId: process.caseId,
                title: "Präventionsverfahren",
              }}
            />
          }
          badges={[
            { label: "Status", value: statusLabel(process.status) },
            { label: "Risiko", value: process.riskType.replaceAll("_", " ") },
            { label: "Person", value: process.personStatus },
          ]}
        />

        <div className="industrial-message prevention-guidance-panel">
          <strong>Nächster sauberer Schritt</strong>
          <p>
            Prüfe, ob die Gefährdung dokumentiert, der Arbeitgeber mit Frist
            eingebunden und bei Blockade das Inklusionsamt eingeschaltet ist.
            Abschnitte werden erst sichtbar, wenn der Status fachlich erreicht
            ist.
          </p>
        </div>

        <div className="prevention-status-sections">
          <ProcessSection
            title="1. Prüfung und Ausgangslage"
            objective="Gefährdung beschreiben, ohne Diagnosen oder unnötige Gesundheitsdetails zu dokumentieren."
          >
            <div className="industrial-form-grid">
              <SelectInput
                label="Status"
                value={process.status}
                options={preventionStatusOrder.map((status) => ({
                  value: status,
                  label: statusLabel(status),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    status: value as PreventionStatus,
                  })
                }
              />
              <SelectInput
                label="Schwierigkeit"
                value={process.difficultyType}
                options={preventionDifficultyOptions}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    difficultyType: value as PreventionDifficultyType,
                  })
                }
              />
              <SelectInput
                label="Risiko"
                value={process.riskType}
                options={preventionRiskOptions}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    riskType: value as PreventionRiskType,
                  })
                }
              />
              <SelectInput
                label="Status Person"
                value={process.personStatus}
                options={personStatusOptions}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    personStatus:
                      value as PreventionProcessRecord["personStatus"],
                  })
                }
              />
            </div>
            <DeferredTextareaInput
              label="Gefährdung / Anlass"
              value={process.hazardDescription ?? ""}
              textCommandFieldId="prevention-hazard"
              onCommit={(value) =>
                onUpdate(process.id, { hazardDescription: value })
              }
              wide
            />
          </ProcessSection>

          <PreventionFollowUpSections process={process} onUpdate={onUpdate} />
        </div>
      </div>
    </article>
  );
}
