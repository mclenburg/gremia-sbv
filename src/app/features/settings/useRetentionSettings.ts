import { useEffect, useState } from "react";
import type { RetentionDashboard, RetentionModuleType, RetentionRule, RetentionSettings } from "../../../domain/models/retention.model";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";

type NumericRetentionSetting = Exclude<keyof RetentionSettings, "moduleRules">;

export function useRetentionSettings() {
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
      if (!bridge?.retention) throw new Error("Löschdienst ist nicht erreichbar.");
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

  useEffect(() => { void reloadRetention(); }, []);
  useEffect(() => { if (error) announce(error, "assertive"); }, [announce, error]);
  useEffect(() => { if (message) announce(message, "polite"); }, [announce, message]);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.retention) throw new Error("Löschdienst ist nicht erreichbar.");
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

  function updateSetting(key: NumericRetentionSetting, value: string) {
    const parsed = Number(value);
    if (!settings || !Number.isFinite(parsed)) return;
    const minimum = key === "orphanContactReviewDays" ? 0 : key === "minimumGroupSizeForReports" ? 2 : 1;
    const nextValue = Math.max(minimum, Math.trunc(parsed));
    const nextSettings: RetentionSettings = { ...settings, [key]: nextValue };
    if (key === "closedCaseReviewMonths") {
      nextSettings.moduleRules = { ...settings.moduleRules, case_file: { kind: "months_after_completion", months: nextValue } };
    }
    if (key === "participationViolationReviewMonths") {
      nextSettings.moduleRules = { ...settings.moduleRules, sbv_participation: { kind: "term_related", months: nextValue } };
    }
    setSettings(nextSettings);
  }

  function updateModuleRule(module: RetentionModuleType, rule: RetentionRule) {
    if (!settings) return;
    const nextSettings: RetentionSettings = { ...settings, moduleRules: { ...settings.moduleRules, [module]: rule } };
    if (module === "case_file" && rule.kind === "months_after_completion") nextSettings.closedCaseReviewMonths = rule.months;
    if (module === "sbv_participation" && "months" in rule) nextSettings.participationViolationReviewMonths = rule.months;
    setSettings(nextSettings);
  }

  const editablePolicies = dashboard?.policies.map((policy) => ({
    ...policy,
    rule: settings?.moduleRules[policy.module] ?? policy.rule,
  }));

  return {
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
  };
}
