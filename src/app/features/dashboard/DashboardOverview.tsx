import { DashboardCard } from "../../shared/components/DashboardCard";
import { DeadlineDashboardPanel } from "../deadlines/DeadlineDashboardPanel";
import { modules, type ModuleDefinition, type ViewId } from "../../core/navigation/modules";
import type { CaseRecord } from "../../core/models/case.model";
import type { DeadlineDashboardItem, DeadlineRecord } from "../../core/models/deadline.model";

type DashboardModuleGroupId = "core" | "processes" | "tools" | "administration";

export type DashboardModuleGroup = {
  id: DashboardModuleGroupId;
  title: string;
  description: string;
  modules: ModuleDefinition[];
};

export type DashboardWorkdaySummary = {
  criticalCount: number;
  dueSoonCount: number;
  activeCaseCount: number;
  privacyReviewCount: number;
  nextActionTitle: string;
  nextActionHint: string;
  nextActionTone: "default" | "warning" | "danger";
};

const MODULE_GROUPS: readonly {
  id: DashboardModuleGroupId;
  title: string;
  description: string;
  moduleIds: readonly ModuleDefinition["id"][];
}[] = [
  {
    id: "core",
    title: "Kernarbeit",
    description: "Tagessteuerung, Fallakten, Schutzstatus und Fristen.",
    moduleIds: ["persons", "cases", "deadlines"],
  },
  {
    id: "processes",
    title: "SBV-Verfahren",
    description: "BEM, Prävention, Beteiligung und sensible Einzelverfahren.",
    moduleIds: ["bem", "prevention", "participation", "workplace_accommodation", "equalization", "termination_hearing"],
  },
  {
    id: "tools",
    title: "Werkzeuge",
    description: "Vorlagen, Wissen, Kontakte und Berichte für die laufende Fallarbeit.",
    moduleIds: ["templates", "knowledge", "contacts", "reports"],
  },
  {
    id: "administration",
    title: "Administration",
    description: "Compliance, SBV-Steuerung und Einstellungen.",
    moduleIds: ["compliance", "sbv_control"],
  },
];

export function groupDashboardModules(moduleDefinitions: ModuleDefinition[] = modules): DashboardModuleGroup[] {
  return MODULE_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description,
    modules: group.moduleIds
      .map((moduleId) => moduleDefinitions.find((module) => module.id === moduleId))
      .filter((module): module is ModuleDefinition => Boolean(module)),
  })).filter((group) => group.modules.length > 0);
}

export function resolveDashboardWorkdaySummary({
  cases,
  deadlines,
  dashboardItems,
}: {
  cases: CaseRecord[];
  deadlines: DeadlineRecord[];
  dashboardItems: DeadlineDashboardItem[];
}): DashboardWorkdaySummary {
  const criticalCount = dashboardItems.filter((item) => item.dashboardState === "critical" || item.dashboardState === "overdue").length;
  const dueSoonCount = dashboardItems.filter((item) => item.dashboardState === "due_soon").length;
  const activeCaseCount = cases.filter((record) => record.status !== "abgeschlossen").length;
  const privacyReviewCount = cases.filter((record) => record.privacyReviewRequired || record.personBindingState === "legacy_unlinked" || record.handoverStatus === "expired").length;
  const openDeadlineCount = deadlines.filter((record) => record.status === "open" || record.status === "overdue").length;

  if (criticalCount > 0) {
    return {
      criticalCount,
      dueSoonCount,
      activeCaseCount,
      privacyReviewCount,
      nextActionTitle: `${criticalCount} kritische Frist${criticalCount === 1 ? "" : "en"}`,
      nextActionHint: "Fristen mit kritischem oder überfälligem Status zuerst bearbeiten.",
      nextActionTone: "danger",
    };
  }

  if (dueSoonCount > 0) {
    return {
      criticalCount,
      dueSoonCount,
      activeCaseCount,
      privacyReviewCount,
      nextActionTitle: `${dueSoonCount} Frist${dueSoonCount === 1 ? "" : "en"} innerhalb von 48h`,
      nextActionHint: "Heute nachfassen, Stellungnahme vorbereiten oder Wiedervorlage abschließen.",
      nextActionTone: "warning",
    };
  }

  if (privacyReviewCount > 0) {
    return {
      criticalCount,
      dueSoonCount,
      activeCaseCount,
      privacyReviewCount,
      nextActionTitle: `${privacyReviewCount} Datenschutzprüfung${privacyReviewCount === 1 ? "" : "en"}`,
      nextActionHint: "Altfall, abgelaufene Übergabe oder Fallbindung prüfen, bevor weiter dokumentiert wird.",
      nextActionTone: "warning",
    };
  }

  return {
    criticalCount,
    dueSoonCount,
    activeCaseCount,
    privacyReviewCount,
    nextActionTitle: openDeadlineCount ? `${openDeadlineCount} offene Frist${openDeadlineCount === 1 ? "" : "en"}` : "Keine kritische Tagesaktion",
    nextActionHint: openDeadlineCount ? "Offene Wiedervorlagen planmäßig bearbeiten." : "Aktuell ist keine kritische SBV-Aktion im Dashboard erkennbar.",
    nextActionTone: "default",
  };
}

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
  const summary = resolveDashboardWorkdaySummary({ cases, deadlines, dashboardItems });
  const moduleGroups = groupDashboardModules(modules);

  return (
    <div className="space-y-6">
      <section className="industrial-hero dashboard-workday-hero">
        <div>
          <p className="industrial-kicker">Dashboard</p>
          <h1 className="industrial-title">Was heute wichtig ist</h1>
          <p>{summary.nextActionHint}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="kritisch" value={String(summary.criticalCount)} tone="danger" />
          <Metric label="48h" value={String(summary.dueSoonCount)} tone="warning" />
          <Metric label="aktive Fälle" value={String(summary.activeCaseCount)} />
          <Metric label="Prüfung" value={String(summary.privacyReviewCount)} tone={summary.privacyReviewCount ? "warning" : "default"} />
        </div>
      </section>

      <section className={`industrial-panel dashboard-next-action dashboard-next-action-${summary.nextActionTone}`} aria-labelledby="dashboard-next-action-heading">
        <p className="industrial-kicker">Nächster sauberer Schritt</p>
        <h2 id="dashboard-next-action-heading">{summary.nextActionTitle}</h2>
        <p>{summary.nextActionHint}</p>
      </section>

      <DeadlineDashboardPanel
        items={dashboardItems}
        cases={cases}
        onEdit={onEditDeadline}
        onComplete={onCompleteDeadline}
      />

      <section className="dashboard-module-groups" aria-label="Module nach Arbeitsbereichen">
        {moduleGroups.map((group) => (
          <section key={group.id} className="industrial-panel dashboard-module-group" aria-labelledby={`dashboard-module-group-${group.id}`}>
            <div className="industrial-panel-heading">
              <div>
                <p className="industrial-kicker">{group.title}</p>
                <h2 id={`dashboard-module-group-${group.id}`}>{group.title}</h2>
                <p className="industrial-muted">{group.description}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.modules.map((module) => (
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
            </div>
          </section>
        ))}
      </section>
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
