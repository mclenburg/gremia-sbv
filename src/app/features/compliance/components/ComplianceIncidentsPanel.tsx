import { useState } from "react";
import {
  CheckboxField,
  DateTimeInput,
  FormActions,
  FormSection,
  SelectInput,
  TextareaInput,
  TextInput,
} from "../../../shared/components/IndustrialForm";
import {
  ButtonGroup,
  IndustrialButton,
} from "../../../shared/components/IndustrialButton";
import {
  ProcessStatusBadge,
  RiskBadge,
} from "../../../shared/components/StatusBadges";
import {
  EmptyState,
  IndustrialPanelHeader,
  IndustrialSelectionCard,
  RecordList,
  SearchToolbar,
  recordMatchesQuery,
} from "../../../shared/components/WorkbenchLayout";
import { riskLevelToTone } from "../../../shared/status/statusTone";
import type {
  ComplianceIncidentCategory,
  ComplianceIncidentRecord,
  ComplianceIncidentRiskLevel,
  ComplianceIncidentStatus,
  CreateComplianceIncidentInput,
  UpdateComplianceIncidentInput,
} from "../../../core/models/compliance.model";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  RISK_LEVELS,
} from "../complianceConstants";
import {
  formatDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../complianceViewUtils";

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

export function ComplianceIncidentsPanel({
  incidents,
  onCreate,
  onUpdate,
}: {
  incidents: ComplianceIncidentRecord[];
  onCreate: (input: CreateComplianceIncidentInput) => void;
  onUpdate: (id: string, input: UpdateComplianceIncidentInput) => void;
}) {
  const [input, setInput] = useState<CreateComplianceIncidentInput>(() =>
    createBlankIncidentInput(),
  );
  const [incidentQuery, setIncidentQuery] = useState("");
  const visibleIncidents = incidents.filter((incident) =>
    recordMatchesQuery(
      [
        incident.summary,
        incident.category,
        incident.riskLevel,
        incident.status,
        incident.immediateMeasures ?? "",
      ],
      incidentQuery,
    ),
  );

  function update<K extends keyof CreateComplianceIncidentInput>(
    key: K,
    value: CreateComplianceIncidentInput[K],
  ) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    onCreate(input);
    setInput(createBlankIncidentInput());
  }

  return (
    <section
      className="industrial-split-grid compliance-incident-workspace"
      aria-label="Datenschutzvorfälle und Sicherheitsereignisse"
    >
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
          <IndustrialButton onClick={submit} disabled={!input.summary.trim()}>
            Vorfall speichern
          </IndustrialButton>
        </FormActions>
      </FormSection>

      <div className="industrial-panel">
        <IndustrialPanelHeader
          kicker="Vorfallliste"
          title="Offene und abgeschlossene Ereignisse"
        />
        <SearchToolbar
          searchValue={incidentQuery}
          onSearchChange={setIncidentQuery}
          searchLabel="Vorfallliste durchsuchen"
          searchPlaceholder="Kurzbeschreibung, Status, Risiko …"
          resultCount={visibleIncidents.length}
        />
        <RecordList
          items={visibleIncidents}
          getKey={(incident) => incident.id}
          ariaLabel="Gefilterte Datenschutzvorfälle"
          empty={
            <EmptyState
              title={
                incidents.length === 0 ? "Keine Datenschutzvorfälle" : "Keine Treffer"
              }
              text={
                incidents.length === 0
                  ? "Keine Datenschutzvorfälle dokumentiert."
                  : "Zur Suche passen keine Datenschutzvorfälle. Suchbegriff anpassen oder Filter leeren."
              }
            />
          }
          renderItem={(incident) => (
            <IndustrialSelectionCard
              tone={riskLevelToTone(incident.riskLevel)}
              ariaLabel={`Datenschutzvorfall ${incident.summary}`}
            >
              <div className="industrial-record-card-header">
                <div>
                  <h3>{incident.summary}</h3>
                  <p>
                    {INCIDENT_CATEGORIES.find(
                      (entry) => entry.value === incident.category,
                    )?.label ?? incident.category}{" "}
                    · Kenntnis: {formatDateTime(incident.discoveredAt)}
                  </p>
                </div>
                <ButtonGroup ariaLabel="Vorfallstatus und Risiko">
                  <ProcessStatusBadge
                    status={incident.status}
                    label={
                      INCIDENT_STATUSES.find(
                        (entry) => entry.value === incident.status,
                      )?.label ?? incident.status
                    }
                  />
                  <RiskBadge
                    risk={incident.riskLevel}
                    label={
                      RISK_LEVELS.find(
                        (entry) => entry.value === incident.riskLevel,
                      )?.label ?? incident.riskLevel
                    }
                  />
                </ButtonGroup>
              </div>
              <div className="industrial-record-meta">
                <SelectInput
                  label="Status"
                  value={incident.status}
                  options={INCIDENT_STATUSES}
                  onValueChange={(value) =>
                    onUpdate(incident.id, {
                      status: value as ComplianceIncidentStatus,
                      closedAt:
                        value === "closed"
                          ? new Date().toISOString()
                          : incident.closedAt,
                    })
                  }
                />
                <CheckboxField
                  label="Meldung an Aufsicht geprüft"
                  checked={incident.authorityNotificationChecked}
                  onCheckedChange={(checked) =>
                    onUpdate(incident.id, {
                      authorityNotificationChecked: checked,
                    })
                  }
                />
              </div>
              {incident.immediateMeasures && (
                <small>Sofortmaßnahmen: {incident.immediateMeasures}</small>
              )}
            </IndustrialSelectionCard>
          )}
        />
      </div>
    </section>
  );
}
