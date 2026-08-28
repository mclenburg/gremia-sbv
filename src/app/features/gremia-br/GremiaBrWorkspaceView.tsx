import { useEffect, useState } from "react";
import type { GremiaBrPublicSettings } from "../../../domain/models/gremia-br.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { ToolbarButton } from "../../shared/components/IndustrialButton";

const EMPTY_SETTINGS: GremiaBrPublicSettings = {
  enabled: false,
  serverUrl: "",
  username: "",
  hasStoredCredentials: false,
  apiMode: "legacy_read_bridge",
  relevanceSettings: { groups: [] },
};

function workspaceLabel(settings: GremiaBrPublicSettings): string {
  return settings.selectedBodyName
    ?? settings.selectedSecurityDomain
    ?? "Noch kein SBV-Gremium ausgewählt";
}

export function GremiaBrWorkspaceView() {
  const announce = useAnnouncer();
  const [settings, setSettings] = useState<GremiaBrPublicSettings>(EMPTY_SETTINGS);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSettings() {
    const bridge = await waitForBridge();
    if (!bridge?.gremiaBr) throw new Error("Gremia.BR-Dienst ist nicht erreichbar.");
    setSettings(await bridge.gremiaBr.getSettings());
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!active || !bridge?.gremiaBr) return;
        const next = await bridge.gremiaBr.getSettings();
        if (active) setSettings(next);
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
      </div>

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
    </section>
  );
}
