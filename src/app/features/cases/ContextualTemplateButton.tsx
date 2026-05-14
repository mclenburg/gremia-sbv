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
import { TEMPLATE_DEFAULT_FIELDS, EMPTY_TEMPLATE_DEFAULT_VALUES, loadTemplateDefaultValues, saveTemplateDefaultValues } from "../../shared/templates/templateDefaults";
import type { ThemeMode } from "../../shared/theme/appTheme";

export function ContextualTemplateButton({
  action,
  caseId,
  sourceId,
  values,
}: {
  action: ContextualTemplateAction;
  caseId: string;
  sourceId?: string;
  values?: Record<string, string>;
}) {
  const [rendered, setRendered] = useState<RenderedTemplateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  async function generate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates)
        throw new Error("Vorlagendienst ist nicht erreichbar.");
      const result = await bridge.templates.renderContext({
        templateKey: action.templateKey,
        caseId,
        sourceType: action.sourceType,
        sourceId,
        sourceLabel: action.description,
        values,
        archive: true,
      });
      setRendered(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Schreiben konnte nicht erzeugt werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyRendered() {
    if (!rendered) return;
    const text = `Betreff: ${rendered.subject}\n\n${rendered.body}`;
    const scan = scanSensitiveExportText(text, {
      context: "Vorlagenexport",
      target: rendered.title,
    });
    const confirmed = await confirmDialog({
      variant: "warning",
      title: "Entwurf in Zwischenablage kopieren?",
      message: buildExportWarningMessage(scan),
      confirmLabel: "Kopieren",
      cancelLabel: "Abbrechen",
    });
    if (!confirmed) return;
    await navigator.clipboard.writeText(text);
    const successMessage =
      "Entwurf wurde in die Zwischenablage kopiert. Achtung: Die Zwischenablage liegt außerhalb des Tresors.";
    setMessage(successMessage);
    announce(successMessage, "polite");
  }

  return (
    <>
      <button
        type="button"
        className="industrial-inline-link"
        onClick={() => void generate()}
        disabled={busy || !caseId}
        title={action.description}
      >
        {busy ? "Schreiben wird erzeugt …" : action.label}
      </button>
      {error && <span className="industrial-inline-warning">{error}</span>}
      {rendered && (
        <div
          className="industrial-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <section className="industrial-modal industrial-modal-wide">
            <div className="industrial-panel-header compact">
              <div>
                <p className="industrial-kicker">Kontextschreiben</p>
                <h2>{rendered.title}</h2>
                <p>
                  Dieser Entwurf wurde aus dem aktuellen Vorgang erzeugt und der
                  Fallakte zugeordnet.
                </p>
              </div>
            </div>
            {!!rendered.unresolvedPlaceholders.length && (
              <div className="industrial-message industrial-message-warning mt-4">
                {missingPlaceholderWarning(rendered.unresolvedPlaceholders)}
              </div>
            )}
            {message && (
              <div className="industrial-message industrial-message-ok mt-4">
                {message}
              </div>
            )}
            <div className="industrial-subpanel mt-4">
              <h4>Betreff</h4>
              <p>{rendered.subject}</p>
            </div>
            <div className="industrial-subpanel mt-4 template-preview-body">
              <h4>Textvorschau</h4>
              <pre>{rendered.body}</pre>
            </div>
            <div className="industrial-modal-actions">
              <button
                type="button"
                className="industrial-secondary-button"
                onClick={() => setRendered(null)}
              >
                Schließen
              </button>
              <button
                type="button"
                className="industrial-button"
                onClick={() => void copyRendered()}
              >
                In Zwischenablage kopieren
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
