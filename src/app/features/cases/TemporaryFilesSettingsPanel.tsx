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

export function TemporaryFilesSettingsPanel() {
  const [status, setStatus] = useState<{
    root: string;
    remaining: number;
    bytesRemaining: number;
    oldestRemainingAt?: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const nextStatus =
        await window.gremiaSbv?.security?.temporaryFileStatus?.();
      if (nextStatus) setStatus(nextStatus);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Status der temporären Arbeitskopien konnte nicht geladen werden.",
      );
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function cleanup() {
    setMessage("");
    setError("");
    try {
      const result =
        await window.gremiaSbv?.security?.cleanupTemporaryFiles?.();
      setMessage(
        `Temporäre Arbeitskopien bereinigt: ${result?.deleted ?? 0} gelöscht, ${result?.remaining ?? 0} verbleibend.`,
      );
      await loadStatus();
    } catch (cleanupError) {
      setError(
        cleanupError instanceof Error
          ? cleanupError.message
          : "Temporäre Arbeitskopien konnten nicht bereinigt werden.",
      );
    }
  }

  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Temporäre Arbeitskopien</h3>
        <p className="industrial-settings-note">
          Vorschauen und geöffnete PDF-Reports werden nur als kurzlebige lokale
          Arbeitskopien erzeugt. Beim Sperren werden diese Dateien automatisch
          bereinigt.
        </p>
      </div>
      <div className="industrial-list">
        <div>
          <strong>Dateien:</strong> {status?.remaining ?? "—"}
        </div>
        <div>
          <strong>Größe:</strong>{" "}
          {status ? `${Math.round(status.bytesRemaining / 1024)} KB` : "—"}
        </div>
        <div>
          <strong>Ordner:</strong> <code>{status?.root ?? "—"}</code>
        </div>
        <div>
          <strong>Älteste Datei:</strong>{" "}
          {status?.oldestRemainingAt
            ? new Date(status.oldestRemainingAt).toLocaleString("de-DE")
            : "—"}
        </div>
      </div>
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
      <button
        type="button"
        className="industrial-secondary-button"
        onClick={() => void cleanup()}
      >
        <ShieldCheck className="h-4 w-4" /> Temporäre Dateien jetzt löschen
      </button>
    </section>
  );
}

