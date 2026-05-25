import { ShieldCheck } from "lucide-react";
import { ToolbarButton } from "../../../shared/components/IndustrialButton";
import { ComplianceBadge } from "../../../shared/components/StatusBadges";
import {
  IndustrialStatusCard,
} from "../../../shared/components/WorkbenchLayout";
import { complianceFindingToTone } from "../../../shared/status/statusTone";
import type { ComplianceStatusOverview } from "../../../core/models/compliance.model";
import { technicalLevelLabel } from "../complianceViewUtils";

export function ComplianceStatusPanel({
  overview,
  onRefresh,
}: {
  overview: ComplianceStatusOverview;
  onRefresh: () => void;
}) {
  return (
    <section
      className="industrial-panel"
      aria-label="Technischer Datenschutz- und Integritätsstatus"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Systemzustand</p>
          <h2>Datenschutz- und Integritätsstatus</h2>
          <p>
            Automatisch prüfbare Zustände: Tresor, temporäre Dateien,
            Datenbankschema und Audit-Hash-Chain.
          </p>
        </div>
        <ComplianceBadge
          finding="warning"
          label={
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Technische Prüfung
            </>
          }
          ariaLabel="Keine Gesamtbewertung der Datenschutzkonformität"
        />
      </div>

      <div className="industrial-status-grid">
        {overview.technicalItems.map((item) => (
          <IndustrialStatusCard
            key={item.id}
            title={item.label}
            tone={complianceFindingToTone(item.level)}
            statusLabel={technicalLevelLabel(item.level)}
            detail={item.detail}
          >
            {item.summary}
          </IndustrialStatusCard>
        ))}
      </div>

      {overview.nextTechnicalActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Technische Hinweise:</strong>
          <span>{overview.nextTechnicalActions.join(" · ")}</span>
        </div>
      )}

      <ToolbarButton onClick={onRefresh}>Systemzustand aktualisieren</ToolbarButton>
    </section>
  );
}
