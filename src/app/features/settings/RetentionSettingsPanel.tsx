import { useEffect, useState } from "react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import type { RetentionDashboard, RetentionSettings } from "../../../domain/models/retention.model";

function retentionRuleLabel(rule: RetentionDashboard['policies'][number]['rule']): string {
  if (rule.kind === 'months_after_completion') return `${rule.months} Monate nach Abschluss`;
  if (rule.kind === 'months_after_completion_year_end') return `${rule.months / 12} Jahre nach Jahresende des Abschlusses`;
  if (rule.kind === 'term_related') return `${rule.months / 12} Jahre / amtszeitbezogen`;
  if (rule.kind === 'purpose_linked') return 'Sofort nach Zweckwegfall';
  return 'Dauerhaft, ausschließlich anonymisiert';
}

export function RetentionSettingsPanel() {
  const announce = useAnnouncer();
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [settings, setSettings] = useState<RetentionSettings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reloadRetention() {
    setError("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention)
        throw new Error("Löschdienst ist nicht erreichbar.");
      const [nextSettings, nextDashboard] = await Promise.all([
        bridge.retention.getSettings(),
        bridge.retention.dashboard(),
      ]);
      setSettings(nextSettings);
      setDashboard(nextDashboard);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void reloadRetention();
  }, []);

  useEffect(() => { if (error) announce(error, 'assertive'); }, [announce, error]);
  useEffect(() => { if (message) announce(message, 'polite'); }, [announce, message]);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention)
        throw new Error("Löschdienst ist nicht erreichbar.");
      const updated = await bridge.retention.updateSettings(settings);
      setSettings(updated);
      setMessage("Lösch- und Prüffristen wurden gespeichert.");
      await reloadRetention();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function updateSetting<K extends keyof RetentionSettings>(
    key: K,
    value: string,
  ) {
    const parsed = Number(value);
    if (!settings || !Number.isFinite(parsed)) return;
    setSettings({ ...settings, [key]: Math.max(key === 'orphanContactReviewDays' ? 0 : 1, Math.trunc(parsed)) });
  }

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Datenschutz: Löschprüfung & Aufbewahrung</h3>
        <p className="industrial-settings-note">
          Gremia.SBV löscht nicht automatisch. Die App erkennt Prüfkandidaten,
          dokumentiert Entscheidungen und führt Anonymisierung oder Löschung nur
          nach bewusster Bestätigung aus.
        </p>
      </div>

      {settings && (
        <div className="grid gap-4 lg:grid-cols-6">
          <label>
            <span>Abgeschlossene Fälle prüfen nach Monaten</span>
            <input
              type="number"
              min={0}
              value={settings.closedCaseReviewMonths}
              onChange={(e) =>
                updateSetting("closedCaseReviewMonths", e.target.value)
              }
            />
          </label>
          <label>
            <span>Inaktive offene Fälle prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.inactiveOpenCaseMonths}
              onChange={(e) =>
                updateSetting("inactiveOpenCaseMonths", e.target.value)
              }
            />
          </label>
          <label>
            <span>Kontakte ohne Bezug prüfen nach Tagen</span>
            <input
              type="number"
              min={1}
              value={settings.orphanContactReviewDays}
              onChange={(e) =>
                updateSetting("orphanContactReviewDays", e.target.value)
              }
            />
          </label>
          <label>
            <span>Erledigte Fristen prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.completedDeadlineRetentionMonths}
              onChange={(e) =>
                updateSetting(
                  "completedDeadlineRetentionMonths",
                  e.target.value,
                )
              }
            />
          </label>
          <label>
            <span>Journal-Einträge prüfen nach Monaten</span>
            <input
              type="number"
              min={1}
              value={settings.activityJournalReviewMonths}
              onChange={(e) =>
                updateSetting("activityJournalReviewMonths", e.target.value)
              }
            />
          </label>
          <label>
            <span>Mindestfallzahl für Berichte</span>
            <input
              type="number"
              min={2}
              value={settings.minimumGroupSizeForReports}
              onChange={(e) =>
                updateSetting("minimumGroupSizeForReports", e.target.value)
              }
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="industrial-button"
          disabled={busy}
          onClick={() => void saveSettings()}
        >
          Einstellungen speichern
        </button>
        <button
          type="button"
          className="industrial-secondary-button"
          disabled={busy}
          onClick={() => void reloadRetention()}
        >
          Prüfung aktualisieren
        </button>
      </div>

      {dashboard && (
        <details className="industrial-subpanel">
          <summary>Standard-Aufbewahrungsfristen aller Module</summary>
          <div className="industrial-table-shell mt-3">
            <table className="industrial-table">
              <thead><tr><th>Modul</th><th>Prüffrist</th><th>Rechtsrahmen</th><th>Regel</th></tr></thead>
              <tbody>
                {dashboard.policies.map((policy) => (
                  <tr key={policy.module}>
                    <td>{policy.label}</td>
                    <td>{retentionRuleLabel(policy.rule)}</td>
                    <td>{policy.legalBasis}</td>
                    <td>{policy.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {error && (
        <div className="industrial-message industrial-message-warning" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok" role="status">
          {message}
        </div>
      )}
    </section>
  );
}
