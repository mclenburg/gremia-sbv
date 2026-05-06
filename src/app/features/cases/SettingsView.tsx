import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ModuleFrame } from "../../shared/components/ModuleFrame";
import { AlertTriangle, Download, HardDrive, Save, ShieldCheck } from "lucide-react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { formatDateShort } from "../../shared/format/dates";
import type { CaseRecord } from "../../core/models/case.model";
import type { RetentionCandidate, RetentionDashboard, RetentionOperationResult, RetentionSettings } from "../../core/models/retention.model";
import type { BackupInspectionResult, BackupOperationResult } from "../../core/models/backup.model";
import type { RenderedTemplateResult, ContextualTemplateAction } from "../../core/models/template.model";
import { APP_VERSION } from "../../generated/appVersion";
import { TextCommandTextarea } from "../../shared/textCommands/TextCommandTextarea";
import { buildExportWarningMessage, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { missingPlaceholderWarning } from "@services/templateContextPolicy";
import { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { TEMPLATE_DEFAULT_FIELDS, EMPTY_TEMPLATE_DEFAULT_VALUES, loadTemplateDefaultValues, saveTemplateDefaultValues } from "./casesViewProcessUtils";
import type { ThemeMode } from "./casesViewTheme";

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

