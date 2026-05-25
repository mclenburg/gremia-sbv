import { ToolbarButton } from "../../../shared/components/IndustrialButton";
import { ComplianceBadge } from "../../../shared/components/StatusBadges";
import { IndustrialStatusCard } from "../../../shared/components/WorkbenchLayout";
import { complianceFindingToTone } from "../../../shared/status/statusTone";
import type { ComplianceSelfCheckResult } from "../../../core/models/compliance.model";

function selfCheckStatusLabel(status: ComplianceSelfCheckResult["status"]): string {
  if (status === "ok") return "OK";
  if (status === "problem") return "Problem";
  return "Prüfen";
}

export function ComplianceSelfCheckPanel({
  result,
  onRefresh,
}: {
  result: ComplianceSelfCheckResult;
  onRefresh: () => void;
}) {
  return (
    <section
      className="industrial-panel"
      aria-label="SBV-Sicherheits- und Datenschutz-Selbstcheck"
    >
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Selbstcheck</p>
          <h2>Sicherheits- und Datenschutzprüfung</h2>
          <p>
            Der Selbstcheck bündelt technische Integrität, Datenschutzprüfungen,
            Übergabedaten, Vorfälle und Exportnachweise.
          </p>
        </div>
        <ComplianceBadge finding={result.status} label={`${result.score} %`} />
      </div>
      <div className="industrial-status-grid">
        {result.items.map((entry) => (
          <IndustrialStatusCard
            key={entry.id}
            title={entry.label}
            tone={complianceFindingToTone(entry.status)}
            statusLabel={selfCheckStatusLabel(entry.status)}
            detail={entry.action}
          >
            {entry.summary}
          </IndustrialStatusCard>
        ))}
      </div>
      {result.nextActions.length > 0 && (
        <div className="industrial-action-note">
          <strong>Nächste Schritte:</strong>
          <span>{result.nextActions.join(" · ")}</span>
        </div>
      )}
      <ToolbarButton onClick={onRefresh}>Selbstcheck aktualisieren</ToolbarButton>
    </section>
  );
}
