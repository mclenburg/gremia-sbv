import type { ComplianceIncidentRecord, CreateComplianceIncidentInput, UpdateComplianceIncidentInput } from "../../../../domain/models/compliance.model";
import { ComplianceIncidentForm } from "./ComplianceIncidentForm";
import { ComplianceIncidentList } from "./ComplianceIncidentList";

export function ComplianceIncidentsPanel({ incidents, onCreate, onUpdate }: {
  incidents: ComplianceIncidentRecord[];
  onCreate: (input: CreateComplianceIncidentInput) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateComplianceIncidentInput) => void;
}) {
  return (
    <section className="industrial-split-grid compliance-incident-workspace" aria-label="Datenschutzvorfälle und Sicherheitsereignisse">
      <ComplianceIncidentForm onCreate={onCreate} />
      <ComplianceIncidentList incidents={incidents} onUpdate={onUpdate} />
    </section>
  );
}
