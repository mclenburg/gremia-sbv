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
import { TEMPLATE_DEFAULT_FIELDS, EMPTY_TEMPLATE_DEFAULT_VALUES, loadTemplateDefaultValues, saveTemplateDefaultValues } from "../cases/casesViewProcessUtils";
import type { TemplateDefaultKey, TemplateDefaultValues } from "../cases/casesViewProcessUtils";
import type { ThemeMode } from "../../shared/theme/appTheme";

export function TemplateDefaultSettingsForm() {
  const [values, setValues] = useState<TemplateDefaultValues>(
    EMPTY_TEMPLATE_DEFAULT_VALUES,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadTemplateDefaultValues()
      .then((loaded) => {
        if (!active) return;
        setValues(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Standardwerte konnten nicht geladen werden.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const saved = await saveTemplateDefaultValues(values);
      setValues(saved);
      setMessage("Standardwerte wurden gespeichert.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Standardwerte konnten nicht gespeichert werden.",
      );
    }
  }

  function updateValue(key: TemplateDefaultKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      onSubmit={submit}
      className="industrial-settings-form template-default-settings xl:col-span-2"
    >
      <div>
        <h3>Vorlagen & Standardwerte</h3>
        <p className="industrial-settings-note">
          Diese Werte füllen allgemeine Platzhalter wie{" "}
          <code>{"{{sbv.name}}"}</code> oder{" "}
          <code>{"{{arbeitgeber.ansprechpartner}}"}</code>. Konkrete Fall-,
          Frist- oder Maßnahmendaten überschreiben diese Standardwerte beim
          Erzeugen eines Schreibens.
        </p>
      </div>

      {loading ? (
        <div className="industrial-empty">Standardwerte werden geladen …</div>
      ) : (
        <div className="template-default-grid">
          {TEMPLATE_DEFAULT_FIELDS.map((field) => (
            <label
              key={field.key}
              className={field.multiline ? "template-default-wide" : undefined}
            >
              <span>{field.label}</span>
              <small>{field.description}</small>
              {field.multiline ? (
                <TextCommandTextarea
                  fieldId={`template-default-${field.key}`}
                  value={values[field.key]}
                  onChange={(event) =>
                    updateValue(field.key, event.target.value)
                  }
                />
              ) : (
                <input
                  value={values[field.key]}
                  onChange={(event) =>
                    updateValue(field.key, event.target.value)
                  }
                />
              )}
            </label>
          ))}
        </div>
      )}

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

      <button type="submit" className="industrial-button" disabled={loading}>
        <Save className="h-4 w-4" /> Standardwerte speichern
      </button>
    </form>
  );
}

