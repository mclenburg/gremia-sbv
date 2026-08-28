import type { RetentionSettings } from "../../../domain/models/retention.model";

type NumericRetentionSetting = Exclude<keyof RetentionSettings, "moduleRules">;

const fields: Array<{
  key: NumericRetentionSetting;
  label: string;
  min: number;
}> = [
  { key: "closedCaseReviewMonths", label: "Abgeschlossene Fälle prüfen nach Monaten", min: 1 },
  { key: "inactiveOpenCaseMonths", label: "Inaktive offene Fälle prüfen nach Monaten", min: 1 },
  { key: "orphanContactReviewDays", label: "Kontakte ohne Bezug prüfen nach Tagen", min: 0 },
  { key: "completedDeadlineRetentionMonths", label: "Erledigte Fristen prüfen nach Monaten", min: 1 },
  { key: "activityJournalReviewMonths", label: "Journal-Einträge prüfen nach Monaten", min: 1 },
  { key: "participationViolationReviewMonths", label: "Beteiligungsverstöße prüfen nach Monaten", min: 1 },
  { key: "minimumGroupSizeForReports", label: "Mindestfallzahl für Berichte", min: 2 },
];

export function RetentionOperationalSettingsGrid({
  settings,
  onChange,
}: {
  settings: RetentionSettings;
  onChange: (key: NumericRetentionSetting, value: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {fields.map((field) => (
        <label key={field.key}>
          <span>{field.label}</span>
          <input
            type="number"
            min={field.min}
            value={settings[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
