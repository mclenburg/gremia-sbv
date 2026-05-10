import { useState, type FormEvent } from 'react';
import { CalendarCheck, FileSpreadsheet, HelpCircle, X } from 'lucide-react';
import type {
  PersonImportColumnMapping,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult
} from '../../core/models/protected-person.model';
import { protectionStatusLabels } from '../../core/models/protected-person.model';
import {
  buildDefaultMapping,
  countRowsWithErrors,
  createPreviewInput,
  hasMappedName,
  importFieldOptions,
  type ImportFieldKey,
  type ImportSource,
  type ImportStep,
  updateColumnMapping
} from './personImportUi';

export function PersonImportWizard({
  open,
  onClose,
  onSelectImportFile,
  onPreviewImport,
  onExecuteImport,
  onImported,
  onError
}: {
  open: boolean;
  onClose: () => void;
  onSelectImportFile: () => Promise<ImportSource | null>;
  onPreviewImport: (input: PersonImportPreviewInput) => Promise<PersonImportPreviewResult>;
  onExecuteImport: (input: PersonImportExecuteInput) => Promise<PersonImportExecuteResult>;
  onImported: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [step, setStep] = useState<ImportStep>('source');
  const [source, setSource] = useState<ImportSource | null>(null);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<PersonImportColumnMapping>(buildDefaultMapping());
  const [preview, setPreview] = useState<PersonImportPreviewResult | null>(null);
  const [result, setResult] = useState<PersonImportExecuteResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (!open) return null;

  function resetAndClose() {
    setStep('source');
    setSource(null);
    setCsvText('');
    setMapping(buildDefaultMapping());
    setPreview(null);
    setResult(null);
    setShowHelp(false);
    onClose();
  }

  async function previewSource(nextSource: ImportSource) {
    const basePreview = await onPreviewImport(createPreviewInput(nextSource, buildDefaultMapping()));
    const detectedMapping = buildDefaultMapping(basePreview.columns);
    const mappedPreview = await onPreviewImport(createPreviewInput(nextSource, detectedMapping));
    setSource(nextSource);
    setMapping(detectedMapping);
    setPreview(mappedPreview);
    setStep('preview');
  }

  async function loadFileForPreview() {
    try {
      const selectedFile = await onSelectImportFile();
      if (selectedFile) await previewSource(selectedFile);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Importdatei konnte nicht gelesen werden.');
    }
  }

  async function previewPastedCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csvText.trim()) {
      onError('Bitte zuerst CSV-Daten einfügen.');
      return;
    }
    await previewSource({ sourceFileName: 'eingefuegte-arbeitgeberliste.csv', fileType: 'csv', csvText });
  }

  async function refreshPreview(nextMapping = mapping) {
    if (!source) return;
    setPreview(await onPreviewImport(createPreviewInput(source, nextMapping)));
  }

  function updateMapping(key: ImportFieldKey, value: string) {
    setMapping(updateColumnMapping(mapping, key, value));
  }

  async function validateImport() {
    if (!source) return;
    if (!hasMappedName(mapping) || !mapping.protectionStatus) {
      onError('Bitte ordnen Sie einen Namen und den Schutzstatus zu.');
      return;
    }
    await refreshPreview(mapping);
    setStep('validate');
  }

  async function executeImport() {
    if (!source) return;
    const importResult = await onExecuteImport(createPreviewInput(source, mapping));
    setResult(importResult);
    setStep('result');
    onImported('Import wurde durchgeführt. Die Importdatei wurde nicht dauerhaft gespeichert.');
  }

  return (
    <div className="person-import-overlay" role="presentation">
      <section className="person-import-dialog" role="dialog" aria-modal="true" aria-labelledby="person-import-title" data-e2e="person-import-wizard">
        <header className="person-import-header">
          <div>
            <p className="industrial-kicker">Import-Assistent</p>
            <h2 id="person-import-title">Personen importieren</h2>
          </div>
          <button type="button" className="industrial-icon-button" onClick={resetAndClose} aria-label="Import-Assistent schließen" data-e2e="person-import-close-icon">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <ImportSteps currentStep={step} />
        <button type="button" className="industrial-link-button person-help-toggle" onClick={() => setShowHelp((current) => !current)} aria-expanded={showHelp}>
          <HelpCircle className="h-4 w-4" aria-hidden="true" /> Wie funktioniert der Import?
        </button>
        {showHelp && <ImportHelp />}
        {step === 'source' && (
          <SourceStep csvText={csvText} onCsvTextChange={setCsvText} onLoadFile={loadFileForPreview} onPreviewPastedCsv={previewPastedCsv} />
        )}
        {step === 'preview' && preview && (
          <PreviewStep sourceName={source?.sourceFileName ?? ''} preview={preview} onBack={() => setStep('source')} onNext={() => setStep('mapping')} />
        )}
        {step === 'mapping' && preview && (
          <MappingStep preview={preview} mapping={mapping} onMappingChange={updateMapping} onModeChange={(fullNameMode) => setMapping({ ...mapping, fullNameMode })} onBack={() => setStep('preview')} onValidate={validateImport} />
        )}
        {step === 'validate' && preview && (
          <ValidateStep preview={preview} onBack={() => setStep('mapping')} onExecute={executeImport} />
        )}
        {step === 'result' && result && <ResultStep result={result} onClose={resetAndClose} />}
      </section>
    </div>
  );
}

