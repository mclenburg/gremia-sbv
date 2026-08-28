import { RetentionModuleRuleEditor } from "./RetentionModuleRuleEditor";
import { RetentionOperationalSettingsGrid } from "./RetentionOperationalSettingsGrid";
import { useRetentionSettings } from "./useRetentionSettings";

export function RetentionSettingsPanel() {
  const {
    busy,
    dashboard,
    editablePolicies,
    error,
    message,
    reloadRetention,
    saveSettings,
    settings,
    updateModuleRule,
    updateSetting,
  } = useRetentionSettings();

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

      {settings && <RetentionOperationalSettingsGrid settings={settings} onChange={updateSetting} />}

      {editablePolicies && (
        <section className="industrial-subpanel" aria-labelledby="retention-module-rules-title">
          <h4 id="retention-module-rules-title">Standard-Aufbewahrungsfristen aller Module</h4>
          <p className="industrial-settings-note">
            Diese Regeln steuern die automatische Vormerkung zur manuellen Datenschutzprüfung.
            Sie ersetzen keine Rechtsprüfung und lösen keine automatische Löschung aus.
          </p>
          <RetentionModuleRuleEditor policies={editablePolicies} onRuleChange={updateModuleRule} />
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="industrial-button" disabled={busy} onClick={() => void saveSettings()}>
          Einstellungen speichern
        </button>
        <button type="button" className="industrial-secondary-button" disabled={busy} onClick={() => void reloadRetention()}>
          Prüfung aktualisieren
        </button>
      </div>

      {dashboard && (
        <details className="industrial-subpanel">
          <summary>Aktuelle Prüfkandidaten</summary>
          <p className="industrial-settings-note mt-3">
            Gesamt: {dashboard.counts.total}, kritisch: {dashboard.counts.critical},
            Warnung: {dashboard.counts.warning}, Hinweis: {dashboard.counts.info}.
          </p>
        </details>
      )}

      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok" role="status">{message}</div>}
    </section>
  );
}
