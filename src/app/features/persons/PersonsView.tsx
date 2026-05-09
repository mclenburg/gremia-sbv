import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarCheck, Download, FileSpreadsheet, HelpCircle, Plus, ShieldAlert, UploadCloud, UserRoundCheck, X } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import type { CaseRecord } from '../../core/models/case.model';
import type {
  CreateProtectedPersonInput,
  PersonImportColumnMapping,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult,
  ProtectedPersonRecord,
  ProtectionStatus,
  UpdateProtectedPersonInput
} from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';

const statusOptions: ProtectionStatus[] = ['severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive'];
const importFieldOptions = [
  { key: 'fullName', label: 'Vollname' },
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'protectionStatus', label: 'Schutzstatus' },
  { key: 'statusValidUntil', label: 'Status gültig bis' },
  { key: 'workEmail', label: 'Dienstliche E-Mail' },
  { key: 'personnelNumber', label: 'Personalnummer' },
  { key: 'organizationalUnit', label: 'Organisationseinheit' },
  { key: 'location', label: 'Standort' },
  { key: 'leftCompanyAt', label: 'Beschäftigungsende' }
] as const;

type ImportFieldKey = (typeof importFieldOptions)[number]['key'];
type ImportSource = { sourceFileName: string; fileType: 'csv' | 'xlsx'; filePath?: string; csvText?: string };
type ImportStep = 'source' | 'preview' | 'mapping' | 'validate' | 'result';

function toInputDate(value?: string): string {
  return value?.slice(0, 10) ?? '';
}

function buildDefaultMapping(columns: string[] = []): PersonImportColumnMapping {
  const pick = (...patterns: RegExp[]) => columns.find((column) => patterns.some((pattern) => pattern.test(column))) ?? '';
  const nameColumn = pick(/^name$/i, /vollname/i, /nachname.*vorname/i);
  return {
    fullName: nameColumn,
    fullNameMode: nameColumn ? 'last_comma_first' : 'last_comma_first',
    firstName: nameColumn ? '' : pick(/vorname/i),
    lastName: nameColumn ? '' : pick(/nachname/i),
    personnelNumber: pick(/personal/i, /pers.*nr/i),
    workEmail: pick(/e-?mail/i, /mail/i),
    organizationalUnit: pick(/organisation/i, /bereich/i, /abteilung/i),
    location: pick(/standort/i, /ort/i),
    protectionStatus: pick(/status/i, /schutz/i),
    statusValidUntil: pick(/gültig bis/i, /gueltig bis/i, /befrist/i),
    leftCompanyAt: pick(/beschäftigungsende/i, /beschaeftigungsende/i, /austritt/i)
  };
}

function hasMappedName(mapping: PersonImportColumnMapping): boolean {
  return Boolean(mapping.fullName || (mapping.firstName && mapping.lastName));
}

function countRowsWithErrors(preview?: PersonImportPreviewResult): number {
  return preview?.rows.filter((row) => row.validationErrors.length > 0).length ?? 0;
}

function createPreviewInput(source: ImportSource, mapping: PersonImportColumnMapping): PersonImportPreviewInput {
  return {
    sourceFileName: source.sourceFileName,
    fileType: source.fileType,
    filePath: source.filePath,
    csvText: source.csvText,
    delimiter: ';',
    headerRowIndex: 0,
    firstDataRowIndex: 1,
    mapping
  };
}

