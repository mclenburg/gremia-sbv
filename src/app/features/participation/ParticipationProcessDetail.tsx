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
import type { SbvParticipationViolationPrefill } from "../participation-violations/sbvParticipationViolationViewLogic";
import { buildParticipationViolationPrefillFromMeasure } from "../participation-violations/sbvParticipationViolationViewLogic";
import type { CaseRecord } from "../../core/models/case.model";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import {
  DeferredDateTimeInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import { MeasureDetailFrame } from "../cases/measures/MeasureDetailFrame";
import { ActivityJournalContextButton } from "../activity-journal/components/ActivityJournalContextButton";
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
  caseRecord,
  onOpenViolationPrefill,
}: {
  process?: ParticipationRecord;
  onUpdate: (
    processId: string,
    input: UpdateParticipationInput,
  ) => void | Promise<void>;
  caseRecord?: CaseRecord;
  onOpenViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
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
  const documentRequirements = getParticipationDocumentRequirements(
    process.measureType,
  );
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
      actions={
        <div className="industrial-search-actions">
          <ActivityJournalContextButton
            context={{
              contextType: "sbv_participation",
              contextId: process.id,
              caseId: process.caseId,
              title: process.title,
            }}
            compact
          />
          {onOpenViolationPrefill && (
            <ToolbarButton
              onClick={() => onOpenViolationPrefill(buildParticipationViolationPrefillFromMeasure(process, caseRecord))}
            >
              <FileWarning className="h-4 w-4" aria-hidden="true" /> Beteiligungsverstoß dokumentieren
            </ToolbarButton>
          )}
        </div>
      }
    >
      <div className="participation-case-detail">
        <div
          className="participation-check-matrix"
          aria-label="Prüfmatrix § 178 Abs. 2 SGB IX"
        >
          <ToolbarButton
            className={
              process.informationComplete ? "check-ok" : "check-missing"
            }
            onClick={() =>
              update({ informationComplete: !process.informationComplete })
            }
          >
            <CheckCircle2 className="h-4 w-4" /> Unterrichtung vollständig
          </ToolbarButton>
          <ToolbarButton
            className={
              process.hearingBeforeDecision ? "check-ok" : "check-missing"
            }
            onClick={() =>
              update({ hearingBeforeDecision: !process.hearingBeforeDecision })
            }
          >
            <ShieldCheck className="h-4 w-4" /> Anhörung vor Entscheidung
          </ToolbarButton>
          <ToolbarButton
            className={process.decisionNotified ? "check-ok" : "check-missing"}
            onClick={() =>
              update({ decisionNotified: !process.decisionNotified })
            }
          >
            <FileWarning className="h-4 w-4" /> Entscheidung mitgeteilt
          </ToolbarButton>
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
            <span>
              {escalation.level === "critical"
                ? "kritisch"
                : escalation.level === "warning"
                  ? "prüfen"
                  : "stabil"}
            </span>
          </div>
          <p>{escalation.reason}</p>
          <p>
            <strong>Nächster sauberer Schritt:</strong> {escalation.nextStep}
          </p>
          <div
            className="participation-action-chips"
            aria-label="Direkt ableitbare SBV-Aktionen"
          >
            {actionLabels.map((label) => (
              <ToolbarButton key={label}>{label}</ToolbarButton>
            ))}
          </div>
        </section>

        <section
          className="participation-document-matrix"
          aria-label="Unterlagenmatrix nach Maßnahmentyp"
        >
          <div className="participation-section-head">
            <div>
              <p className="industrial-kicker">Unterlagenmatrix</p>
              <h3>
                Für {measureLabels[process.measureType]} vor Stellungnahme
                prüfen
              </h3>
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

        <div className="industrial-form-grid">
          <SelectInput
            label="Status"
            value={process.status}
            options={statusOrder.map((item) => ({
              value: item,
              label: statusLabels[item],
            }))}
            onValueChange={(value) =>
              update({ status: value as ParticipationStatus })
            }
          />
          <SelectInput
            label="Arbeitgebermaßnahme"
            value={process.measureType}
            options={measureOrder.map((item) => ({
              value: item,
              label: measureLabels[item],
            }))}
            onValueChange={(value) =>
              update({ measureType: value as ParticipationMeasureType })
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
              update({ riskLevel: value as ParticipationRiskLevel })
            }
          />
          <SelectInput
            label="Personenstatus"
            value={process.personStatus}
            options={personStatusOrder.map((item) => ({
              value: item,
              label: personStatusLabels[item],
            }))}
            onValueChange={(value) =>
              update({ personStatus: value as ParticipationPersonStatus })
            }
          />
          <SelectInput
            label="Entscheidungsstand"
            value={process.decisionStage}
            options={decisionStageOrder.map((item) => ({
              value: item,
              label: decisionStageLabels[item],
            }))}
            onValueChange={(value) =>
              update({ decisionStage: value as ParticipationDecisionStage })
            }
          />
          <DeferredDateTimeInput
            label="Kenntnis der SBV"
            value={toDateTimeLocal(process.firstKnownAt)}
            onCommit={(value) =>
              update({ firstKnownAt: fromDateTimeLocal(value) })
            }
          />
          <DeferredDateTimeInput
            label="Unterrichtung erhalten"
            value={toDateTimeLocal(process.informationReceivedAt)}
            onCommit={(value) =>
              update({ informationReceivedAt: fromDateTimeLocal(value) })
            }
          />
          <DeferredDateTimeInput
            label="Stellungnahmefrist"
            value={toDateTimeLocal(process.statementDueAt)}
            onCommit={(value) =>
              update({ statementDueAt: fromDateTimeLocal(value) })
            }
          />
          <DeferredDateTimeInput
            label="Aussetzung verlangt"
            value={toDateTimeLocal(process.suspensionRequestedAt)}
            onCommit={(value) =>
              update({
                suspensionRequestedAt: fromDateTimeLocal(value),
                status: value ? "aussetzung_verlangt" : process.status,
              })
            }
          />
        </div>

        <div className="industrial-form-grid two-columns">
          <DeferredTextareaInput
            label="Pflichtverstoß / fehlende Unterlagen"
            value={process.violationSummary ?? ""}
            textCommandFieldId="participation-violation-summary"
            rows={4}
            onCommit={(value) => update({ violationSummary: value })}
            wide
          />
          <DeferredTextareaInput
            label="SBV-Position / Stellungnahme-Kern"
            value={process.sbvPosition ?? ""}
            textCommandFieldId="participation-sbv-position"
            rows={4}
            onCommit={(value) => update({ sbvPosition: value })}
            wide
          />
          <DeferredTextareaInput
            label="Nächster Schritt"
            value={process.nextStep ?? ""}
            textCommandFieldId="participation-next-step"
            rows={3}
            onCommit={(value) => update({ nextStep: value })}
            wide
          />
        </div>
      </div>
    </MeasureDetailFrame>
  );
}