function ImportSteps({ currentStep }: { currentStep: ImportStep }) {
  const steps: { key: ImportStep; label: string }[] = [
    { key: 'source', label: 'Quelle' },
    { key: 'preview', label: 'Vorschau' },
    { key: 'mapping', label: 'Spaltenmapping' },
    { key: 'validate', label: 'Prüfung' },
    { key: 'result', label: 'Ergebnis' }
  ];
  return (
    <ol className="person-import-steps" aria-label="Import-Schritte">
      {steps.map((item, index) => <li key={item.key} className={currentStep === item.key ? 'active' : ''}>{index + 1}. {item.label}</li>)}
    </ol>
  );
}

function ImportHelp() {
  return (
    <div className="industrial-alert person-import-help">
      <p>Wählen Sie eine Excel- oder CSV-Datei aus, prüfen Sie die Vorschau und ordnen Sie danach die Spalten den Zielfeldern zu. Personalnummer ist optional. Name und Vorname können getrennt oder in einer Vollnamen-Spalte stehen.</p>
    </div>
  );
}

function SourceStep({ csvText, onCsvTextChange, onLoadFile, onPreviewPastedCsv }: { csvText: string; onCsvTextChange: (value: string) => void; onLoadFile: () => void; onPreviewPastedCsv: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="person-import-section">
      <p className="industrial-muted">Die Datei wird lokal verarbeitet und nicht dauerhaft gespeichert. Der genaue GdB wird nicht importiert.</p>
      <button type="button" className="industrial-button" onClick={onLoadFile}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel-/CSV-Datei auswählen</button>
      <details className="person-csv-details">
        <summary>Erweiterte Option: CSV direkt einfügen</summary>
        <form onSubmit={onPreviewPastedCsv} className="industrial-settings-form person-import-csv-form">
          <label className="span-2"><span>CSV-Daten</span><textarea value={csvText} onChange={(event) => onCsvTextChange(event.target.value)} rows={5} placeholder={'Name;Status;Gültig bis\nMustermann, Max;gleichgestellt;15.06.2026'} /></label>
          <button type="submit" className="industrial-secondary-button">CSV-Vorschau erzeugen</button>
        </form>
      </details>
    </div>
  );
}

function PreviewStep({ sourceName, preview, onBack, onNext }: { sourceName: string; preview: PersonImportPreviewResult; onBack: () => void; onNext: () => void }) {
  return (
    <div className="person-import-section">
      <h3>Vorschau aus {sourceName}</h3>
      <p className="industrial-muted">Gezeigt werden die ersten importierbaren Zeilen. Im nächsten Schritt ordnen Sie die echten Spalten der Datei den Zielfeldern zu.</p>
      <ImportPreviewTable preview={preview} />
      <div className="person-import-footer"><button type="button" className="industrial-secondary-button" onClick={onBack}>Zurück</button><button type="button" className="industrial-button" onClick={onNext}>Weiter zum Spaltenmapping</button></div>
    </div>
  );
}

