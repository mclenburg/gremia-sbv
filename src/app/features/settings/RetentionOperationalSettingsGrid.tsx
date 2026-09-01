import type { RetentionSettings } from "../../../domain/models/retention.model";
import { TextInput } from "../../shared/components/IndustrialTextInputs";

export type NumericRetentionSetting =
  | "inactiveOpenCaseMonths"
  | "orphanContactReviewDays"
  | "completedDeadlineRetentionMonths"
  | "minimumGroupSizeForReports";

export const RETENTION_OPERATIONAL_SETTINGS_FIELDS: Array<{
  key: NumericRetentionSetting;
  label: string;
  helpText: string;
  min: number;
}> = [
  {
    key: "inactiveOpenCaseMonths",
    label: "Inaktive offene Fälle",
    helpText: "Monate ohne erkennbare Aktivität, bevor ein offener Fall zur manuellen Prüfung vorgemerkt wird.",
    min: 1,
  },
  {
    key: "orphanContactReviewDays",
    label: "Kontakte ohne Bezug",
    helpText: "Tage nach Zweckwegfall. 0 bedeutet: sofort zur manuellen Prüfung vormerken.",
    min: 0,
  },
  {
    key: "completedDeadlineRetentionMonths",
    label: "Erledigte freie Fristen",
    helpText: "Monate bis zur Prüfung erledigter freier Fristen und Wiedervorlagen ohne weiteren Vorgangsbezug.",
    min: 1,
  },
  {
    key: "minimumGroupSizeForReports",
    label: "Mindestfallzahl für Berichte",
    helpText: "Kleinste Gruppengröße, ab der anonymisierte Auswertungen in Berichten ausgewiesen werden.",
    min: 2,
  },
];

export function RetentionOperationalSettingsGrid({
  settings,
  onChange,
}: {
  settings: RetentionSettings;
  onChange: (key: NumericRetentionSetting, value: string) => void;
}) {
  return (
    <div className="industrial-form-grid industrial-form-grid-4">
      {RETENTION_OPERATIONAL_SETTINGS_FIELDS.map((field) => (
        <TextInput
          key={field.key}
          label={field.label}
          helpText={field.helpText}
          type="number"
          min={field.min}
          value={String(settings[field.key])}
          onValueChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}
