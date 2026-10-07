import { useState } from "react";
import { FolderOpen, Save } from "lucide-react";
import { createBackupRestoreActions } from "./backupRestoreActions";
import { BackupOperationFeedback } from "./BackupOperationFeedback";
import type { BackupOperationResult } from "../../../domain/models/backup.model";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { FormActions, PasswordInput, TextInput } from "../../shared/components/IndustrialForm";

export function BackupRestoreForm() {
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [verifyPassphrase, setVerifyPassphrase] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BackupOperationResult | null>(null);
  const [error, setError] = useState("");

  const { createBackup, inspectBackup, restoreBackup } = createBackupRestoreActions({ setBusy, setResult, setError });

  return (
    <section className="industrial-settings-form settings-section-full">
      <div>
        <h3>Backup & Wiederherstellung</h3>
        <p className="industrial-settings-note">
          Backups werden als verschlüsselte <code>.gsbvbackup</code>-Datei
          erzeugt. Die Datei enthält Datenbank, Sicherheitsmanifest, Dokumente
          und verschlüsselte Berichtsexporte. Temporäre Klartextkopien werden
          nicht gesichert.
        </p>
      </div>

      <div className="settings-backup-grid">
        <div className="industrial-subpanel">
          <h4>Backup erstellen</h4>
          <PasswordInput
            label="Backup-Passphrase"
            value={backupPassphrase}
            onValueChange={setBackupPassphrase}
            helpText="Mindestens 12 Zeichen. Diese Passphrase wird nicht gespeichert und ist für die Wiederherstellung erforderlich."
          />
          <FormActions align="start">
            <IndustrialButton disabled={busy} onClick={() => void createBackup(backupPassphrase)}>
              <Save className="industrial-icon" aria-hidden="true" /> Backup speichern
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
            <IndustrialButton variant="secondary" disabled={busy} onClick={() => void inspectBackup(verifyPassphrase)}>
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
            <IndustrialButton variant="danger" disabled={busy} onClick={() => void restoreBackup(restorePassphrase, restoreConfirmation)}>
              Backup wiederherstellen
            </IndustrialButton>
          </FormActions>
        </div>
      </div>

      <div className="industrial-action-row">
        <IndustrialButton
          variant="secondary"
          onClick={() => void window.gremiaSbv?.backup?.openBackupFolder()}
        >
          <FolderOpen className="industrial-icon" aria-hidden="true" /> Backup-Ordner öffnen
        </IndustrialButton>
      </div>

      <BackupOperationFeedback error={error} result={result} />
    </section>
  );
}
