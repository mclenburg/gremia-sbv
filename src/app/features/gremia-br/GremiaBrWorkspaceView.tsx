import { useEffect, useState } from "react";
import type { GremiaBrDashboardOverview, GremiaBrPublicSettings } from "../../../domain/models/gremia-br.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { ToolbarButton } from "../../shared/components/IndustrialButton";
import { DataTable, EmptyState, WorkbenchSummary } from "../../shared/components/WorkbenchLayout";

const EMPTY_SETTINGS: GremiaBrPublicSettings = {
  enabled: false,
  serverUrl: "",
  username: "",
  hasStoredCredentials: false,
  apiMode: "legacy_read_bridge",
  relevanceSettings: { groups: [] },
};

const EMPTY_DASHBOARD: GremiaBrDashboardOverview = {
  upcomingMeetings: [],
  meetingAgendas: {},
  pendingFollowUps: [],
  decisions: [],
  dueDecisions: [],
  overdueDecisions: [],
  relevanceSettings: { groups: [] },
  relevantMeetings: [],
  openDecisionCount: 0,
  dueDecisionCount: 0,
  overdueDecisionCount: 0,
};

function workspaceLabel(settings: GremiaBrPublicSettings): string {
  return settings.selectedBodyName
    ?? settings.selectedSecurityDomain
    ?? "Noch kein SBV-Gremium ausgewählt";
}

function itemRecord(item: unknown): Record<string, unknown> | undefined {
  return item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : undefined;
}

