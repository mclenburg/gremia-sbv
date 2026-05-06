import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
import { validatePassword } from "./passwordValidation";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    try {
      const bridge = await waitForBridge();
      if (!bridge?.security) {
        setError(
          "Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.",
        );
        return;
      }

      const result = await bridge.security.changePassword(
        currentPassword,
        newPassword,
      );
      if (!result.ok) {
        setError(result.error ?? "Das Passwort konnte nicht geändert werden.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Passwort wurde geändert.");
    } catch (error) {
      console.error("Gremia.SBV security operation failed", error);
      setError(
        "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form max-w-2xl">
      <h3>Passwort ändern</h3>
      <label>
        <span>Aktuelles Passwort</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label>
        <span>Neues Passwort</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>
      <label>
        <span>Neues Passwort wiederholen</span>
        <input
          type="password"
          value={repeatPassword}
          onChange={(event) => setRepeatPassword(event.target.value)}
        />
      </label>

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok">
          {message}
        </div>
      )}

      <button type="submit" className="industrial-button">
        Passwort ändern
      </button>
    </form>
  );
}

