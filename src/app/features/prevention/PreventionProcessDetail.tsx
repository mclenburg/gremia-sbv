import type {
  PreventionDifficultyType,
  PreventionProcessRecord,
  PreventionRiskType,
  PreventionStatus,
  UpdatePreventionProcessInput,
} from "../../core/models/prevention.model";
import {
  DeferredDateTimeInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import {
  ProcessDetailHeader,
  ProcessSection,
} from "../../shared/process/ProcessDetailHeader";
import type { CaseProcessType } from "../cases/caseWorkbenchTypes";
import {
  fromDateTimeLocalValue,
  processTypeLabel,
  toDateTimeLocalValue,
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

function preventionStatusReached(
  current: PreventionStatus,
  minimum: PreventionStatus,
): boolean {
  return (
    preventionStatusOrder.indexOf(current) >=
    preventionStatusOrder.indexOf(minimum)
  );
}

function canShowEmployerReactionSection(status: PreventionStatus): boolean {
  return preventionStatusReached(status, "arbeitgeber_reagiert");
}

function canShowMeasureClarificationSection(status: PreventionStatus): boolean {
  return (
    preventionStatusReached(status, "massnahmen_in_klaerung") ||
    status === "blockiert_verweigert"
  );
}

function canShowResultSection(status: PreventionStatus): boolean {
  return status === "abgeschlossen" || status === "blockiert_verweigert";
}

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function PreventionProcessDetail({
  processType,
  process,
  onUpdate,
  onOpenTemplates,
}: {
  processType: CaseProcessType;
  process?: PreventionProcessRecord;
  onUpdate: (
    processId: string,
    input: UpdatePreventionProcessInput,
  ) => void | Promise<void>;
  onOpenTemplates: (process: PreventionProcessRecord) => void | Promise<void>;
}) {
  if (processType !== "prevention") {
    return (
      <article className="case-detail-content">
        <p className="industrial-meta">
          Dieses Fachmodul ist noch nicht vollständig umgesetzt. Die Maßnahme
          wurde als fallbezogene Notiz vorgemerkt und erscheint in der
          Fallhistorie.
        </p>
      </article>
    );
  }

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
          title={processTypeLabel(processType)}
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

          {preventionStatusReached(process.status, "angefordert") && (
            <ProcessSection
              title="2. Anforderung an den Arbeitgeber"
              objective="Frist und Anforderung müssen nachvollziehbar dokumentiert sein."
              announceOnMount="Abschnitt Anforderung an den Arbeitgeber wurde eingeblendet."
            >
              <div className="industrial-form-grid">
                <DeferredDateTimeInput
                  label="Arbeitgeber angefordert am"
                  value={toDateTimeLocalValue(process.requestedAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      requestedAt: normalizeDateTime(value),
                    })
                  }
                />
                <DeferredDateTimeInput
                  label="Frist Arbeitgeberreaktion"
                  value={toDateTimeLocalValue(process.employerResponseDueAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      employerResponseDueAt: normalizeDateTime(value),
                    })
                  }
                />
              </div>
            </ProcessSection>
          )}

          {canShowEmployerReactionSection(process.status) && (
            <ProcessSection
              title="3. Reaktion des Arbeitgebers"
              objective="Hier gehört der Stand der Arbeitgeberseite hin, nicht die gesundheitliche Bewertung der betroffenen Person."
              announceOnMount="Abschnitt Reaktion des Arbeitgebers wurde eingeblendet."
            >
              <DeferredTextareaInput
                label="Arbeitgeberreaktion / Stand"
                value={process.employerRequestSummary ?? ""}
                textCommandFieldId="prevention-employer-reaction"
                onCommit={(value) =>
                  onUpdate(process.id, { employerRequestSummary: value })
                }
                wide
              />
            </ProcessSection>
          )}

          {canShowMeasureClarificationSection(process.status) && (
            <ProcessSection
              title="4. Maßnahmenklärung und Umsetzung"
              objective="Maßnahmen brauchen Verantwortlichkeit, Timing und spätere Wirksamkeitsprüfung."
              announceOnMount="Abschnitt Maßnahmenklärung und Umsetzung wurde eingeblendet."
            >
              {/* DeferredTextareaInput keeps the historic blur-save contract:
                  defaultValue={process.measures ?? ''}
                  onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })} */}
              <DeferredTextareaInput
                label="Maßnahmen"
                value={process.measures ?? ""}
                textCommandFieldId="prevention-measures"
                onCommit={(value) => onUpdate(process.id, { measures: value })}
                wide
              />
            </ProcessSection>
          )}

          {canShowResultSection(process.status) && (
            <ProcessSection
              title="5. Ergebnis / Abschluss"
              objective="Blockade und Abschluss getrennt und prüffähig festhalten."
              announceOnMount="Abschnitt Ergebnis und Abschluss wurde eingeblendet."
            >
              <DeferredTextareaInput
                label="Ergebnis / Abschluss"
                value={process.result ?? ""}
                textCommandFieldId="prevention-result"
                onCommit={(value) => onUpdate(process.id, { result: value })}
                wide
              />
            </ProcessSection>
          )}
        </div>
      </div>
    </article>
  );
}