export function PersonsView({
  persons,
  cases,
  onCreate,
  onUpdate,
  onSelectImportFile,
  onPreviewImport,
  onExecuteImport,
  onEvaluateExpiry,
  onExportIcal
}: {
  persons: ProtectedPersonRecord[];
  cases: CaseRecord[];
  onCreate: (input: CreateProtectedPersonInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
  onSelectImportFile: () => Promise<ImportSource | null>;
  onPreviewImport: (input: PersonImportPreviewInput) => Promise<PersonImportPreviewResult>;
  onExecuteImport: (input: PersonImportExecuteInput) => Promise<PersonImportExecuteResult>;
  onEvaluateExpiry: () => Promise<void>;
  onExportIcal: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProtectedPersonRecord | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState<ProtectionStatus>('equivalent');
  const [statusValidUntil, setStatusValidUntil] = useState('');
  const [leftCompanyAt, setLeftCompanyAt] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('source');
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<PersonImportColumnMapping>(buildDefaultMapping());
  const [preview, setPreview] = useState<PersonImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<PersonImportExecuteResult | null>(null);
  const [showImportHelp, setShowImportHelp] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return persons;
    return persons.filter((person) => [person.firstName, person.lastName, person.workEmail, person.organizationalUnit, person.location, person.personnelNumber]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [persons, query]);

  async function submitPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const input: CreateProtectedPersonInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        protectionStatus: status,
        statusValidUntil: statusValidUntil || undefined,
        employmentState: leftCompanyAt ? 'left_company' : 'active_employee',
        leftCompanyAt: leftCompanyAt || undefined,
        statusSource: 'manual'
      };
      await onCreate(input);
      setFirstName('');
      setLastName('');
      setStatusValidUntil('');
      setLeftCompanyAt('');
      setMessage('Person wurde angelegt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Person konnte nicht gespeichert werden.');
    }
  }

  async function updateSelected(input: UpdateProtectedPersonInput) {
    if (!selected) return;
    setError('');
    await onUpdate(selected.id, input);
    setSelected({ ...selected, ...input } as ProtectedPersonRecord);
  }

  function resetImport() {
    setImportOpen(true);
    setImportStep('source');
    setImportSource(null);
    setPreview(null);
    setImportResult(null);
    setCsvText('');
    setMapping(buildDefaultMapping());
    setShowImportHelp(false);
    setError('');
    setMessage('');
  }

  function closeImport() {
    setImportOpen(false);
    setShowImportHelp(false);
  }

  async function loadFileForPreview() {
    setError('');
    const selectedFile = await onSelectImportFile();
    if (!selectedFile) return;
    const defaultMapping = buildDefaultMapping();
    const nextPreview = await onPreviewImport(createPreviewInput(selectedFile, defaultMapping));
    const detectedMapping = buildDefaultMapping(nextPreview.columns);
    const mappedPreview = await onPreviewImport(createPreviewInput(selectedFile, detectedMapping));
    setImportSource(selectedFile);
    setMapping(detectedMapping);
    setPreview(mappedPreview);
    setImportStep('preview');
  }

  async function previewPastedCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!csvText.trim()) {
      setError('Bitte zuerst CSV-Daten einfügen.');
      return;
    }
    const source: ImportSource = {
      sourceFileName: 'eingefuegte-arbeitgeberliste.csv',
      fileType: 'csv',
      csvText
    };
    const defaultMapping = buildDefaultMapping();
    const nextPreview = await onPreviewImport(createPreviewInput(source, defaultMapping));
    const detectedMapping = buildDefaultMapping(nextPreview.columns);
    const mappedPreview = await onPreviewImport(createPreviewInput(source, detectedMapping));
    setImportSource(source);
    setMapping(detectedMapping);
    setPreview(mappedPreview);
    setImportStep('preview');
  }

  async function refreshPreview(nextMapping = mapping) {
    if (!importSource) return;
    setError('');
    const nextPreview = await onPreviewImport(createPreviewInput(importSource, nextMapping));
    setPreview(nextPreview);
  }

  function updateMapping(key: ImportFieldKey, value: string) {
    const nextMapping = { ...mapping, [key]: value || undefined };
    if (key === 'fullName' && value) {
      nextMapping.firstName = '';
      nextMapping.lastName = '';
    }
    if ((key === 'firstName' || key === 'lastName') && value) {
      nextMapping.fullName = '';
    }
    setMapping(nextMapping);
  }

  async function validateImport() {
    if (!importSource) return;
    if (!hasMappedName(mapping) || !mapping.protectionStatus) {
      setError('Bitte ordnen Sie einen Namen und den Schutzstatus zu.');
      return;
    }
    await refreshPreview(mapping);
    setImportStep('validate');
  }

  async function executeImport() {
    if (!importSource) return;
    setError('');
    const result = await onExecuteImport(createPreviewInput(importSource, mapping));
    setImportResult(result);
    setImportStep('result');
    setMessage('Import wurde durchgeführt. Die Importdatei wurde nicht dauerhaft gespeichert.');
  }

  return (
    <ModuleFrame
      title="Personenverzeichnis"
      kicker="0.9.1 · Datenschutz-Lifecycle"
      description="Datensparsames Verzeichnis schwerbehinderter und gleichgestellter Personen mit Import, Statusablauf und Fristenintegration."
    >
      <div className="industrial-alert">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
        <p>
          Gremia.SBV speichert hier keinen GdB und keine Diagnosen. Entscheidend ist der Schutzstatus. Läuft der Status ab, wird eine Frist im bestehenden Fristensystem erzeugt und eine Datenschutzprüfung erforderlich.
        </p>
      </div>

      <div className="person-action-bar" aria-label="Aktionen im Personenverzeichnis">
        <button type="button" className="industrial-button" onClick={resetImport} data-e2e="open-person-import-wizard">
          <UploadCloud className="h-4 w-4" />
          Personen importieren
        </button>
        <button type="button" className="industrial-secondary-button" onClick={() => void onEvaluateExpiry()}>
          <UserRoundCheck className="h-4 w-4" />
          Ablauf prüfen
        </button>
        <button type="button" className="industrial-secondary-button" onClick={() => void onExportIcal()}>
          <Download className="h-4 w-4" />
          Fristen als iCal
        </button>
      </div>

      <div className="person-workbench" data-e2e="persons-workbench">
        <section className="industrial-panel person-list-panel" aria-labelledby="persons-list-heading">
          <div className="industrial-panel-header compact">
            <div>
              <p className="industrial-kicker">Liste</p>
              <h2 id="persons-list-heading">Geschützte Personen</h2>
            </div>
            <div className="industrial-counter"><strong>{persons.length}</strong><span>Datensätze</span></div>
          </div>
          <div className="case-register-toolbar person-toolbar">
            <label>
              <span>Suche</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, E-Mail, OE, Standort" aria-label="Personen suchen" />
            </label>
          </div>
          <div className="person-table-wrapper">
            <table className="industrial-table person-table">
              <thead>
                <tr><th>Name</th><th>Status</th><th>Beschäftigung</th><th>Gültig bis</th><th>Lifecycle</th></tr>
              </thead>
              <tbody>
                {filtered.map((person) => (
                  <tr key={person.id} onClick={() => setSelected(person)} className={selected?.id === person.id ? 'active' : ''}>
                    <td><button type="button" className="industrial-link-button" onClick={() => setSelected(person)}>{person.lastName}, {person.firstName}</button></td>
                    <td>{protectionStatusLabels[person.protectionStatus]}</td>
                    <td>{employmentStateLabels[person.employmentState]}{person.leftCompanyAt ? ` seit ${toInputDate(person.leftCompanyAt)}` : ''}</td>
                    <td>{person.statusValidUntil ? new Intl.DateTimeFormat('de-DE').format(new Date(person.statusValidUntil)) : '—'}</td>
                    <td>{lifecycleStateLabels[person.lifecycleState]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="industrial-panel" aria-labelledby="person-create-heading">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Manuell</p><h2 id="person-create-heading">Person anlegen</h2></div></div>
          <form onSubmit={submitPerson} className="industrial-settings-form person-form">
            <label><span>Vorname</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
            <label><span>Nachname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
            <label><span>Schutzstatus</span><select value={status} onChange={(event) => setStatus(event.target.value as ProtectionStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{protectionStatusLabels[option]}</option>)}</select></label>
            <label><span>Status gültig bis</span><input type="date" value={statusValidUntil} onChange={(event) => setStatusValidUntil(event.target.value)} /></label>
            <label><span>Beschäftigungsende</span><input type="date" value={leftCompanyAt} onChange={(event) => setLeftCompanyAt(event.target.value)} /></label>
            <button type="submit" className="industrial-button"><Plus className="h-4 w-4" /> Person anlegen</button>
          </form>
        </section>

        {selected && (
          <section className="industrial-panel person-detail-panel" aria-labelledby="person-detail-heading">
            <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Detail</p><h2 id="person-detail-heading">{selected.lastName}, {selected.firstName}</h2></div></div>
            <div className="industrial-data-strip"><p>Status: {protectionStatusLabels[selected.protectionStatus]}</p><span>{lifecycleStateLabels[selected.lifecycleState]}</span></div>
            <div className="industrial-settings-form person-form">
              <label><span>Status gültig bis</span><input type="date" defaultValue={toInputDate(selected.statusValidUntil)} onBlur={(event) => void updateSelected({ statusValidUntil: event.target.value || undefined })} /></label>
              <label><span>Beschäftigungsende</span><input type="date" defaultValue={toInputDate(selected.leftCompanyAt)} onBlur={(event) => void updateSelected({ employmentState: event.target.value ? 'left_company' : 'active_employee', leftCompanyAt: event.target.value || undefined })} /></label>
            </div>
            <p className="industrial-muted">Verknüpfte Fallakten werden bei einer Anonymisierung nicht mehr mit Namen angezeigt, sondern erhalten eine Datenschutz-Prüfmarkierung.</p>
            <p className="industrial-meta">Verfügbare Fallakten: {cases.length}</p>
          </section>
        )}
      </div>
      {message && <div className="industrial-message industrial-message-success">{message}</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      {importOpen && (
        <div className="person-import-overlay" role="presentation">
          <section className="person-import-dialog" role="dialog" aria-modal="true" aria-labelledby="person-import-title" data-e2e="person-import-wizard">
            <header className="person-import-header">
              <div>
                <p className="industrial-kicker">Import-Assistent</p>
                <h2 id="person-import-title">Personen importieren</h2>
              </div>
              <button type="button" className="industrial-icon-button" onClick={closeImport} aria-label="Import-Assistent schließen">
                <X className="h-4 w-4" />
              </button>
            </header>

            <ol className="person-import-steps" aria-label="Import-Schritte">
              {['Quelle', 'Vorschau', 'Spaltenmapping', 'Prüfung', 'Ergebnis'].map((label, index) => {
                const stepKey: ImportStep[] = ['source', 'preview', 'mapping', 'validate', 'result'];
                return <li key={label} className={importStep === stepKey[index] ? 'active' : ''}>{index + 1}. {label}</li>;
              })}
            </ol>

            <button type="button" className="industrial-link-button person-help-toggle" onClick={() => setShowImportHelp((current) => !current)} aria-expanded={showImportHelp}>
              <HelpCircle className="h-4 w-4" /> Wie funktioniert der Import?
            </button>
            {showImportHelp && (
              <div className="industrial-alert person-import-help">
                <p>Wählen Sie eine Excel- oder CSV-Datei aus, prüfen Sie die Vorschau und ordnen Sie danach die Spalten den Zielfeldern zu. Personalnummer ist optional. Name und Vorname können getrennt oder in einer Vollnamen-Spalte stehen.</p>
              </div>
            )}

            {importStep === 'source' && (
              <div className="person-import-section">
                <p className="industrial-muted">Die Datei wird lokal verarbeitet und nicht dauerhaft gespeichert. Der genaue GdB wird nicht importiert.</p>
                <div className="person-source-actions">
                  <button type="button" className="industrial-button" onClick={() => void loadFileForPreview()}>
                    <FileSpreadsheet className="h-4 w-4" /> Excel-/CSV-Datei auswählen
                  </button>
                </div>
                <details className="person-csv-details">
                  <summary>Erweiterte Option: CSV direkt einfügen</summary>
                  <form onSubmit={previewPastedCsv} className="industrial-settings-form person-import-csv-form">
                    <label className="span-2"><span>CSV-Daten</span><textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={5} placeholder="Name;Status;Gültig bis\nMustermann, Max;gleichgestellt;15.06.2026" /></label>
                    <button type="submit" className="industrial-secondary-button">CSV-Vorschau erzeugen</button>
                  </form>
                </details>
              </div>
            )}

            {importStep === 'preview' && preview && (
              <div className="person-import-section">
                <h3>Vorschau aus {importSource?.sourceFileName}</h3>
                <p className="industrial-muted">Gezeigt werden die ersten importierbaren Zeilen. Im nächsten Schritt ordnen Sie die echten Spalten der Datei den Zielfeldern zu.</p>
                <ImportPreviewTable preview={preview} />
                <div className="person-import-footer">
                  <button type="button" className="industrial-secondary-button" onClick={() => setImportStep('source')}>Zurück</button>
                  <button type="button" className="industrial-button" onClick={() => setImportStep('mapping')}>Weiter zum Spaltenmapping</button>
                </div>
              </div>
            )}

            {importStep === 'mapping' && preview && (
              <div className="person-import-section">
                <h3>Spaltenmapping</h3>
                <p className="industrial-muted">Ordnen Sie die Spalten der Arbeitgeberliste den Zielfeldern zu. Nutzen Sie entweder Vollname oder getrennte Vor-/Nachnamen.</p>
                <div className="person-mapping-grid">
                  {importFieldOptions.map((field) => (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <select value={String(mapping[field.key] ?? '')} onChange={(event) => updateMapping(field.key, event.target.value)}>
                        <option value="">Nicht importieren</option>
                        {preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                {mapping.fullName && (
                  <label className="person-fullname-mode">
                    <span>Namensformat für Vollname</span>
                    <select value={mapping.fullNameMode ?? 'last_comma_first'} onChange={(event) => setMapping({ ...mapping, fullNameMode: event.target.value as PersonImportColumnMapping['fullNameMode'] })}>
                      <option value="last_comma_first">Nachname, Vorname</option>
                      <option value="first_last">Vorname Nachname</option>
                    </select>
                  </label>
                )}
                <div className="person-import-footer">
                  <button type="button" className="industrial-secondary-button" onClick={() => setImportStep('preview')}>Zurück</button>
                  <button type="button" className="industrial-button" onClick={() => void validateImport()}>Mapping prüfen</button>
                </div>
              </div>
            )}

            {importStep === 'validate' && preview && (
              <div className="person-import-section">
                <h3>Importprüfung</h3>
                <div className="person-import-summary">
                  <span>{preview.rows.length} Zeilen in der Vorschau</span>
                  <span>{countRowsWithErrors(preview)} Zeilen mit Hinweisen</span>
                  <span>{preview.warnings.length} allgemeine Hinweise</span>
                </div>
                {preview.warnings.map((warning) => <p key={warning} className="industrial-message industrial-message-warning">{warning}</p>)}
                <ImportPreviewTable preview={preview} />
                <div className="person-import-footer">
                  <button type="button" className="industrial-secondary-button" onClick={() => setImportStep('mapping')}>Zurück</button>
                  <button type="button" className="industrial-button" onClick={() => void executeImport()}>Import ausführen</button>
                </div>
              </div>
            )}

            {importStep === 'result' && importResult && (
              <div className="person-import-section">
                <h3><CalendarCheck className="inline-icon" /> Import abgeschlossen</h3>
                <div className="person-import-summary result">
                  <span>Neu: {importResult.run.createdCount}</span>
                  <span>Aktualisiert: {importResult.run.updatedCount}</span>
                  <span>Unverändert: {importResult.run.unchangedCount}</span>
                  <span>Konflikte: {importResult.run.conflictCount}</span>
                  <span>Übersprungen: {importResult.run.skippedCount}</span>
                </div>
                <p className="industrial-muted">Die Importdatei wurde nicht dauerhaft gespeichert. Das Importprotokoll enthält keine Rohdaten.</p>
                <div className="person-import-footer">
                  <button type="button" className="industrial-button" onClick={closeImport}>Schließen</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </ModuleFrame>
  );
}

function ImportPreviewTable({ preview }: { preview: PersonImportPreviewResult }) {
  return (
    <div className="person-preview-table-wrapper">
      <table className="industrial-table person-preview-table">
        <thead>
          <tr>
            <th>Zeile</th>
            <th>Name</th>
            <th>Status</th>
            <th>Gültig bis</th>
            <th>Hinweise</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.slice(0, 8).map((row) => (
            <tr key={row.rowNumber}>
              <td>{row.rowNumber}</td>
              <td>{[row.lastName, row.firstName].filter(Boolean).join(', ') || '—'}</td>
              <td>{row.protectionStatus ? protectionStatusLabels[row.protectionStatus] : '—'}</td>
              <td>{row.statusValidUntil ?? '—'}</td>
              <td>{row.validationErrors.length ? row.validationErrors.join(' · ') : 'ok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
