import { useState } from "react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import type { RenderedTemplateResult, ContextualTemplateAction } from "../../../domain/models/template.model";
import { buildExportWarningMessage, scanSensitiveExportText } from "@/domain/privacy/exportGuardPolicy";
import { useConfirmDialog } from "../../shared/dialogs/ConfirmDialogProvider";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { ContextualTemplateDialog } from "./ContextualTemplateDialog";

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
      {error && <span className="industrial-inline-warning" role="alert">{error}</span>}
      {rendered && <ContextualTemplateDialog rendered={rendered} message={message} onClose={() => setRendered(null)} onCopy={() => void copyRendered()} onPdfOpened={setMessage} />}
    </>
  );
}
