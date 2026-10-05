import type { PreventionProcessRecord, PreventionStatus, UpdatePreventionProcessInput } from "../../../domain/models/prevention.model";
import { DeferredDateTimeInput, DeferredTextareaInput } from "../../shared/components/IndustrialForm";
import { ProcessSection } from "../../shared/process/ProcessDetailHeader";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../cases/caseWorkbenchFormat";
import { preventionStatusOrder } from "./preventionShared";

export type PreventionProcessEditorProps = {
  process: PreventionProcessRecord;
  onUpdate: (processId: string, input: UpdatePreventionProcessInput) => void | Promise<void>;
};

function preventionStatusReached(
  current: PreventionStatus,
  minimum: PreventionStatus,
): boolean {
  return (
    preventionStatusOrder.indexOf(current) >=
    preventionStatusOrder.indexOf(minimum)
  );
}

function canShowResultSection(status: PreventionStatus): boolean {
  return status === "abgeschlossen" || status === "blockiert_verweigert";
}

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

export function PreventionFollowUpSections({ process, onUpdate }: PreventionProcessEditorProps) {
  return (
    <>
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

      {preventionStatusReached(process.status, "arbeitgeber_reagiert") && (
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

      {preventionStatusReached(process.status, "massnahmen_in_klaerung") && (
        <ProcessSection
          title="4. Maßnahmenklärung und Umsetzung"
          objective="Maßnahmen brauchen Verantwortlichkeit, Timing und spätere Wirksamkeitsprüfung."
          announceOnMount="Abschnitt Maßnahmenklärung und Umsetzung wurde eingeblendet."
        >
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
    </>
  );
}
