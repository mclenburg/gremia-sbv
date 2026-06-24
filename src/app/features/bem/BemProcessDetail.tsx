import type {
  BemProcessRecord,
  BemResponse,
  BemStatus,
  BemTriggerType,
  UpdateBemProcessInput,
} from "../../core/models/bem.model";
import type { CaseProcessType } from "../cases/caseWorkbenchTypes";
import { formatDateShort } from "../../shared/format/dates";
import {
  fromDateTimeLocalValue,
  processTypeLabel,
  toDateTimeLocalValue,
} from "../cases/caseWorkbenchFormat";
import { bemStatusLabel, bemStatusOrder, bemStatusReached } from "./bemShared";
import {
  ProcessDetailHeader,
  ProcessSection,
} from "../../shared/process/ProcessDetailHeader";
import {
  DeferredDateTimeInput,
  DeferredTextInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import { ActivityJournalContextButton } from "../activity-journal/components/ActivityJournalContextButton";
import { buildBemStatusGuidance } from "@services/bemGuidancePolicy";

const triggerOptions: { value: BemTriggerType; label: string }[] = [
  { value: "sechs_wochen_au", label: "mehr als 6 Wochen AU" },
  { value: "wiederholt_au", label: "wiederholt arbeitsunfähig" },
  { value: "praeventiv", label: "präventiver Anlass" },
  { value: "arbeitgeberangebot", label: "Arbeitgeberangebot" },
  { value: "sbv_anregung", label: "SBV-Anregung" },
  { value: "sonstiges", label: "sonstiges" },
];

const responseOptions: { value: BemResponse; label: string }[] = [
  { value: "offen", label: "offen" },
  { value: "angenommen", label: "angenommen" },
  { value: "abgelehnt", label: "abgelehnt" },
  { value: "keine_reaktion", label: "keine Reaktion" },
];

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function BemProcessDetail({
  processType,
  process,
  onUpdate,
  onOpenTemplates,
}: {
  processType: CaseProcessType;
  process?: BemProcessRecord;
  onUpdate: (id: string, input: UpdateBemProcessInput) => Promise<void>;
  onOpenTemplates?: (process: BemProcessRecord) => void;
}) {
  if (!process || processType !== "bem") {
    return (
      <div className="case-detail-content">
        <h2>{processTypeLabel(processType)}</h2>
        <p>
          Dieses Verfahren ist noch nicht ausgewählt oder konnte nicht geladen
          werden.
        </p>
      </div>
    );
  }

  const showOfferSection = bemStatusReached(
    process.status,
    "angebot_vorzubereiten",
  );
  const showResponseSection =
    bemStatusReached(process.status, "reaktion_abwarten") ||
    process.employeeResponse !== "offen";
  const showMeetingSection =
    process.employeeResponse === "angenommen" ||
    bemStatusReached(process.status, "gespraech_geplant");
  const showMeasuresSection = bemStatusReached(
    process.status,
    "massnahmen_in_klaerung",
  );
  const showCompletionSection =
    process.status === "abgeschlossen" ||
    process.status === "abgebrochen" ||
    process.status === "abgelehnt";
  const guidance = buildBemStatusGuidance(process);

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title="BEM-Verfahren"
          description="BEM ist freiwillig, vertraulich und prozesshaft. Dokumentiere nur, was für die SBV-Arbeit wirklich erforderlich ist."
          documentAction={
            onOpenTemplates ? () => onOpenTemplates(process) : undefined
          }
          actions={
            <ActivityJournalContextButton
              context={{
                contextType: "bem_process",
                contextId: process.id,
                caseId: process.caseId,
                title: process.title,
              }}
            />
          }
          badges={[
            { label: "Status", value: bemStatusLabel(process.status) },
            {
              label: "Reaktion",
              value: process.employeeResponse.replaceAll("_", " "),
            },
            {
              label: "Frist",
              value: formatDateShort(process.responseDueAt) || "—",
            },
          ]}
        />
        <div className="industrial-message bem-guidance-panel">
          <div>
            <strong>{guidance.title}</strong>
            <p>{guidance.objective}</p>
          </div>
          {guidance.suggestedNextStatus && (
            <ToolbarButton
              onClick={() =>
                void onUpdate(process.id, {
                  status: guidance.suggestedNextStatus as BemStatus,
                })
              }
            >
              Status vorschlagen: {bemStatusLabel(guidance.suggestedNextStatus)}
            </ToolbarButton>
          )}
          {guidance.required.length > 0 && (
            <ul>
              {guidance.required.map((item) => (
                <li key={item.id} className={`bem-guidance-${item.level}`}>
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="prevention-status-sections bem-status-sections">
          <ProcessSection
            title="BEM-Auslöser"
            objective="Dokumentiert wird der Anlass, nicht eine Diagnose."
          >
            <div className="industrial-form-grid">
              <SelectInput
                label="Status"
                value={process.status}
                options={bemStatusOrder.map((status) => ({
                  value: status,
                  label: bemStatusLabel(status),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, { status: value as BemStatus })
                }
              />
              <DeferredTextInput
                label="Titel"
                value={process.title}
                onCommit={(value) => onUpdate(process.id, { title: value })}
              />
              <SelectInput
                label="Auslöser"
                value={process.triggerType}
                options={triggerOptions}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    triggerType: value as BemTriggerType,
                  })
                }
              />
              <DeferredTextInput
                label="AU-Tage in 12 Monaten"
                type="number"
                min="0"
                value={process.sicknessDaysTwelveMonths ?? ""}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    sicknessDaysTwelveMonths: value ? Number(value) : undefined,
                  })
                }
              />
            </div>
            <DeferredTextareaInput
              label="Anlass / Ausgangslage"
              value={process.triggerDescription ?? ""}
              textCommandFieldId="bem-trigger-description"
              onCommit={(value) =>
                onUpdate(process.id, { triggerDescription: value })
              }
              wide
            />
          </ProcessSection>

          {showOfferSection && (
            <ProcessSection
              title="BEM-Angebot"
              objective="Das Angebot muss freiwillig, verständlich und datenschutzklar erfolgen."
              announceOnMount="Abschnitt BEM-Angebot wurde eingeblendet."
            >
              <div className="industrial-form-grid">
                <DeferredDateTimeInput
                  label="Angebot versendet am"
                  value={toDateTimeLocalValue(process.bemOfferedAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      bemOfferedAt: normalizeDateTime(value),
                    })
                  }
                />
                <DeferredDateTimeInput
                  label="Reaktionsfrist"
                  value={toDateTimeLocalValue(process.responseDueAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      responseDueAt: normalizeDateTime(value),
                    })
                  }
                />
              </div>
            </ProcessSection>
          )}

          {showOfferSection && (
            <ProcessSection
              title="Datenschutz und Einwilligung"
              objective="BEM-Daten sind besonders sensibel. Reichweite, Freiwilligkeit und Widerruf müssen nachvollziehbar sein."
              announceOnMount="Abschnitt Datenschutz und Einwilligung wurde eingeblendet."
            >
              <div className="industrial-form-grid">
                <DeferredDateTimeInput
                  label="Datenschutzhinweis erteilt am"
                  value={toDateTimeLocalValue(process.privacyNoticeAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      privacyNoticeAt: normalizeDateTime(value),
                    })
                  }
                />
                <DeferredDateTimeInput
                  label="Widerruf am"
                  value={toDateTimeLocalValue(process.consentWithdrawnAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      consentWithdrawnAt: normalizeDateTime(value),
                    })
                  }
                />
              </div>
              <DeferredTextareaInput
                label="Einwilligungsumfang / Beteiligte"
                value={process.consentScope ?? ""}
                textCommandFieldId="bem-consent-scope"
                onCommit={(value) =>
                  onUpdate(process.id, { consentScope: value })
                }
                wide
              />
              <DeferredTextareaInput
                label="Aufbewahrung / Löschhinweis"
                value={process.dataRetentionNote ?? ""}
                textCommandFieldId="bem-data-retention-note"
                onCommit={(value) =>
                  onUpdate(process.id, { dataRetentionNote: value })
                }
                wide
              />
            </ProcessSection>
          )}

          {showResponseSection && (
            <ProcessSection
              title="Reaktion der betroffenen Person"
              objective="Ablehnung und Widerruf dürfen nicht zulasten der betroffenen Person als Pflichtverletzung dokumentiert werden."
              announceOnMount="Abschnitt Reaktion der betroffenen Person wurde eingeblendet."
            >
              <div className="industrial-form-grid">
                <SelectInput
                  label="Reaktion"
                  value={process.employeeResponse}
                  options={responseOptions}
                  onValueChange={(value) =>
                    void onUpdate(process.id, {
                      employeeResponse: value as BemResponse,
                    })
                  }
                />
                <DeferredDateTimeInput
                  label="Reaktion am"
                  value={toDateTimeLocalValue(process.employeeResponseAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      employeeResponseAt: normalizeDateTime(value),
                    })
                  }
                />
              </div>
            </ProcessSection>
          )}

          {showMeetingSection && (
            <ProcessSection
              title="Erstgespräch / Beteiligte"
              objective="Nur die von der betroffenen Person gewünschten oder erforderlichen Beteiligten aufnehmen."
              announceOnMount="Abschnitt Erstgespräch und Beteiligte wurde eingeblendet."
            >
              <div className="industrial-form-grid">
                <DeferredDateTimeInput
                  label="Erstgespräch"
                  value={toDateTimeLocalValue(process.firstMeetingAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      firstMeetingAt: normalizeDateTime(value),
                    })
                  }
                />
                <DeferredTextInput
                  label="Beteiligte"
                  value={process.participants ?? ""}
                  onCommit={(value) =>
                    onUpdate(process.id, { participants: value })
                  }
                />
              </div>
            </ProcessSection>
          )}

          {showMeasuresSection && (
            <ProcessSection
              title="Maßnahmenplan und Wirksamkeit"
              objective="Maßnahmen brauchen Verantwortliche, Termin und Wirksamkeitsprüfung."
              announceOnMount="Abschnitt Maßnahmenplan und Wirksamkeit wurde eingeblendet."
            >
              <DeferredTextareaInput
                label="Maßnahmenplan"
                value={process.measures ?? ""}
                textCommandFieldId="bem-measures"
                onCommit={(value) => onUpdate(process.id, { measures: value })}
                wide
              />
              <div className="industrial-form-grid">
                <DeferredTextInput
                  label="Verantwortliche / Umsetzung"
                  value={process.measureOwners ?? ""}
                  onCommit={(value) =>
                    onUpdate(process.id, { measureOwners: value })
                  }
                />
                <DeferredDateTimeInput
                  label="Nächste Wirksamkeitsprüfung"
                  value={toDateTimeLocalValue(process.nextReviewAt)}
                  onCommit={(value) =>
                    onUpdate(process.id, {
                      nextReviewAt: normalizeDateTime(value),
                    })
                  }
                />
              </div>
            </ProcessSection>
          )}

          {showCompletionSection && (
            <ProcessSection
              title="Abschluss"
              objective="Abschlussgrund, Ergebnis und offene Punkte gehören getrennt dokumentiert."
              announceOnMount="Abschnitt Abschluss wurde eingeblendet."
            >
              <DeferredTextInput
                label="Abschlussgrund"
                value={process.completionReason ?? ""}
                onCommit={(value) =>
                  onUpdate(process.id, { completionReason: value })
                }
              />
              <DeferredTextareaInput
                label="Ergebnis"
                value={process.result ?? ""}
                textCommandFieldId="bem-result"
                onCommit={(value) => onUpdate(process.id, { result: value })}
                wide
              />
            </ProcessSection>
          )}

          <ProcessSection
            title="Vertrauliche SBV-Notiz"
            objective="Dieses Feld ist für interne SBV-Abwägungen gedacht und beim Export besonders zu prüfen."
          >
            <DeferredTextareaInput
              label="Nur intern / hochsensibel"
              value={process.confidentialNotes ?? ""}
              textCommandFieldId="bem-confidential-notes"
              onCommit={(value) =>
                onUpdate(process.id, { confidentialNotes: value })
              }
              helpText="Keine Diagnosen oder unnötigen Gesundheitsdetails dokumentieren. Dieses Feld bleibt der internen SBV-Abwägung vorbehalten."
              wide
            />
          </ProcessSection>
        </div>
      </div>
    </article>
  );
}