function MappingStep({ preview, mapping, onMappingChange, onModeChange, onBack, onValidate }: { preview: PersonImportPreviewResult; mapping: PersonImportColumnMapping; onMappingChange: (key: ImportFieldKey, value: string) => void; onModeChange: (mode: PersonImportColumnMapping['fullNameMode']) => void; onBack: () => void; onValidate: () => void }) {
  return (
    <div className="person-import-section">
      <h3>Spaltenmapping</h3>
      <p className="industrial-muted">Ordnen Sie die Spalten der Arbeitgeberliste den Zielfeldern zu. Nutzen Sie entweder Vollname oder getrennte Vor-/Nachnamen.</p>
      <div className="person-mapping-grid">
        {importFieldOptions.map((field) => (
          <label key={field.key}><span>{field.label}</span><select aria-label={field.label} data-e2e={`person-import-field-${field.key}`} value={String(mapping[field.key] ?? '')} onChange={(event) => onMappingChange(field.key, event.target.value)}><option value="">Nicht importieren</option>{preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
        ))}
      </div>
      {mapping.fullName && <label className="person-fullname-mode"><span>Format der Namensspalte</span><select aria-label="Format der Namensspalte" data-e2e="person-import-fullname-mode" value={mapping.fullNameMode ?? 'last_comma_first'} onChange={(event) => onModeChange(event.target.value as PersonImportColumnMapping['fullNameMode'])}><option value="last_comma_first">Nachname, Vorname</option><option value="first_last">Vorname Nachname</option></select></label>}
      <div className="person-import-footer"><button type="button" className="industrial-secondary-button" onClick={onBack}>Zurück</button><button type="button" className="industrial-button" onClick={() => void onValidate()}>Mapping prüfen</button></div>
    </div>
  );
}

function ValidateStep({ preview, onBack, onExecute }: { preview: PersonImportPreviewResult; onBack: () => void; onExecute: () => void }) {
  return (
    <div className="person-import-section"><h3>Importprüfung</h3><div className="person-import-summary"><span>{preview.rows.length} Zeilen in der Vorschau</span><span>{countRowsWithErrors(preview)} Zeilen mit Hinweisen</span><span>{preview.warnings.length} allgemeine Hinweise</span></div>{preview.warnings.map((warning) => <p key={warning} className="industrial-message industrial-message-warning">{warning}</p>)}<ImportPreviewTable preview={preview} /><div className="person-import-footer"><button type="button" className="industrial-secondary-button" onClick={onBack}>Zurück</button><button type="button" className="industrial-button" onClick={() => void onExecute()}>Import ausführen</button></div></div>
  );
}

function ResultStep({ result, onClose }: { result: PersonImportExecuteResult; onClose: () => void }) {
  return (
    <div className="person-import-section"><h3><CalendarCheck className="inline-icon" aria-hidden="true" /> Import abgeschlossen</h3><div className="person-import-summary result"><span>Neu: {result.run.createdCount}</span><span>Aktualisiert: {result.run.updatedCount}</span><span>Unverändert: {result.run.unchangedCount}</span><span>Konflikte: {result.run.conflictCount}</span><span>Übersprungen: {result.run.skippedCount}</span></div><p className="industrial-muted">Die Importdatei wurde nicht dauerhaft gespeichert. Das Importprotokoll enthält keine Rohdaten.</p><div className="person-import-footer"><button type="button" className="industrial-button" data-e2e="person-import-close-result" onClick={onClose}>Schließen</button></div></div>
  );
}

function ImportPreviewTable({ preview }: { preview: PersonImportPreviewResult }) {
  return (
    <div className="person-preview-table-wrapper"><table className="industrial-table person-preview-table"><thead><tr><th>Zeile</th><th>Name</th><th>Status</th><th>Gültig bis</th><th>Hinweise</th></tr></thead><tbody>{preview.rows.slice(0, 8).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{[row.lastName, row.firstName].filter(Boolean).join(', ') || '—'}</td><td>{row.protectionStatus ? protectionStatusLabels[row.protectionStatus] : '—'}</td><td>{row.statusValidUntil ?? '—'}</td><td>{row.validationErrors.length ? row.validationErrors.join(' · ') : 'ok'}</td></tr>)}</tbody></table></div>
  );
}
