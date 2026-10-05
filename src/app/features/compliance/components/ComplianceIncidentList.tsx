import { useState } from "react";
import { CheckboxField, SelectInput } from "../../../shared/components/IndustrialForm";
import { ButtonGroup } from "../../../shared/components/IndustrialButton";
import { ProcessStatusBadge, RiskBadge } from "../../../shared/components/StatusBadges";
import { EmptyState, IndustrialPanelHeader, IndustrialSelectionCard, RecordList, SearchToolbar, recordMatchesQuery } from "../../../shared/components/WorkbenchLayout";
import { riskLevelToTone } from "../../../shared/status/statusTone";
import type { ComplianceIncidentRecord, ComplianceIncidentStatus, UpdateComplianceIncidentInput } from "../../../../domain/models/compliance.model";
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES, RISK_LEVELS } from "../complianceConstants";
import { formatDateTime } from "../complianceViewUtils";

type UpdateIncident = (id: string, input: UpdateComplianceIncidentInput) => void;

function ComplianceIncidentCard({ incident, onUpdate }: { incident: ComplianceIncidentRecord; onUpdate: UpdateIncident }) {
  return (
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
  );
}

export function ComplianceIncidentList({ incidents, onUpdate }: { incidents: ComplianceIncidentRecord[]; onUpdate: UpdateIncident }) {
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

  return (
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
          <ComplianceIncidentCard incident={incident} onUpdate={onUpdate} />
        )}
      />
    </div>
  );
}
