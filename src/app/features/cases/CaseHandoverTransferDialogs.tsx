import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Download, Upload } from "lucide-react";
import type { CaseRecord } from "../../core/models/case.model";
import type {
  CaseHandoverExportResult,
  CaseHandoverImportMode,
  CaseHandoverInspectResult,
} from "../../core/models/case-handover.model";
import {
  DateInput,
  FormActions,
  PasswordInput,
  TextInput,
} from "../../shared/components/IndustrialForm";
import {
  GhostButton,
  IndustrialButton,
  ToolbarButton,
} from "../../shared/components/IndustrialButton";
import {
  ExportResultDialog,
  IndustrialModal,
} from "../../shared/dialogs/IndustrialDialogs";
import {
  ExportAction,
  ImportPackageReview,
} from "../../shared/components/ImportExportFeedback";

type ImportFileSelection =
  | { canceled: true }
  | { canceled: false; filePath: string; fileName: string };
type InspectSelection = {
  filePath: string;
  fileName: string;
  inspection: CaseHandoverInspectResult;
};

type CaseHandoverTransferDialogsProps = {
  exportOpen: boolean;
  importOpen: boolean;
  selectedCase?: CaseRecord;
  onCloseExport: () => void;
  onCloseImport: () => void;
  onExport: (
    passphrase: string,
    expiresAt?: string,
  ) => Promise<CaseHandoverExportResult>;
  onSelectImportFile: () => Promise<ImportFileSelection>;
  onInspectImport: (
    filePath: string,
    passphrase: string,
  ) => Promise<CaseHandoverInspectResult>;
  onImport: (input: {
    filePath: string;
    passphrase: string;
    mode: CaseHandoverImportMode;
    targetCaseId?: string;
  }) => Promise<void>;
};

