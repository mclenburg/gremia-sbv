import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import type {
  ParticipationDecisionStage,
  ParticipationMeasureType,
  ParticipationPersonStatus,
  ParticipationRecord,
  ParticipationRiskLevel,
  ParticipationStatus,
  UpdateParticipationInput,
} from "../../core/models/participation.model";
import {
  IndustrialField,
  IndustrialFormGrid,
} from "../../shared/components/WorkbenchLayout";
import { MeasureDetailFrame } from "../cases/measures/MeasureDetailFrame";

const measureLabels: Record<ParticipationMeasureType, string> = {
  einstellung: "Einstellung",
  versetzung: "Versetzung",
  arbeitszeit: "Arbeitszeit",
  arbeitsplatzgestaltung: "Arbeitsplatzgestaltung",
  abmahnung: "Abmahnung",
  kuendigung: "Kündigung",
  bem_praevention: "BEM / Prävention",
  regelung_praxis: "Regelung / betriebliche Praxis",
  sonstiges: "Sonstiges",
};

const statusLabels: Record<ParticipationStatus, string> = {
  neu: "Neu",
  unterrichtung_pruefen: "Unterrichtung prüfen",
  anhoerung_laeuft: "Anhörung läuft",
  stellungnahme_abgegeben: "Stellungnahme abgegeben",
  aussetzung_verlangt: "Aussetzung verlangt",
  nachholung_laeuft: "Nachholung läuft",
  abgeschlossen: "Abgeschlossen",
  pflichtverstoss_dokumentiert: "Pflichtverstoß dokumentiert",
};

const riskLabels: Record<ParticipationRiskLevel, string> = {
  normal: "normal",
  erhoeht: "erhöht",
  kritisch: "kritisch",
};
const personStatusLabels: Record<ParticipationPersonStatus, string> = {
  schwerbehindert: "schwerbehindert",
  gleichgestellt: "gleichgestellt",
  antrag_laeuft: "Antrag läuft",
  moeglich_betroffen: "möglicherweise betroffen",
  unklar: "unklar",
};
const decisionStageLabels: Record<ParticipationDecisionStage, string> = {
  vor_entscheidung: "vor Entscheidung",
  entscheidung_angekuendigt: "Entscheidung angekündigt",
  entscheidung_getroffen: "Entscheidung getroffen",
  umgesetzt: "umgesetzt",
  unklar: "unklar",
};

const statusOrder = Object.keys(statusLabels) as ParticipationStatus[];
const riskOrder = Object.keys(riskLabels) as ParticipationRiskLevel[];
const measureOrder = Object.keys(measureLabels) as ParticipationMeasureType[];
const personStatusOrder = Object.keys(
  personStatusLabels,
) as ParticipationPersonStatus[];
const decisionStageOrder = Object.keys(
  decisionStageLabels,
) as ParticipationDecisionStage[];

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

