import { useEffect, useState } from "react";
import type { CaseNoteRecord } from "../../core/models/case-note.model";
import type {
  EqualizationProcessRecord,
  EqualizationStatus,
} from "../../core/models/equalization.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import {
  DeferredDateTimeInput,
  DeferredTextInput,
  DeferredTextareaInput,
  SelectInput,
} from "../../shared/components/IndustrialForm";
import { formatDateShort } from "../../shared/format/dates";
import {
  ProcessDetailHeader,
  ProcessSection,
} from "../../shared/process/ProcessDetailHeader";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../cases/caseWorkbenchFormat";
import { buildEqualizationGuidance } from "@services/equalizationGuidancePolicy";
import {
  equalizationStatusLabel,
  equalizationStatusOrder,
} from "./equalizationShared";

function normalizeDateTime(value: string): string | undefined {
  return value ? fromDateTimeLocalValue(value) : undefined;
}

function stripEqualizationNoteMarker(content: string): string {
  return content.replace(/^\[\[equalization:[^\]]+\]\]\s*/m, "").trim();
}

export function EqualizationProcessDetail({
  process,
  onUpdate,
  onOpenTemplates,
  secureNotes = [],
  onCreateSecureNote,
}: {
  process: EqualizationProcessRecord;
  onUpdate: (
    id: string,
    input: Partial<EqualizationProcessRecord>,
  ) => Promise<void>;
  onOpenTemplates?: (process: EqualizationProcessRecord) => void;
  secureNotes?: CaseNoteRecord[];
  onCreateSecureNote?: (
    process: EqualizationProcessRecord,
    content: string,
  ) => Promise<void>;
}) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [secureNoteDraft, setSecureNoteDraft] = useState("");
  const guidance = buildEqualizationGuidance(process);

  async function saveSecureNote() {
    const content = secureNoteDraft.trim();
    if (!content || !onCreateSecureNote) return;
    await onCreateSecureNote(process, content);
    setSecureNoteDraft("");
  }

  useEffect(() => {
    let active = true;
    async function loadWarnings() {
      try {
        const bridge = await waitForBridge();
        const rows = await bridge?.equalization?.warnings(process.id);
        if (active) setWarnings((rows ?? []).map((item) => item.message));
      } catch {
        if (active) setWarnings([]);
      }
    }
    void loadWarnings();
    return () => {
      active = false;
    };
  }, [process]);

  return (
    <article className="case-detail-content">
      <div className="case-detail-inline-form">
        <ProcessDetailHeader
          title="Gleichstellung / GdB"
          description="Beratung, Antrag, Bescheid und Widerspruchsfrist sauber dokumentieren. Die SBV unterstützt, entscheidet aber nicht über Antrag oder Widerspruch."
          documentAction={
            onOpenTemplates ? () => onOpenTemplates(process) : undefined
          }
          badges={[
            {
              label: "Status",
              value: equalizationStatusLabel(process.applicationStatus),
            },
            {
              label: "Bescheid",
              value: formatDateShort(process.decisionReceivedAt),
            },
            {
              label: "Widerspruch",
              value: formatDateShort(process.objectionDueAt),
            },
          ]}
        />

        <div className="industrial-message equalization-guidance-panel">
          <div>
            <strong>{guidance.title}</strong>
            <p>{guidance.objective}</p>
          </div>
          {guidance.suggestedNextStatus && (
            <ToolbarButton
              onClick={() =>
                void onUpdate(process.id, {
                  applicationStatus: guidance.suggestedNextStatus,
                })
              }
            >
              Status vorschlagen:{" "}
              {equalizationStatusLabel(guidance.suggestedNextStatus)}
            </ToolbarButton>
          )}
        </div>

        <div className="industrial-message equalization-privacy-panel">
          <strong>Gesundheitsdaten sparsam dokumentieren.</strong>
          <p>
            Für Gleichstellung und GdB reichen häufig Verfahrensstand, Fristen
            und SBV-Handlungsschritte. Diagnosen und Bescheiddetails gehören nur
            in verschlüsselte Notizen, wenn sie wirklich erforderlich sind.
          </p>
        </div>

        {warnings.length > 0 && (
          <div className="industrial-message industrial-message-warning">
            <strong>Hinweise</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="prevention-status-sections bem-status-sections">
          <ProcessSection
            title="Status und Antrag"
            objective="Antragseinreichung, Geschäftszeichen und Bearbeitungsstand nachvollziehbar halten."
          >
            <div className="industrial-form-grid">
              <SelectInput
                label="Status"
                value={process.applicationStatus}
                options={equalizationStatusOrder.map((status) => ({
                  value: status,
                  label: equalizationStatusLabel(status),
                }))}
                onValueChange={(value) =>
                  void onUpdate(process.id, {
                    applicationStatus: value as EqualizationStatus,
                  })
                }
              />
              <DeferredTextInput
                label="Geschäftszeichen / Agentur"
                value={process.agencyReference ?? ""}
                onCommit={(value) =>
                  onUpdate(process.id, { agencyReference: value })
                }
              />
              <DeferredDateTimeInput
                label="Antrag eingereicht am"
                value={toDateTimeLocalValue(process.applicationSubmittedAt)}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    applicationSubmittedAt: normalizeDateTime(value),
                  })
                }
              />
            </div>
          </ProcessSection>

          <ProcessSection
            title="Bescheid und Widerspruch"
            objective="Bei Ablehnung ist die Widerspruchsfrist der kritische Punkt."
          >
            <div className="industrial-form-grid">
              <DeferredDateTimeInput
                label="Bescheid erhalten am"
                value={toDateTimeLocalValue(process.decisionReceivedAt)}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    decisionReceivedAt: normalizeDateTime(value),
                  })
                }
              />
              <DeferredDateTimeInput
                label="Widerspruchsfrist"
                value={toDateTimeLocalValue(process.objectionDueAt)}
                onCommit={(value) =>
                  onUpdate(process.id, {
                    objectionDueAt: normalizeDateTime(value),
                  })
                }
              />
            </div>
            <DeferredTextareaInput
              label="Ergebnis / Bescheid"
              value={process.outcome ?? ""}
              textCommandFieldId="equalization-outcome"
              onCommit={(value) => onUpdate(process.id, { outcome: value })}
              wide
            />
          </ProcessSection>

          <ProcessSection
            title="Verschlüsselte SBV-Notizen / nächste Schritte"
            objective="Notizen zu Gleichstellung, GdB und Gesundheit werden als verschlüsselte Fallnotizen geführt und nicht mehr im Gleichstellungsdatensatz gespeichert."
          >
            {process.legacyPlaintextNotesPresent && (
              <div className="industrial-message industrial-message-warning">
                Es gibt Alt-Notizen aus einer früheren Version. Bitte in eine
                verschlüsselte Fallnotiz übertragen und danach den Altbestand
                bereinigen.
              </div>
            )}
            {secureNotes.length > 0 && (
              <div className="case-note-secure-list">
                {secureNotes.map((note) => (
                  <article key={note.id} className="case-note-secure-item">
                    <strong>{note.title}</strong>
                    <p>{stripEqualizationNoteMarker(note.content ?? "")}</p>
                  </article>
                ))}
              </div>
            )}
            <DeferredTextareaInput
              label="Neue verschlüsselte Notiz"
              value={secureNoteDraft}
              textCommandFieldId="equalization-secure-note"
              onCommit={setSecureNoteDraft}
              helpText="Die Notiz wird erst über den Button gespeichert. Verlassen des Feldes legt keine neue verschlüsselte Notiz mehr an."
              wide
            />
            <ToolbarButton
              onClick={() => void saveSecureNote()}
              disabled={!secureNoteDraft.trim() || !onCreateSecureNote}
            >
              Verschlüsselte Notiz speichern
            </ToolbarButton>
          </ProcessSection>
        </div>
      </div>
    </article>
  );
}
