import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseHandoverExportResult, CaseHandoverInspectResult, CaseHandoverImportMode } from '../../core/models/case-handover.model';

type ImportFileSelection = { canceled: true } | { canceled: false; filePath: string; fileName: string };
type InspectSelection = { filePath: string; fileName: string; inspection: CaseHandoverInspectResult };

type CaseHandoverTransferDialogsProps = {
  exportOpen: boolean;
  importOpen: boolean;
  selectedCase?: CaseRecord;
  onCloseExport: () => void;
  onCloseImport: () => void;
  onExport: (passphrase: string, expiresAt?: string) => Promise<CaseHandoverExportResult>;
  onSelectImportFile: () => Promise<ImportFileSelection>;
  onInspectImport: (filePath: string, passphrase: string) => Promise<CaseHandoverInspectResult>;
  onImport: (input: { filePath: string; passphrase: string; mode: CaseHandoverImportMode; targetCaseId?: string }) => Promise<void>;
};

function toIsoEndOfDay(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T23:59:59`);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString();
}

function formatGermanDate(value?: string): string {
  if (!value) return 'ohne Ablaufdatum';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

function reasonLabel(reason: string): string {
  if (reason === 'case_number') return 'Aktenzeichen';
  if (reason === 'person_name') return 'Personenname';
  return 'Name/Pseudonym';
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
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportValidUntil, setExportValidUntil] = useState('');
  const [exportError, setExportError] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportResult, setExportResult] = useState<CaseHandoverExportResult | null>(null);

  const [importPassphrase, setImportPassphrase] = useState('');
  const [importFile, setImportFile] = useState<ImportFileSelection | null>(null);
  const [importSelection, setImportSelection] = useState<InspectSelection | null>(null);
  const [importMode, setImportMode] = useState<CaseHandoverImportMode>('create_new');
  const [targetCaseId, setTargetCaseId] = useState('');
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    if (!exportOpen) {
      setExportPassphrase('');
      setExportValidUntil('');
      setExportError('');
      setExportBusy(false);
      setExportResult(null);
    }
  }, [exportOpen]);

  useEffect(() => {
    if (!importOpen) {
      setImportPassphrase('');
      setImportFile(null);
      setImportSelection(null);
      setImportMode('create_new');
      setTargetCaseId('');
      setImportError('');
      setImportBusy(false);
    }
  }, [importOpen]);

  const selectedMatch = useMemo(() => {
    return importSelection?.inspection.matches.find((match) => match.localCaseId === targetCaseId);
  }, [importSelection, targetCaseId]);

  async function submitExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExportError('');
    if (!selectedCase) {
      setExportError('Bitte zuerst eine Fallakte auswählen.');
      return;
    }
    if (exportPassphrase.trim().length < 10) {
      setExportError('Die Transport-Passphrase muss mindestens 10 Zeichen lang sein.');
      return;
    }
    if (exportValidUntil.trim() && !toIsoEndOfDay(exportValidUntil)) {
      setExportError('Bitte das Ablaufdatum im Format JJJJ-MM-TT eingeben.');
      return;
    }
    setExportBusy(true);
    try {
      const result = await onExport(exportPassphrase, toIsoEndOfDay(exportValidUntil));
      if (!result.exported) {
        setExportError('Export wurde abgebrochen.');
        return;
      }
      setExportResult(result);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Übergabepaket konnte nicht erstellt werden.');
    } finally {
      setExportBusy(false);
    }
  }

  async function selectImportFile() {
    setImportError('');
    setImportSelection(null);
    setImportMode('create_new');
    setTargetCaseId('');
    setImportBusy(true);
    try {
      const result = await onSelectImportFile();
      if (result.canceled) return;
      setImportFile(result);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Übergabedatei konnte nicht ausgewählt werden.');
    } finally {
      setImportBusy(false);
    }
  }

  async function inspectImport() {
    setImportError('');
    setImportSelection(null);
    setImportMode('create_new');
    setTargetCaseId('');
    if (!importFile || importFile.canceled) {
      setImportError('Bitte zuerst eine Übergabedatei auswählen.');
      return;
    }
    if (!importPassphrase.trim()) {
      setImportError('Bitte die Transport-Passphrase eingeben.');
      return;
    }
    setImportBusy(true);
    try {
      const inspection = await onInspectImport(importFile.filePath, importPassphrase);
      if (inspection.isExpired) {
        setImportError('Das Übergabepaket ist abgelaufen und darf nicht importiert werden. Bitte eine neue Übergabedatei anfordern.');
        return;
      }
      setImportSelection({ filePath: importFile.filePath, fileName: importFile.fileName, inspection });
      const firstMatch = inspection.matches[0];
      if (firstMatch) setTargetCaseId(firstMatch.localCaseId);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Übergabepaket konnte nicht geprüft werden.');
    } finally {
      setImportBusy(false);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportError('');
    if (!importSelection) {
      setImportError('Bitte zuerst ein gültiges Übergabepaket auswählen und prüfen.');
      return;
    }
    if (importSelection.inspection.isExpired) {
      setImportError('Das Übergabepaket ist abgelaufen und darf nicht importiert werden.');
      return;
    }
    if (importMode === 'merge_existing' && !targetCaseId) {
      setImportError('Bitte ein Gegenstück auswählen oder als neue Übergabeakte importieren.');
      return;
    }
    setImportBusy(true);
    try {
      await onImport({ filePath: importSelection.filePath, passphrase: importPassphrase, mode: importMode, targetCaseId: importMode === 'merge_existing' ? targetCaseId : undefined });
      onCloseImport();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Übergabepaket konnte nicht importiert werden.');
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <>
      {exportOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="case-handover-export-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><Download className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <p className="industrial-kicker">Fallübergabe / Vertretung</p>
                <h3 id="case-handover-export-title">Übergabepaket exportieren</h3>
                <p>Die ausgewählte Fallakte wird verschlüsselt als eigenständiges Übergabepaket gespeichert. Der Speicherort wird über den Systemdialog gewählt; es gibt keinen Browser-Download.</p>
              </div>
            </div>
            <form className="industrial-modal-grid" onSubmit={submitExport}>
              <label className="industrial-modal-wide">
                <span>Fallakte</span>
                <input value={selectedCase ? `${selectedCase.caseNumber} · ${selectedCase.displayName}` : 'Keine Fallakte ausgewählt'} readOnly />
              </label>
              <label className="industrial-modal-wide">
                <span>Transport-Passphrase</span>
                <input type="password" value={exportPassphrase} onChange={(event) => setExportPassphrase(event.target.value)} autoFocus minLength={10} />
              </label>
              <label className="industrial-modal-wide">
                <span>Gültig bis (optional)</span>
                <input type="date" value={exportValidUntil} onChange={(event) => setExportValidUntil(event.target.value)} />
              </label>
              <p className="industrial-modal-preview industrial-modal-wide">Nach Ablauf darf die Übergabedatei nicht mehr importiert werden. Bereits importierte Vertretungsakten werden danach als abgelaufen markiert.</p>
              {exportResult?.exported && (
                <div className="industrial-message industrial-modal-wide" role="status">
                  <Download className="h-4 w-4" />
                  <span>Übergabepaket gespeichert unter: {exportResult.filePath}</span>
                </div>
              )}
              {exportError && <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert"><AlertTriangle className="h-4 w-4" />{exportError}</div>}
              <div className="industrial-modal-actions industrial-modal-wide">
                <button type="button" className="industrial-secondary-button" onClick={onCloseExport} disabled={exportBusy}>{exportResult?.exported ? 'Schließen' : 'Abbrechen'}</button>
                <button type="submit" className="industrial-button" disabled={exportBusy || !selectedCase}><Download className="h-4 w-4" />{exportBusy ? 'Export läuft …' : exportResult?.exported ? 'Erneut exportieren' : 'Übergabe exportieren'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {importOpen && (
        <div className="industrial-modal-backdrop" role="presentation">
          <section className="industrial-modal industrial-modal-wide" role="dialog" aria-modal="true" aria-labelledby="case-handover-import-title">
            <div className="industrial-modal-header">
              <div className="industrial-modal-icon"><Upload className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <p className="industrial-kicker">Fallübergabe / Vertretung</p>
                <h3 id="case-handover-import-title">Übergabepaket importieren</h3>
                <p>Import erzeugt grundsätzlich eigene lokale Daten. Bei passenden Gegenstücken entscheidest du bewusst über Zusammenführung oder Neuanlage.</p>
              </div>
            </div>
            <form className="industrial-modal-grid" onSubmit={submitImport}>
              <div className="industrial-modal-wide handover-import-file-step">
                <span>Übergabedatei</span>
                <div className="handover-import-file-row">
                  <input value={importFile && !importFile.canceled ? importFile.fileName : 'Keine Übergabedatei ausgewählt'} readOnly aria-label="Ausgewählte Übergabedatei" />
                  <button type="button" className="industrial-secondary-button" onClick={selectImportFile} disabled={importBusy}>
                    <Upload className="h-4 w-4" />Datei auswählen
                  </button>
                </div>
              </div>
              <label className="industrial-modal-wide">
                <span>Transport-Passphrase</span>
                <input
                  type="password"
                  value={importPassphrase}
                  onChange={(event) => {
                    setImportPassphrase(event.target.value);
                    setImportSelection(null);
                    setImportMode('create_new');
                    setTargetCaseId('');
                  }}
                  autoFocus={false}
                />
              </label>
              <div className="industrial-modal-actions industrial-modal-wide handover-import-inspect-actions">
                <button type="button" className="industrial-secondary-button" onClick={inspectImport} disabled={importBusy || !importFile || importFile.canceled}>Paket prüfen</button>
              </div>

              {importSelection && (
                <div className="industrial-modal-preview industrial-modal-wide case-handover-import-preview">
                  <strong>Paket geprüft</strong>
                  <p>{importSelection.inspection.caseCount} Fallakte(n), {importSelection.inspection.measureCount} Maßnahme(n), {importSelection.inspection.documentCount} Dokument(e), {importSelection.inspection.deadlineCount} Frist(en). Gültigkeit: {formatGermanDate(importSelection.inspection.expiresAt)}.</p>
                  <fieldset className="case-handover-import-options">
                    <legend>Importentscheidung</legend>
                    <label className="industrial-checkbox-row compact">
                      <input type="radio" name="handover-import-mode" checked={importMode === 'create_new'} onChange={() => setImportMode('create_new')} />
                      <span>Als neue lokale Übergabeakte anlegen</span>
                    </label>
                    {!!importSelection.inspection.matches.length && (
                      <label className="industrial-checkbox-row compact">
                        <input type="radio" name="handover-import-mode" checked={importMode === 'merge_existing'} onChange={() => setImportMode('merge_existing')} />
                        <span>Mit bestehender Fallakte zusammenführen/aktualisieren</span>
                      </label>
                    )}
                    {importMode === 'merge_existing' && !!importSelection.inspection.matches.length && (
                      <label className="industrial-modal-wide">
                        <span>Passendes Gegenstück</span>
                        <select value={targetCaseId} onChange={(event) => setTargetCaseId(event.target.value)}>
                          {importSelection.inspection.matches.map((match) => (
                            <option key={match.localCaseId} value={match.localCaseId}>{match.caseNumber} · {match.displayName} · {reasonLabel(match.reason)}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {selectedMatch && <p>Gewählte Zusammenführung: {selectedMatch.caseNumber} · {reasonLabel(selectedMatch.reason)}.</p>}
                  </fieldset>
                </div>
              )}

              {importError && <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert"><AlertTriangle className="h-4 w-4" />{importError}</div>}
              <div className="industrial-modal-actions industrial-modal-wide">
                <button type="button" className="industrial-secondary-button" onClick={onCloseImport} disabled={importBusy}>Abbrechen</button>
                <button type="submit" className="industrial-button" disabled={importBusy || !importSelection}><Upload className="h-4 w-4" />{importBusy ? 'Import läuft …' : 'Übergabe importieren'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
