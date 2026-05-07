import { DashboardCard } from "../../shared/components/DashboardCard";
import { DeadlineDashboardPanel } from "../deadlines/DeadlineDashboardPanel";
import { modules, type ViewId } from "../../core/navigation/modules";
import type { CaseRecord } from "../../core/models/case.model";
import type { DeadlineDashboardItem, DeadlineRecord } from "../../core/models/deadline.model";

export function DashboardOverview({
  onNavigate,
  cases,
  deadlines,
  dashboardItems,
  onEditDeadline,
  onCompleteDeadline,
}: {
  onNavigate: (view: ViewId) => void;
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  dashboardItems: DeadlineDashboardItem[];
  onEditDeadline: (deadline: DeadlineRecord) => void;
  onCompleteDeadline: (deadline: DeadlineRecord) => void;
}) {
  const criticalCount = dashboardItems.filter(
    (item) =>
      item.dashboardState === "critical" || item.dashboardState === "overdue",
  ).length;
  const dueSoonCount = dashboardItems.filter(
    (item) => item.dashboardState === "due_soon",
  ).length;

  return (
    <div className="space-y-6">
      <section className="industrial-hero">
        <div>
          <p className="industrial-kicker">Dashboard</p>
          <h1 className="industrial-title">Arbeitsstand</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            label="kritisch"
            value={String(criticalCount)}
            tone="danger"
          />
          <Metric label="48h" value={String(dueSoonCount)} tone="warning" />
          <Metric label="Fälle" value={String(cases.length)} />
          <Metric label="Fristen" value={String(deadlines.length)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {modules.map((module) => (
          <DashboardCard
            key={module.id}
            {...module}
            disabled={module.status === "planned"}
            statusText={
              module.status === "planned"
                ? `In Entwicklung${module.plannedVersion ? ` · geplant ${module.plannedVersion}` : ""}`
                : undefined
            }
            onClick={() => {
              if (module.status === "planned") return;
              onNavigate(module.id);
            }}
          />
        ))}
      </section>

      <DeadlineDashboardPanel
        items={dashboardItems}
        cases={cases}
        onEdit={onEditDeadline}
        onComplete={onCompleteDeadline}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