function toIsoEndOfDay(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T23:59:59`);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString();
}

function formatGermanDate(value?: string): string {
  if (!value) return "ohne Ablaufdatum";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("de-DE");
}

function reasonLabel(reason: string): string {
  if (reason === "case_number") return "Aktenzeichen";
  if (reason === "person_name") return "Personenname";
  return "Name/Pseudonym";
}

export function CaseHandoverTransferDialogs({
  exportOpen,
  importOpen,
  selectedCase,
  onCloseExport,
  onCloseImport,
  onExport,
  onSelectImportFile,
  onInspectImport,
  onImport,
}: CaseHandoverTransferDialogsProps) {
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportValidUntil, setExportValidUntil] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportResult, setExportResult] =
    useState<CaseHandoverExportResult | null>(null);

  const [importPassphrase, setImportPassphrase] = useState("");
  const [importFile, setImportFile] = useState<ImportFileSelection | null>(null);
  const [importSelection, setImportSelection] = useState<InspectSelection | null>(
    null,
  );
  const [importMode, setImportMode] =
    useState<CaseHandoverImportMode>("create_new");
  const [targetCaseId, setTargetCaseId] = useState("");
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    if (!exportOpen) {
      setExportPassphrase("");
      setExportValidUntil("");
      setExportError("");
      setExportBusy(false);
      setExportResult(null);
    }
  }, [exportOpen]);

  useEffect(() => {
    if (!importOpen) {
      setImportPassphrase("");
      setImportFile(null);
      setImportSelection(null);
      setImportMode("create_new");
      setTargetCaseId("");
      setImportError("");
      setImportBusy(false);
    }
  }, [importOpen]);

  async function submitExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExportError("");
    if (!selectedCase) {
      setExportError("Bitte zuerst eine Fallakte auswählen.");
      return;
    }
    if (exportPassphrase.trim().length < 10) {
      setExportError(
        "Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.",
      );
      return;
    }
    if (exportValidUntil.trim() && !toIsoEndOfDay(exportValidUntil)) {
      setExportError("Bitte das Ablaufdatum im Format JJJJ-MM-TT eingeben.");
      return;
    }
    setExportBusy(true);
    try {
      const result = await onExport(
        exportPassphrase,
        toIsoEndOfDay(exportValidUntil),
      );
      if (!result.exported) {
        setExportError("Export wurde abgebrochen.");
        return;
      }
      setExportResult(result);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Übergabepaket konnte nicht erstellt werden.",
      );
    } finally {
      setExportBusy(false);
    }
  }

  async function selectImportFile() {
    setImportError("");
    setImportSelection(null);
    setImportMode("create_new");
    setTargetCaseId("");
    setImportBusy(true);
    try {
      const result = await onSelectImportFile();
      if (result.canceled) return;
      setImportFile(result);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Übergabedatei konnte nicht ausgewählt werden.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  async function inspectImport() {
    setImportError("");
    setImportSelection(null);
    setImportMode("create_new");
    setTargetCaseId("");
    if (!importFile || importFile.canceled) {
      setImportError("Bitte zuerst eine Übergabedatei auswählen.");
      return;
    }
    if (!importPassphrase.trim()) {
      setImportError("Bitte die Transport-Passphrase eingeben.");
      return;
    }
    setImportBusy(true);
    try {
      const inspection = await onInspectImport(importFile.filePath, importPassphrase);
      if (inspection.isExpired) {
        setImportError(
          "Das Übergabepaket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.",
        );
        return;
      }
      setImportSelection({
        filePath: importFile.filePath,
        fileName: importFile.fileName,
        inspection,
      });
      const firstMatch = inspection.matches[0];
      if (firstMatch) setTargetCaseId(firstMatch.localCaseId);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Übergabepaket konnte nicht geprüft werden.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportError("");
    if (!importSelection) {
      setImportError(
        "Bitte zuerst ein gültiges Übergabepaket auswählen und prüfen.",
      );
      return;
    }
    if (importSelection.inspection.isExpired) {
      setImportError(
        "Das Übergabepaket ist abgelaufen und darf nicht importiert werden.",
      );
      return;
    }
    if (importMode === "merge_existing" && !targetCaseId) {
      setImportError(
        "Bitte ein Gegenstück auswählen oder als neue Übergabeakte importieren.",
      );
      return;
    }
    setImportBusy(true);
    try {
      await onImport({
        filePath: importSelection.filePath,
        passphrase: importPassphrase,
        mode: importMode,
        targetCaseId:
          importMode === "merge_existing" ? targetCaseId : undefined,
      });
      onCloseImport();
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Übergabepaket konnte nicht importiert werden.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <>
      {exportOpen && exportResult?.exported ? (
        <ExportResultDialog
          title="Übergabepaket exportiert"
          filePath={exportResult.filePath}
          description="Das verschlüsselte Übergabepaket wurde über den Systemdialog gespeichert. Der Speicherort bleibt sichtbares Nutzerfeedback und wird nicht als personenbezogener Inhalt ins Audit geschrieben."
          onClose={onCloseExport}
        />
      ) : null}

      {exportOpen && !exportResult?.exported ? (
        <IndustrialModal
          title="Übergabepaket exportieren"
          kicker="Fallübergabe / Vertretung"
          description="Die ausgewählte Fallakte wird verschlüsselt als eigenständiges Übergabepaket gespeichert. Der Speicherort wird über den Systemdialog gewählt; es gibt keinen Browser-Download."
          icon={<Download className="h-5 w-5" />}
          onClose={onCloseExport}
        >
          <form className="industrial-modal-grid" onSubmit={submitExport}>
            <TextInput
              label="Fallakte"
              value={
                selectedCase
                  ? `${selectedCase.caseNumber} · ${selectedCase.displayName}`
                  : "Keine Fallakte ausgewählt"
              }
              readOnly
              wide
              onValueChange={() => undefined}
            />
            <PasswordInput
              label="Transport-Passphrase"
              value={exportPassphrase}
              minLength={10}
              required
              wide
              error={exportError && exportPassphrase.trim().length < 10 ? exportError : undefined}
              onValueChange={setExportPassphrase}
            />
            <DateInput
              label="Gültig bis (optional)"
              value={exportValidUntil}
              wide
              onValueChange={setExportValidUntil}
            />
            <p className="industrial-modal-preview industrial-modal-wide">
              Nach Ablauf darf die Übergabedatei nicht mehr importiert werden.
              Bereits importierte Vertretungsakten werden danach als abgelaufen
              markiert.
            </p>
            {exportError && exportPassphrase.trim().length >= 10 ? (
              <div
                className="industrial-message industrial-message-warning industrial-modal-wide"
                role="alert"
              >
                <AlertTriangle className="h-4 w-4" />
                {exportError}
              </div>
            ) : null}
            <FormActions>
              <GhostButton
                type="button"
                onClick={onCloseExport}
                disabled={exportBusy}
              >
                Abbrechen
              </GhostButton>
              <ExportAction
                type="submit"
                disabled={exportBusy || !selectedCase}
                loading={exportBusy}
              >
                Übergabe exportieren
              </ExportAction>
            </FormActions>
          </form>
        </IndustrialModal>
      ) : null}

      {importOpen ? (
        <IndustrialModal
          title="Übergabepaket importieren"
          kicker="Fallübergabe / Vertretung"
          description="Import erzeugt grundsätzlich eigene lokale Daten. Bei passenden Gegenstücken entscheidest du bewusst über Zusammenführung oder Neuanlage."
          icon={<Upload className="h-5 w-5" />}
          wide
          onClose={onCloseImport}
        >
          <form className="industrial-modal-grid" onSubmit={submitImport}>
            <div className="industrial-modal-wide handover-import-file-step">
              <span>Übergabedatei</span>
              <div className="handover-import-file-row">
                <TextInput
                  label="Ausgewählte Übergabedatei"
                  value={
                    importFile && !importFile.canceled
                      ? importFile.fileName
                      : "Keine Übergabedatei ausgewählt"
                  }
                  readOnly
                  onValueChange={() => undefined}
                />
                <ToolbarButton
                  type="button"
                  onClick={selectImportFile}
                  disabled={importBusy}
                >
                  <Upload className="h-4 w-4" />
                  Datei auswählen
                </ToolbarButton>
              </div>
            </div>
            <PasswordInput
              label="Transport-Passphrase"
              value={importPassphrase}
              required
              wide
              error={
                importError && !importPassphrase.trim() ? importError : undefined
              }
              onValueChange={(value) => {
                setImportPassphrase(value);
                setImportSelection(null);
                setImportMode("create_new");
                setTargetCaseId("");
              }}
            />
            <FormActions className="handover-import-inspect-actions">
              <ToolbarButton
                type="button"
                onClick={inspectImport}
                disabled={importBusy || !importFile || importFile.canceled}
              >
                Paket prüfen
              </ToolbarButton>
            </FormActions>

            {importSelection ? (
              <ImportPackageReview
                caseCount={importSelection.inspection.caseCount}
                measureCount={importSelection.inspection.measureCount}
                documentCount={importSelection.inspection.documentCount}
                deadlineCount={importSelection.inspection.deadlineCount}
                validUntilLabel={formatGermanDate(importSelection.inspection.expiresAt)}
                integrityLabel={
                  importSelection.inspection.integrity?.verified
                    ? `Integrität kryptografisch bestätigt · Format ${importSelection.inspection.integrity.formatVersion}`
                    : undefined
                }
                fileNotice={
                  importSelection.inspection.file
                    ? `${importSelection.inspection.file.fileName} · ${Math.max(1, Math.round(importSelection.inspection.file.sizeBytes / 1024))} KB`
                    : undefined
                }
                warnings={importSelection.inspection.warnings}
                matches={importSelection.inspection.matches.map((match) => ({
                  id: match.localCaseId,
                  label: `${match.caseNumber} · ${match.displayName}`,
                  reasonLabel: reasonLabel(match.reason),
                }))}
                mode={importMode}
                targetId={targetCaseId}
                onModeChange={setImportMode}
                onTargetChange={setTargetCaseId}
              />
            ) : null}

            {importError && importPassphrase.trim() ? (
              <div
                className="industrial-message industrial-message-warning industrial-modal-wide"
                role="alert"
              >
                <AlertTriangle className="h-4 w-4" />
                {importError}
              </div>
            ) : null}
            <FormActions>
              <GhostButton
                type="button"
                onClick={onCloseImport}
                disabled={importBusy}
              >
                Abbrechen
              </GhostButton>
              <IndustrialButton
                type="submit"
                disabled={importBusy || !importSelection}
                loading={importBusy}
              >
                <Upload className="h-4 w-4" />
                Übergabe importieren
              </IndustrialButton>
            </FormActions>
          </form>
        </IndustrialModal>
      ) : null}
    </>
  );
}