export function ParticipationProcessDetail({
  process,
  onUpdate,
}: {
  process?: ParticipationRecord;
  onUpdate: (
    processId: string,
    input: UpdateParticipationInput,
  ) => void | Promise<void>;
}) {
  if (!process) {
    return (
      <article className="case-detail-content">
        <h2>SBV-Beteiligung</h2>
        <p>
          Wähle eine Beteiligungsmaßnahme im Fallbaum aus oder lege sie über
          „Maßnahme“ in dieser Fallakte an.
        </p>
      </article>
    );
  }

  const update = (input: UpdateParticipationInput) =>
    void onUpdate(process.id, input);

  return (
    <MeasureDetailFrame
      typeLabel="SBV-Beteiligung"
      title={process.title}
      statusLabel={statusLabels[process.status]}
      riskLevel={process.riskLevel}
      riskLabel={riskLabels[process.riskLevel]}
      summary={`§ 178 Abs. 2 SGB IX · ${measureLabels[process.measureType]} · Cockpit nur zur Übersicht`}
      nextStep={process.nextStep}
      requiresFollowUp={
        !process.informationComplete || !process.hearingBeforeDecision
      }
    >
      <div className="participation-case-detail">
        <div
          className="participation-check-matrix"
          aria-label="Prüfmatrix § 178 Abs. 2 SGB IX"
        >
          <button
            type="button"
            className={
              process.informationComplete ? "check-ok" : "check-missing"
            }
            onClick={() =>
              update({ informationComplete: !process.informationComplete })
            }
          >
            <CheckCircle2 className="h-4 w-4" /> Unterrichtung vollständig
          </button>
          <button
            type="button"
            className={
              process.hearingBeforeDecision ? "check-ok" : "check-missing"
            }
            onClick={() =>
              update({ hearingBeforeDecision: !process.hearingBeforeDecision })
            }
          >
            <ShieldCheck className="h-4 w-4" /> Anhörung vor Entscheidung
          </button>
          <button
            type="button"
            className={process.decisionNotified ? "check-ok" : "check-missing"}
            onClick={() =>
              update({ decisionNotified: !process.decisionNotified })
            }
          >
            <FileWarning className="h-4 w-4" /> Entscheidung mitgeteilt
          </button>
        </div>

        {(!process.informationComplete ||
          ((process.decisionStage === "entscheidung_getroffen" ||
            process.decisionStage === "umgesetzt") &&
            !process.hearingBeforeDecision)) && (
          <div className="industrial-message industrial-message-warning">
            <AlertTriangle className="h-4 w-4" /> Beteiligung kritisch prüfen.
            Bei fehlender oder verspäteter Beteiligung Aussetzung nach § 178
            Abs. 2 Satz 2 SGB IX erwägen.
          </div>
        )}

        <IndustrialFormGrid columns={3}>
          <IndustrialField label="Status">
            <select
              value={process.status}
              onChange={(event) =>
                update({ status: event.target.value as ParticipationStatus })
              }
            >
              {statusOrder.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Arbeitgebermaßnahme">
            <select
              value={process.measureType}
              onChange={(event) =>
                update({
                  measureType: event.target.value as ParticipationMeasureType,
                })
              }
            >
              {measureOrder.map((item) => (
                <option key={item} value={item}>
                  {measureLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Risiko">
            <select
              value={process.riskLevel}
              onChange={(event) =>
                update({
                  riskLevel: event.target.value as ParticipationRiskLevel,
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
          <IndustrialField label="Personenstatus">
            <select
              value={process.personStatus}
              onChange={(event) =>
                update({
                  personStatus: event.target.value as ParticipationPersonStatus,
                })
              }
            >
              {personStatusOrder.map((item) => (
                <option key={item} value={item}>
                  {personStatusLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Entscheidungsstand">
            <select
              value={process.decisionStage}
              onChange={(event) =>
                update({
                  decisionStage: event.target
                    .value as ParticipationDecisionStage,
                })
              }
            >
              {decisionStageOrder.map((item) => (
                <option key={item} value={item}>
                  {decisionStageLabels[item]}
                </option>
              ))}
            </select>
          </IndustrialField>
          <IndustrialField label="Kenntnis der SBV">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.firstKnownAt)}
              onChange={(event) =>
                update({ firstKnownAt: fromDateTimeLocal(event.target.value) })
              }
            />
          </IndustrialField>
          <IndustrialField label="Unterrichtung erhalten">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.informationReceivedAt)}
              onChange={(event) =>
                update({
                  informationReceivedAt: fromDateTimeLocal(event.target.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Stellungnahmefrist">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.statementDueAt)}
              onChange={(event) =>
                update({
                  statementDueAt: fromDateTimeLocal(event.target.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Aussetzung verlangt">
            <input
              type="datetime-local"
              value={toDateTimeLocal(process.suspensionRequestedAt)}
              onChange={(event) =>
                update({
                  suspensionRequestedAt: fromDateTimeLocal(event.target.value),
                  status: event.target.value
                    ? "aussetzung_verlangt"
                    : process.status,
                })
              }
            />
          </IndustrialField>
        </IndustrialFormGrid>

        <IndustrialFormGrid columns={2}>
          <IndustrialField label="Pflichtverstoß / fehlende Unterlagen">
            <textarea
              value={process.violationSummary ?? ""}
              rows={4}
              onChange={(event) =>
                update({ violationSummary: event.target.value })
              }
            />
          </IndustrialField>
          <IndustrialField label="SBV-Position / Stellungnahme-Kern">
            <textarea
              value={process.sbvPosition ?? ""}
              rows={4}
              onChange={(event) => update({ sbvPosition: event.target.value })}
            />
          </IndustrialField>
          <IndustrialField label="Nächster Schritt" wide>
            <textarea
              value={process.nextStep ?? ""}
              rows={3}
              onChange={(event) => update({ nextStep: event.target.value })}
            />
          </IndustrialField>
        </IndustrialFormGrid>
      </div>
    </MeasureDetailFrame>
  );
}
