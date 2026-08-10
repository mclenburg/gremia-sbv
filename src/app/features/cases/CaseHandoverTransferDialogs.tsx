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


function useHandoverExport({ exportOpen, selectedCase, onExport }: Pick<CaseHandoverTransferDialogsProps, "exportOpen" | "selectedCase" | "onExport">) {
  const [passphrase, setPassphrase] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CaseHandoverExportResult | null>(null);
  useEffect(() => { if (!exportOpen) { setPassphrase(""); setValidUntil(""); setError(""); setBusy(false); setResult(null); } }, [exportOpen]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!selectedCase) return setError("Bitte zuerst eine Fallakte auswählen.");
    if (passphrase.trim().length < 10) return setError("Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.");
    if (validUntil.trim() && !toIsoEndOfDay(validUntil)) return setError("Bitte das Ablaufdatum im Format JJJJ-MM-TT eingeben.");
    setBusy(true);
    try {
      const next = await onExport(passphrase, toIsoEndOfDay(validUntil));
      if (!next.exported) return setError("Export wurde abgebrochen.");
      setResult(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Übergabepaket konnte nicht erstellt werden."); }
    finally { setBusy(false); }
  }
  return { passphrase, setPassphrase, validUntil, setValidUntil, error, busy, result, submit };
}

function useHandoverImport({ importOpen, onCloseImport, onSelectImportFile, onInspectImport, onImport }: Pick<CaseHandoverTransferDialogsProps, "importOpen" | "onCloseImport" | "onSelectImportFile" | "onInspectImport" | "onImport">) {
  const [passphrase, setPassphrase] = useState("");
  const [file, setFile] = useState<ImportFileSelection | null>(null);
  const [selection, setSelection] = useState<InspectSelection | null>(null);
  const [mode, setMode] = useState<CaseHandoverImportMode>("create_new");
  const [targetCaseId, setTargetCaseId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resetSelection = () => { setSelection(null); setMode("create_new"); setTargetCaseId(""); };
  useEffect(() => { if (!importOpen) { setPassphrase(""); setFile(null); resetSelection(); setError(""); setBusy(false); } }, [importOpen]);
  async function selectFile() {
    setError(""); resetSelection(); setBusy(true);
    try { const next = await onSelectImportFile(); if (!next.canceled) setFile(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Übergabedatei konnte nicht ausgewählt werden."); }
    finally { setBusy(false); }
  }
  async function inspect() {
    setError(""); resetSelection();
    if (!file || file.canceled) return setError("Bitte zuerst eine Übergabedatei auswählen.");
    if (!passphrase.trim()) return setError("Bitte die Transport-Passphrase eingeben.");
    setBusy(true);
    try {
      const inspection = await onInspectImport(file.filePath, passphrase);
      if (inspection.isExpired) return setError("Das Übergabepaket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.");
      setSelection({ filePath: file.filePath, fileName: file.fileName, inspection });
      if (inspection.matches[0]) setTargetCaseId(inspection.matches[0].localCaseId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Übergabepaket konnte nicht geprüft werden."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!selection) return setError("Bitte zuerst ein gültiges Übergabepaket auswählen und prüfen.");
    if (selection.inspection.isExpired) return setError("Das Übergabepaket ist abgelaufen und darf nicht importiert werden.");
    if (mode === "merge_existing" && !targetCaseId) return setError("Bitte ein Gegenstück auswählen oder als neue Übergabeakte importieren.");
    setBusy(true);
    try { await onImport({ filePath: selection.filePath, passphrase, mode, targetCaseId: mode === "merge_existing" ? targetCaseId : undefined }); onCloseImport(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Übergabepaket konnte nicht importiert werden."); }
    finally { setBusy(false); }
  }
  const changePassphrase = (value: string) => { setPassphrase(value); resetSelection(); };
  return { passphrase, changePassphrase, file, selection, mode, setMode, targetCaseId, setTargetCaseId, error, busy, selectFile, inspect, submit };
}

type ExportState = ReturnType<typeof useHandoverExport>;
type ImportState = ReturnType<typeof useHandoverImport>;

function HandoverExportDialog({ open, selectedCase, onClose, state }: { open: boolean; selectedCase?: CaseRecord; onClose: () => void; state: ExportState }) {
  if (!open) return null;
  if (state.result?.exported) return <ExportResultDialog title="Übergabepaket exportiert" filePath={state.result.filePath} description="Das verschlüsselte Übergabepaket wurde über den Systemdialog gespeichert. Der Speicherort bleibt sichtbares Nutzerfeedback und wird nicht als personenbezogener Inhalt ins Audit geschrieben." onClose={onClose} />;
  return <IndustrialModal title="Übergabepaket exportieren" kicker="Fallübergabe / Vertretung" description="Die ausgewählte Fallakte wird verschlüsselt als eigenständiges Übergabepaket gespeichert. Der Speicherort wird über den Systemdialog gewählt; es gibt keinen Browser-Download." icon={<Download className="h-5 w-5" />} onClose={onClose}>
    <form className="industrial-modal-grid" onSubmit={state.submit}>
      <TextInput label="Fallakte" value={selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : "Keine Fallakte ausgewählt"} readOnly wide onValueChange={() => undefined} />
      <PasswordInput label="Transport-Passphrase" value={state.passphrase} minLength={10} required wide error={state.error && state.passphrase.trim().length < 10 ? state.error : undefined} onValueChange={state.setPassphrase} />
      <DateInput label="Gültig bis (optional)" value={state.validUntil} wide onValueChange={state.setValidUntil} />
      <p className="industrial-modal-preview industrial-modal-wide">Nach Ablauf darf die Übergabedatei nicht mehr importiert werden. Bereits importierte Vertretungsakten werden danach als abgelaufen markiert.</p>
      {state.error && state.passphrase.trim().length >= 10 ? <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert"><AlertTriangle className="h-4 w-4" />{state.error}</div> : null}
      <FormActions><GhostButton type="button" onClick={onClose} disabled={state.busy}>Abbrechen</GhostButton><ExportAction type="submit" disabled={state.busy || !selectedCase} loading={state.busy}>Übergabe exportieren</ExportAction></FormActions>
    </form>
  </IndustrialModal>;
}

function HandoverImportReview({ state }: { state: ImportState }) {
  const inspection = state.selection?.inspection;
  if (!inspection) return null;
  return <ImportPackageReview caseCount={inspection.caseCount} measureCount={inspection.measureCount} documentCount={inspection.documentCount} deadlineCount={inspection.deadlineCount} validUntilLabel={formatGermanDate(inspection.expiresAt)} integrityLabel={inspection.integrity?.verified ? `Integrität kryptografisch bestätigt · Format ${inspection.integrity.formatVersion}` : undefined} fileNotice={inspection.file ? `${inspection.file.fileName} · ${Math.max(1, Math.round(inspection.file.sizeBytes / 1024))} KB` : undefined} warnings={inspection.warnings} matches={inspection.matches.map((match) => ({ id: match.localCaseId, label: `${match.caseNumber} · ${match.displayName}`, reasonLabel: reasonLabel(match.reason) }))} mode={state.mode} targetId={state.targetCaseId} onModeChange={state.setMode} onTargetChange={state.setTargetCaseId} />;
}

function HandoverImportDialog({ open, onClose, state }: { open: boolean; onClose: () => void; state: ImportState }) {
  if (!open) return null;
  return <IndustrialModal title="Übergabepaket importieren" kicker="Fallübergabe / Vertretung" description="Import erzeugt grundsätzlich eigene lokale Daten. Bei passenden Gegenstücken entscheidest du bewusst über Zusammenführung oder Neuanlage." icon={<Upload className="h-5 w-5" />} wide onClose={onClose}>
    <form className="industrial-modal-grid" onSubmit={state.submit}>
      <div className="industrial-modal-wide handover-import-file-step"><span>Übergabedatei</span><div className="handover-import-file-row"><TextInput label="Ausgewählte Übergabedatei" value={state.file && !state.file.canceled ? state.file.fileName : "Keine Übergabedatei ausgewählt"} readOnly onValueChange={() => undefined} /><ToolbarButton type="button" onClick={state.selectFile} disabled={state.busy}><Upload className="h-4 w-4" />Datei auswählen</ToolbarButton></div></div>
      <PasswordInput label="Transport-Passphrase" value={state.passphrase} required wide error={state.error && !state.passphrase.trim() ? state.error : undefined} onValueChange={state.changePassphrase} />
      <FormActions className="handover-import-inspect-actions"><ToolbarButton type="button" onClick={state.inspect} disabled={state.busy || !state.file || state.file.canceled}>Paket prüfen</ToolbarButton></FormActions>
      <HandoverImportReview state={state} />
      {state.error && state.passphrase.trim() ? <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert"><AlertTriangle className="h-4 w-4" />{state.error}</div> : null}
      <FormActions><GhostButton type="button" onClick={onClose} disabled={state.busy}>Abbrechen</GhostButton><IndustrialButton type="submit" disabled={state.busy || !state.selection} loading={state.busy}><Upload className="h-4 w-4" />Übergabe importieren</IndustrialButton></FormActions>
    </form>
  </IndustrialModal>;
}

export function CaseHandoverTransferDialogs(props: CaseHandoverTransferDialogsProps) {
  const exportState = useHandoverExport(props);
  const importState = useHandoverImport(props);
  return <>
    <HandoverExportDialog open={props.exportOpen} selectedCase={props.selectedCase} onClose={props.onCloseExport} state={exportState} />
    <HandoverImportDialog open={props.importOpen} onClose={props.onCloseImport} state={importState} />
  </>;
}