export function gremiaBrItemTitle(item: unknown, fallback: string): string {
  const record = itemRecord(item);
  const value = record?.titel ?? record?.title ?? record?.name ?? record?.beschlusstext ?? record?.text ?? record?.reference;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function gremiaBrItemDate(item: unknown): string {
  const record = itemRecord(item);
  const value = record?.plannedStart ?? record?.datum ?? record?.date ?? record?.frist ?? record?.decidedAt;
  return typeof value === "string" && value.trim() ? value.trim() : "—";
}

export function resolveGremiaBrWorkspaceSummary(settings: GremiaBrPublicSettings, overview: GremiaBrDashboardOverview) {
  return [
    { label: "API-Modus", value: settings.apiMode === "gremia_br_v2" ? "2.0" : "Legacy" },
    { label: "Sitzungen im Cache", value: String(overview.upcomingMeetings.length) },
    { label: "SBV-Treffer", value: String(overview.relevantMeetings.length), tone: overview.relevantMeetings.length ? "warning" as const : "default" as const },
    { label: "Beschlüsse", value: String(overview.openDecisionCount) },
  ];
}

export function resolveGremiaBrMeetingRows(overview: GremiaBrDashboardOverview) {
  return overview.upcomingMeetings.slice(0, 8).map((meeting, index) => ({
    id: `meeting-${index}-${gremiaBrItemTitle(meeting, "Sitzung")}`,
    cells: [
      gremiaBrItemTitle(meeting, "Sitzung"),
      gremiaBrItemDate(meeting),
      overview.relevantMeetings.some((match) => match.item === meeting) ? "SBV-relevant" : "Lesekontext",
    ],
  }));
}

export function resolveGremiaBrDecisionRows(overview: GremiaBrDashboardOverview) {
  return overview.decisions.slice(0, 8).map((decision, index) => ({
    id: `decision-${index}-${gremiaBrItemTitle(decision, "Beschluss")}`,
    cells: [
      gremiaBrItemTitle(decision, "Beschluss"),
      gremiaBrItemDate(decision),
      itemRecord(decision)?.status as string | undefined ?? "—",
    ],
  }));
}

export function GremiaBrWorkspaceView() {
  const announce = useAnnouncer();
  const [settings, setSettings] = useState<GremiaBrPublicSettings>(EMPTY_SETTINGS);
  const [overview, setOverview] = useState<GremiaBrDashboardOverview>(EMPTY_DASHBOARD);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSettings() {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
    setSettings(await bridge.gremiaBr.getSettings());
    setOverview(await bridge.gremiaBr.getDashboardOverview());
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.gremiaBr) return;
        const next = await bridge.gremiaBr.getSettings();
        const cached = await bridge.gremiaBr.getDashboardOverview();
        if (active) {
          setSettings(next);
          setOverview(cached);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gremia.BR-Konfiguration konnte nicht geladen werden.";
        setError(message);
        announce(message, "assertive");
      }
    })();
    return () => { active = false; };
  }, [announce]);

  async function refreshReadContext() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
      const result = await bridge.gremiaBr.refreshCache();
      setOverview(result.cached as GremiaBrDashboardOverview);
      setStatus(result.message);
      announce(result.message, result.status === "ok" ? "polite" : "assertive");
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gremia.BR-Lesekontext konnte nicht aktualisiert werden.";
      setError(message);
      announce(message, "assertive");
    } finally {
      setBusy(false);
    }
  }

  if (!settings.enabled) {
    return (
      <section className="industrial-card no-card-hover" aria-labelledby="gremia-br-workspace-title">
        <p className="industrial-kicker">Optionale Gremiumsanbindung</p>
        <h1 id="gremia-br-workspace-title">Gremia.BR</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Die Gremia.BR-Anbindung ist nicht aktiviert. Gremia.SBV arbeitet vollständig lokal weiter.
        </p>
      </section>
    );
  }

  return (
    <section className="feature-stack" aria-labelledby="gremia-br-workspace-title">
      <div className="industrial-card no-card-hover">
        <p className="industrial-kicker">Optionale Gremiumsanbindung</p>
        <h1 id="gremia-br-workspace-title">Gremia.BR</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Zentrale Stelle für Gremia.BR-Lesekontext und später bewusst geprüfte PDF-Übergaben. Gremia.SBV synchronisiert keine Fallakten automatisch.
        </p>
      </div>

      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {status && <div className="industrial-message industrial-message-ok" role="status">{status}</div>}

      <div className="industrial-card no-card-hover">
        <p className="industrial-kicker">Konfiguration</p>
        <h2>Verbundene Instanz</h2>
        <dl className="industrial-meta-grid mt-3">
          <div><dt>Server</dt><dd>{settings.serverUrl}</dd></div>
          <div><dt>Benutzerkonto</dt><dd>{settings.username}</dd></div>
          <div><dt>API-Modus</dt><dd>{settings.apiMode === "gremia_br_v2" ? "Gremia.BR 2.0" : "Legacy-Lesebrücke"}</dd></div>
          <div><dt>SBV-Gremium</dt><dd>{workspaceLabel(settings)}</dd></div>
        </dl>
        {settings.apiMode === "gremia_br_v2" && !settings.selectedBodyId ? (
          <div className="industrial-message industrial-message-warning mt-4" role="status">
            Für Gremia.BR 2.0 muss in den Einstellungen ein berechtigtes SBV-Gremium ausgewählt sein, bevor Sitzungen oder PDF-Übergaben genutzt werden.
          </div>
        ) : null}
      </div>

      <WorkbenchSummary
        ariaLabel="Gremia.BR-Arbeitsbereich Zusammenfassung"
        items={resolveGremiaBrWorkspaceSummary(settings, overview)}
      />

      <div className="industrial-grid-two">
        <article className="industrial-card no-card-hover">
          <p className="industrial-kicker">Lesekontext</p>
          <h2>BR-/Gremienkontext abrufen</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Sitzungen, Tagesordnungen und Beschlüsse werden nur auf ausdrückliche Aktion geladen und lokal als Lesekontext genutzt.
          </p>
          <div className="industrial-action-row mt-4">
            <ToolbarButton disabled={busy} onClick={() => void refreshReadContext()}>
              {busy ? "Abruf läuft …" : "Lesekontext abrufen"}
            </ToolbarButton>
          </div>
        </article>

        <article className="industrial-card no-card-hover">
          <p className="industrial-kicker">PDF-Übergaben</p>
          <h2>Von Gremia.SBV erzeugte PDFs</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Der nächste Umsetzungsschritt aktiviert hier die geprüfte Übergabe zentral erzeugter PDF-Dokumente an das ausgewählte SBV-Gremium.
            Im Legacy-Modus bleibt dieser Bereich bewusst inaktiv.
          </p>
        </article>

        <article className="industrial-card no-card-hover">
          <p className="industrial-kicker">Freigaben</p>
          <h2>Weitergabe an BR oder andere Gremien</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Freigaben werden später ausschließlich hier vorbereitet, begründet, übertragen und widerrufen.
          </p>
        </article>
      </div>

      <div className="industrial-grid-two">
        <article className="industrial-card no-card-hover">
          <p className="industrial-kicker">Gelesene Sitzungen</p>
          <h2>Sitzungen im lokalen Cache</h2>
          <DataTable
            ariaLabel="Gremia.BR-Sitzungen im lokalen Cache"
            headers={["Sitzung", "Termin", "Einordnung"]}
            rows={resolveGremiaBrMeetingRows(overview)}
            empty={<EmptyState title="Kein Lesekontext" text="Noch keine Sitzungen aus Gremia.BR abgerufen." />}
          />
        </article>

        <article className="industrial-card no-card-hover">
          <p className="industrial-kicker">Gelesene Beschlüsse</p>
          <h2>Beschlüsse im lokalen Cache</h2>
          <DataTable
            ariaLabel="Gremia.BR-Beschlüsse im lokalen Cache"
            headers={["Beschluss", "Datum", "Status"]}
            rows={resolveGremiaBrDecisionRows(overview)}
            empty={<EmptyState title="Keine Beschlüsse" text="Noch keine Beschlüsse aus Gremia.BR im lokalen Cache." />}
          />
        </article>
      </div>
    </section>
  );
}
