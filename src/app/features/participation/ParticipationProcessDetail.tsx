import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
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
import { TextCommandTextarea } from "../../shared/textCommands/TextCommandTextarea";
import {
  getParticipationActionLabels,
  getParticipationDocumentRequirements,
  getParticipationEscalationAdvice,
} from "./participationPolicy";

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
  const escalation = getParticipationEscalationAdvice(process);
  const documentRequirements = getParticipationDocumentRequirements(process.measureType);
  const actionLabels = getParticipationActionLabels(process);

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

        <section
          className={`participation-escalation-panel participation-escalation-${escalation.level}`}
          aria-label="Eskalationsbewertung der SBV-Beteiligung"
        >
          <div className="participation-section-head">
            <div>
              <p className="industrial-kicker">Handlungslinie</p>
              <h3>{escalation.title}</h3>
            </div>
            <span>{escalation.level === "critical" ? "kritisch" : escalation.level === "warning" ? "prüfen" : "stabil"}</span>
          </div>
          <p>{escalation.reason}</p>
          <p><strong>Nächster sauberer Schritt:</strong> {escalation.nextStep}</p>
          <div className="participation-action-chips" aria-label="Direkt ableitbare SBV-Aktionen">
            {actionLabels.map((label) => (
              <button type="button" className="industrial-button industrial-button-secondary" key={label}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="participation-document-matrix" aria-label="Unterlagenmatrix nach Maßnahmentyp">
          <div className="participation-section-head">
            <div>
              <p className="industrial-kicker">Unterlagenmatrix</p>
              <h3>Für {measureLabels[process.measureType]} vor Stellungnahme prüfen</h3>
            </div>
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <ul>
            {documentRequirements.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.reason}</span>
              </li>
            ))}
          </ul>
        </section>

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
              defaultValue={toDateTimeLocal(process.firstKnownAt)}
              onBlur={(event) =>
                update({ firstKnownAt: fromDateTimeLocal(event.currentTarget.value) })
              }
            />
          </IndustrialField>
          <IndustrialField label="Unterrichtung erhalten">
            <input
              type="datetime-local"
              defaultValue={toDateTimeLocal(process.informationReceivedAt)}
              onBlur={(event) =>
                update({
                  informationReceivedAt: fromDateTimeLocal(event.currentTarget.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Stellungnahmefrist">
            <input
              type="datetime-local"
              defaultValue={toDateTimeLocal(process.statementDueAt)}
              onBlur={(event) =>
                update({
                  statementDueAt: fromDateTimeLocal(event.currentTarget.value),
                })
              }
            />
          </IndustrialField>
          <IndustrialField label="Aussetzung verlangt">
            <input
              type="datetime-local"
              defaultValue={toDateTimeLocal(process.suspensionRequestedAt)}
              onBlur={(event) =>
                update({
                  suspensionRequestedAt: fromDateTimeLocal(event.currentTarget.value),
                  status: event.currentTarget.value
                    ? "aussetzung_verlangt"
                    : process.status,
                })
              }
            />
          </IndustrialField>
        </IndustrialFormGrid>

        <IndustrialFormGrid columns={2}>
          <IndustrialField label="Pflichtverstoß / fehlende Unterlagen">
            <TextCommandTextarea
              fieldId="participation-violation-summary"
              defaultValue={process.violationSummary ?? ""}
              rows={4}
              onBlur={(event) =>
                update({ violationSummary: event.currentTarget.value })
              }
            />
          </IndustrialField>
          <IndustrialField label="SBV-Position / Stellungnahme-Kern">
            <TextCommandTextarea
              fieldId="participation-sbv-position"
              defaultValue={process.sbvPosition ?? ""}
              rows={4}
              onBlur={(event) => update({ sbvPosition: event.currentTarget.value })}
            />
          </IndustrialField>
          <IndustrialField label="Nächster Schritt" wide>
            <TextCommandTextarea
              fieldId="participation-next-step"
              defaultValue={process.nextStep ?? ""}
              rows={3}
              onBlur={(event) => update({ nextStep: event.currentTarget.value })}
            />
          </IndustrialField>
        </IndustrialFormGrid>
      </div>
    </MeasureDetailFrame>
  );
}
