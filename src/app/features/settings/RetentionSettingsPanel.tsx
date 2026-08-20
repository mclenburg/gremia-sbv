import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Download, HardDrive, Save, ShieldCheck } from "lucide-react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { formatDateShort } from "../../shared/format/dates";
import type { CaseRecord } from "../../../domain/models/case.model";
import type { RetentionCandidate, RetentionDashboard, RetentionSettings } from "../../../domain/models/retention.model";
import { RetentionCasePrivacyActions } from "./RetentionCasePrivacyActions";
import type { BackupInspectionResult, BackupOperationResult } from "../../../domain/models/backup.model";
import type { RenderedTemplateResult, ContextualTemplateAction } from "../../../domain/models/template.model";
import { APP_VERSION } from "../../generated/appVersion";
import { buildExportWarningMessage, scanSensitiveExportText } from "@/domain/privacy/exportGuardPolicy";
import { missingPlaceholderWarning } from "@/domain/templates/templateContextPolicy";
import { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { TEMPLATE_DEFAULT_FIELDS, EMPTY_TEMPLATE_DEFAULT_VALUES, loadTemplateDefaultValues, saveTemplateDefaultValues } from "../../shared/templates/templateDefaults";
import type { ThemeMode } from "../../shared/theme/appTheme";
import { AUDIT_LOG_RETENTION_NOTICE } from "../../core/copy/privacyNotices";

function retentionRuleLabel(rule: RetentionDashboard['policies'][number]['rule']): string {
  if (rule.kind === 'months_after_completion') return `${rule.months} Monate nach Abschluss`;
  if (rule.kind === 'months_after_completion_year_end') return `${rule.months / 12} Jahre nach Jahresende des Abschlusses`;
  if (rule.kind === 'term_related') return `${rule.months / 12} Jahre / amtszeitbezogen`;
  if (rule.kind === 'purpose_linked') return 'Sofort nach Zweckwegfall';
  return 'Dauerhaft, ausschließlich anonymisiert';
}

export function RetentionSettingsPanel({ cases }: { cases: CaseRecord[] }) {
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

  const candidates = dashboard?.candidates ?? [];
  const criticalCandidates = candidates.filter(
    (candidate) => candidate.riskLevel === "critical",
  );
  const reviewCandidates = candidates.slice(0, 12);

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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="industrial-subpanel">
            <h4>Gesamt</h4>
            <strong className="text-2xl">{dashboard.counts.total}</strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Kritisch</h4>
            <strong className="text-2xl text-red-300">
              {dashboard.counts.critical}
            </strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Prüfen</h4>
            <strong className="text-2xl text-yellow-300">
              {dashboard.counts.warning}
            </strong>
          </div>
          <div className="industrial-subpanel">
            <h4>Hinweis</h4>
            <strong className="text-2xl">{dashboard.counts.info}</strong>
          </div>
        </div>
      )}

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

      {!!criticalCandidates.length && (
        <div className="industrial-message industrial-message-warning">
          <strong>Kritische Datenschutz-/Integritätsprüfungen offen.</strong>
          <p>
            {criticalCandidates.length} Eintrag/Einträge sollten zeitnah geprüft
            werden.
          </p>
        </div>
      )}

      <div className="industrial-table-shell">
        <table className="industrial-table">
          <thead>
            <tr>
              <th>Risiko</th>
              <th>Typ</th>
              <th>Bezug</th>
              <th>Empfehlung</th>
              <th>Datenschutzprüfung</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {reviewCandidates.map((candidate: RetentionCandidate) => (
              <tr key={candidate.id}>
                <td>
                  {candidate.riskLevel === "critical"
                    ? "Kritisch"
                    : candidate.riskLevel === "warning"
                      ? "Prüfen"
                      : "Hinweis"}
                </td>
                <td>{candidate.title}</td>
                <td>{candidate.reference ?? "—"}</td>
                <td>{candidate.recommendedAction}</td>
                <td>{candidate.privacyReviewRequired ? 'Pflicht' : 'Prüfen'}</td>
                <td>{candidate.description}</td>
              </tr>
            ))}
            {!reviewCandidates.length && (
              <tr>
                <td colSpan={6}>
                  Keine Lösch- oder Aufbewahrungsprüfungen offen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RetentionCasePrivacyActions cases={cases} busy={busy} setBusy={setBusy} setError={setError} setMessage={setMessage} reloadRetention={reloadRetention} />

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
