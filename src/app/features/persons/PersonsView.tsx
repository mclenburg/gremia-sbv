import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileSpreadsheet, Plus, ShieldAlert, UserRoundCheck } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import type { CaseRecord } from '../../core/models/case.model';
import type {
  CreateProtectedPersonInput,
  PersonImportColumnMapping,
  ProtectedPersonRecord,
  ProtectionStatus,
  UpdateProtectedPersonInput
} from '../../core/models/protected-person.model';
import { employmentStateLabels, lifecycleStateLabels, protectionStatusLabels } from '../../core/models/protected-person.model';

const statusOptions: ProtectionStatus[] = ['severely_disabled', 'equivalent', 'application_pending', 'unclear', 'expired', 'inactive'];

function toInputDate(value?: string): string {
  return value?.slice(0, 10) ?? '';
}

function buildDefaultMapping(): PersonImportColumnMapping {
  return {
    fullName: 'Name',
    fullNameMode: 'last_comma_first',
    firstName: 'Vorname',
    lastName: 'Nachname',
    personnelNumber: '',
    workEmail: 'E-Mail',
    organizationalUnit: 'Organisationseinheit',
    location: 'Standort',
    protectionStatus: 'Status',
    statusValidUntil: 'Gültig bis',
    leftCompanyAt: 'Beschäftigungsende'
  };
}

export function PersonsView({
  persons,
  cases,
  onCreate,
  onUpdate,
  onImportCsv,
  onSelectImportFile,
  onEvaluateExpiry,
  onExportIcal
}: {
  persons: ProtectedPersonRecord[];
  cases: CaseRecord[];
  onCreate: (input: CreateProtectedPersonInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateProtectedPersonInput) => Promise<void>;
  onImportCsv: (input: { csvText: string; mapping: PersonImportColumnMapping }) => Promise<void>;
  onSelectImportFile: (mapping: PersonImportColumnMapping) => Promise<void>;
  onEvaluateExpiry: () => Promise<void>;
  onExportIcal: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProtectedPersonRecord | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullNameColumn, setFullNameColumn] = useState('Name');
  const [fullNameMode, setFullNameMode] = useState<'first_last' | 'last_comma_first'>('last_comma_first');
  const [status, setStatus] = useState<ProtectionStatus>('equivalent');
  const [statusValidUntil, setStatusValidUntil] = useState('');
  const [leftCompanyAt, setLeftCompanyAt] = useState('');
  const [csvText, setCsvText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await onImportCsv({ csvText, mapping: { ...buildDefaultMapping(), fullName: fullNameColumn, fullNameMode } });
      setCsvText('');
      setMessage('Import wurde durchgeführt. GdB-Spalten werden nicht übernommen.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import konnte nicht durchgeführt werden.');
    }
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
            <button type="button" className="industrial-secondary-button" onClick={() => void onEvaluateExpiry()}>
              <UserRoundCheck className="h-4 w-4" />
              Ablauf prüfen
            </button>
            <button type="button" className="industrial-secondary-button" onClick={() => void onExportIcal()}>
              <Download className="h-4 w-4" />
              Fristen als iCal
            </button>
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

        <section className="industrial-panel" aria-labelledby="person-import-heading">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Import</p><h2 id="person-import-heading">Excel-/CSV-Import</h2></div></div>
          <p className="industrial-muted">Personalnummer ist optional. Vor- und Nachname können getrennt oder in einer Vollnamen-Spalte stehen; Kommaformat „Nachname, Vorname“ wird unterstützt.</p>
          <div className="industrial-card-actions">
            <button type="button" className="industrial-secondary-button" onClick={() => void onSelectImportFile({ ...buildDefaultMapping(), fullName: fullNameColumn, fullNameMode })}>
              <FileSpreadsheet className="h-4 w-4" /> Datei auswählen
            </button>
          </div>
          <form onSubmit={importCsv} className="industrial-settings-form person-form">
            <label><span>Vollnamen-Spalte</span><input value={fullNameColumn} onChange={(event) => setFullNameColumn(event.target.value)} /></label>
            <label><span>Namensformat</span><select value={fullNameMode} onChange={(event) => setFullNameMode(event.target.value as 'first_last' | 'last_comma_first')}><option value="last_comma_first">Nachname, Vorname</option><option value="first_last">Vorname Nachname</option></select></label>
            <label className="span-2"><span>CSV direkt einfügen</span><textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={6} placeholder="Nachname;Vorname;Status;Gültig bis" /></label>
            <button type="submit" className="industrial-button">CSV importieren</button>
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
    </ModuleFrame>
  );
}
