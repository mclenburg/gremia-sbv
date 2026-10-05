import { useState } from "react";
import { DateTimeInput, FormActions, FormSection, SelectInput, TextareaInput, TextInput } from "../../../shared/components/IndustrialForm";
import { IndustrialButton } from "../../../shared/components/IndustrialButton";
import type { ComplianceIncidentCategory, ComplianceIncidentRiskLevel, CreateComplianceIncidentInput } from "../../../../domain/models/compliance.model";
import { INCIDENT_CATEGORIES, RISK_LEVELS } from "../complianceConstants";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "../complianceViewUtils";

function createBlankIncidentInput(): CreateComplianceIncidentInput {
  return {
    occurredAt: new Date().toISOString(),
    discoveredAt: new Date().toISOString(),
    category: "wrong_export",
    riskLevel: "medium",
    summary: "",
    affectedDataCategories: "",
    immediateMeasures: "",
  };
}

export function ComplianceIncidentForm({ onCreate }: { onCreate: (input: CreateComplianceIncidentInput) => Promise<boolean> }) {
  const [input, setInput] = useState(createBlankIncidentInput);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof CreateComplianceIncidentInput>(key: K, value: CreateComplianceIncidentInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (busy || !input.summary.trim()) return;
    setBusy(true);
    try {
      if (await onCreate(input)) {
        setInput((current) => current === input ? createBlankIncidentInput() : current);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormSection
      className="industrial-panel"
      kicker="Vorfall erfassen"
      title="Datenschutz- oder Sicherheitsereignis dokumentieren"
      description="Hier werden keine Falldaten ausgewertet. Die Auditierung speichert nur technische Vorgangsdaten."
    >
      <div className="industrial-form-grid">
        <DateTimeInput
          label="Vorfallzeitpunkt"
          value={toDateTimeLocalValue(input.occurredAt)}
          onValueChange={(value) =>
            update("occurredAt", fromDateTimeLocalValue(value))
          }
          required
        />
        <DateTimeInput
          label="Kenntnis der SBV"
          value={toDateTimeLocalValue(input.discoveredAt)}
          onValueChange={(value) =>
            update("discoveredAt", fromDateTimeLocalValue(value))
          }
          required
        />
        <SelectInput
          label="Art"
          value={input.category}
          options={INCIDENT_CATEGORIES}
          onValueChange={(value) =>
            update("category", value as ComplianceIncidentCategory)
          }
        />
        <SelectInput
          label="Risiko"
          value={input.riskLevel}
          options={RISK_LEVELS}
          onValueChange={(value) =>
            update("riskLevel", value as ComplianceIncidentRiskLevel)
          }
        />
        <TextInput
          label="Kurzbeschreibung"
          value={input.summary}
          onValueChange={(value) => update("summary", value)}
          wide
          required
          error={
            !input.summary.trim()
              ? "Kurzbeschreibung ist erforderlich."
              : undefined
          }
        />
        <TextareaInput
          label="Betroffene Datenkategorien"
          value={input.affectedDataCategories ?? ""}
          onValueChange={(value) => update("affectedDataCategories", value)}
          wide
        />
        <TextareaInput
          label="Sofortmaßnahmen"
          value={input.immediateMeasures ?? ""}
          onValueChange={(value) => update("immediateMeasures", value)}
          wide
        />
      </div>
      <FormActions align="start">
        <IndustrialButton onClick={() => void submit()} disabled={busy || !input.summary.trim()}>
          Vorfall speichern
        </IndustrialButton>
      </FormActions>
    </FormSection>
  );
}
