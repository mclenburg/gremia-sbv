import { ModuleFrame } from "../../shared/components/ModuleFrame";
import type { CaseRecord } from "../../core/models/case.model";
import type { ThemeMode } from "../../shared/theme/appTheme";

import { ThemeSettingsForm } from "./ThemeSettingsForm";
import { TemplateDefaultSettingsForm } from "./TemplateDefaultSettingsForm";
import { TemporaryFilesSettingsPanel } from "./TemporaryFilesSettingsPanel";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { BackupRestoreForm } from "./BackupRestoreForm";
import { RetentionSettingsPanel } from "./RetentionSettingsPanel";

export function SettingsView({
  theme,
  onThemeChange,
  cases,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  cases: CaseRecord[];
}) {
  return (
    <ModuleFrame
      title="Einstellungen"
      kicker="System"
      description="Passwortverwaltung, Darstellung und lokale Anwendungseinstellungen."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeSettingsForm theme={theme} onThemeChange={onThemeChange} />
        <TemplateDefaultSettingsForm />
        <ChangePasswordForm />
        <TemporaryFilesSettingsPanel />
        <BackupRestoreForm />
        <RetentionSettingsPanel cases={cases} />
      </div>
    </ModuleFrame>
  );
}

