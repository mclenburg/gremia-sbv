import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Download, FolderOpen, HardDrive, Save, ShieldCheck } from "lucide-react";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { formatDateShort } from "../../shared/format/dates";
import type { CaseRecord } from "../../core/models/case.model";
import type { RetentionCandidate, RetentionDashboard, RetentionOperationResult, RetentionSettings } from "../../core/models/retention.model";
import type { BackupInspectionResult, BackupOperationResult } from "../../core/models/backup.model";
import type { RenderedTemplateResult, ContextualTemplateAction } from "../../core/models/template.model";
import { APP_VERSION } from "../../generated/appVersion";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { FormActions, PasswordInput, TextInput } from "../../shared/components/IndustrialForm";
import { buildExportWarningMessage, scanSensitiveExportText } from "@services/exportGuardPolicy";
import { missingPlaceholderWarning } from "@services/templateContextPolicy";
import { TEMPLATE_DEFAULT_FIELDS, EMPTY_TEMPLATE_DEFAULT_VALUES, loadTemplateDefaultValues, saveTemplateDefaultValues } from "../../shared/templates/templateDefaults";

export function BackupRestoreForm() {
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [verifyPassphrase, setVerifyPassphrase] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    BackupOperationResult | BackupInspectionResult | null
  >(null);
  const [error, setError] = useState("");

  function resetMessages() {
    setResult(null);
    setError("");
  }

  function validateBackupPassphrase(passphrase: string): string | null {
    if (passphrase.length < 12)
      return "Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.";
    return null;
  }

  async function createBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(backupPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.create(backupPassphrase);
      if (!operationResult.ok)
        setError(
          operationResult.error ?? "Backup konnte nicht erstellt werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function inspectBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(verifyPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.inspect(verifyPassphrase);
      if (!operationResult.ok)
        setError(
          operationResult.error ?? "Backup konnte nicht geprüft werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    resetMessages();
    const validation = validateBackupPassphrase(restorePassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.backup)
        throw new Error("Backup-Dienst ist nicht erreichbar.");
      const operationResult = await bridge.backup.restore(
        restorePassphrase,
        restoreConfirmation,
      );
      if (!operationResult.ok)
        setError(
          operationResult.error ??
            "Backup konnte nicht wiederhergestellt werden.",
        );
      setResult(operationResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="industrial-settings-form xl:col-span-2">
      <div>
        <h3>Backup & Wiederherstellung</h3>
        <p className="industrial-settings-note">
          Backups werden als verschlüsselte <code>.gsbvbackup</code>-Datei
          erzeugt. Die Datei enthält Datenbank, Sicherheitsmanifest, Dokumente
          und verschlüsselte Berichtsexporte. Temporäre Klartextkopien werden
          nicht gesichert.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="industrial-subpanel">
          <h4>Backup erstellen</h4>
          <PasswordInput
            label="Backup-Passphrase"
            value={backupPassphrase}
            onValueChange={setBackupPassphrase}
            helpText="Mindestens 12 Zeichen. Diese Passphrase wird nicht gespeichert und ist für die Wiederherstellung erforderlich."
          />
          <FormActions align="start">
            <IndustrialButton disabled={busy} onClick={() => void createBackup()}>
              <Save className="h-4 w-4" aria-hidden="true" /> Backup speichern
            </IndustrialButton>
          </FormActions>
        </div>

        <div className="industrial-subpanel">
          <h4>Backup prüfen</h4>
          <PasswordInput
            label="Backup-Passphrase"
            value={verifyPassphrase}
            onValueChange={setVerifyPassphrase}
            helpText="Prüft Manifest, Integrität und Wiederherstellbarkeit ohne den aktuellen Tresor zu verändern."
          />
          <FormActions align="start">
            <IndustrialButton variant="secondary" disabled={busy} onClick={() => void inspectBackup()}>
              Backup prüfen
            </IndustrialButton>
          </FormActions>
        </div>

        <div className="industrial-subpanel industrial-danger-zone">
          <h4>Wiederherstellen</h4>
          <p className="industrial-settings-note">
            Ersetzt den aktuellen lokalen Datenbestand. Der bisherige Stand wird
            vorher in einen Sicherheitsordner verschoben.
          </p>
          <PasswordInput
            label="Backup-Passphrase"
            value={restorePassphrase}
            onValueChange={setRestorePassphrase}
            helpText="Nur die Passphrase des ausgewählten Backups kann diesen Stand entschlüsseln."
          />
          <TextInput
            label="Bestätigung: BACKUP WIEDERHERSTELLEN"
            value={restoreConfirmation}
            onValueChange={setRestoreConfirmation}
            helpText="Schreibe die Bestätigung exakt aus, damit die Wiederherstellung bewusst ausgelöst wird."
          />
          <FormActions align="start">
            <IndustrialButton variant="danger" disabled={busy} onClick={() => void restoreBackup()}>
              Backup wiederherstellen
            </IndustrialButton>
          </FormActions>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <IndustrialButton
          variant="secondary"
          onClick={() => void window.gremiaSbv?.backup?.openBackupFolder()}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" /> Backup-Ordner öffnen
        </IndustrialButton>
      </div>

      {error && (
        <div className="industrial-message industrial-message-warning">
          {error}
        </div>
      )}
      {result?.ok && (
        <div className="industrial-message industrial-message-ok">
          <strong>
            {result.restartRequired
              ? "Wiederherstellung vorbereitet."
              : "verifiedAt" in result
                ? "Backup erfolgreich geprüft."
                : "Backup-Vorgang abgeschlossen."}
          </strong>
          <p>{result.fileName}</p>
          <p>
            {result.fileCount ?? 0} Dateien · {result.totalBytes ?? 0} Bytes
          </p>
          {result.restartRequired && (
            <p>Bitte Gremia.SBV jetzt vollständig schließen und neu starten.</p>
          )}
          {result.warnings?.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

