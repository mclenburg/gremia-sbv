import { useMemo, useState } from 'react';
import { Download, ShieldAlert, UploadCloud } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { CaseRecord } from '../../core/models/case.model';
import type {
  CreateProtectedPersonInput,
  PersonImportExecuteInput,
  PersonImportExecuteResult,
  PersonImportPreviewInput,
  PersonImportPreviewResult,
  ProtectedPersonRecord,
  UpdateProtectedPersonInput
} from '../../core/models/protected-person.model';
import { PersonList } from './PersonList';
import { PersonForm } from './PersonForm';
import { PersonDetail } from './PersonDetail';
import { PersonExpiryDashboardCard } from './PersonExpiryDashboardCard';
import { PersonImportWizard } from './PersonImportWizard';
import type { ImportSource } from './personImportUi';

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
  const announce = useAnnouncer();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProtectedPersonRecord | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return persons;
    return persons.filter((person) => [
      person.firstName,
      person.lastName,
      person.workEmail,
      person.organizationalUnit,
      person.location,
      person.personnelNumber
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [persons, query]);

  async function createPerson(input: CreateProtectedPersonInput) {
    setError('');
    await onCreate(input);
    announce('Person wurde angelegt.');
  }

  async function updatePerson(id: string, input: UpdateProtectedPersonInput) {
    setError('');
    await onUpdate(id, input);
    if (selected?.id === id) setSelected({ ...selected, ...input } as ProtectedPersonRecord);
    announce('Personendaten wurden aktualisiert.');
  }

  async function evaluateExpiry() {
    await onEvaluateExpiry();
    announce('Statusabläufe wurden geprüft.');
  }

  async function exportIcal() {
    await onExportIcal();
    announce('Fristenexport wurde erstellt.');
  }

  function showMessage(nextMessage: string) {
    setError('');
    setMessage(nextMessage);
    announce(nextMessage);
  }

  function showError(nextError: string) {
    setMessage('');
    setError(nextError);
    announce(nextError);
  }

  return (
    <ModuleFrame
      title="Personenverzeichnis"
      kicker="0.9.1 · Datenschutz-Lifecycle"
      description="Datensparsames Verzeichnis schwerbehinderter und gleichgestellter Personen mit Import, Statusablauf und Fristenintegration."
    >
      <div className="industrial-alert">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" aria-hidden="true" />
        <p>
          Gremia.SBV speichert hier nur den Schutzstatus, nicht den GdB. Importdateien werden lokal verarbeitet und nicht dauerhaft gespeichert.
        </p>
      </div>

      <div className="person-toolbar">
        <label className="person-search"><span>Person suchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, E-Mail, Organisationseinheit" /></label>
        <button type="button" className="industrial-button" onClick={() => setImportOpen(true)} data-e2e="open-person-import-wizard"><UploadCloud className="h-4 w-4" aria-hidden="true" /> Personen importieren</button>
        <button type="button" className="industrial-secondary-button" onClick={() => void exportIcal()}><Download className="h-4 w-4" aria-hidden="true" /> Fristen exportieren</button>
      </div>

      <div className="person-workbench-grid" data-e2e="persons-workbench">
        <PersonList persons={filtered} selectedId={selected?.id} onSelect={setSelected} />
        <div className="person-side-stack">
          <PersonExpiryDashboardCard persons={persons} onEvaluateExpiry={evaluateExpiry} onExportIcal={exportIcal} />
          <PersonForm onCreate={createPerson} onCreated={showMessage} onError={showError} />
          <PersonDetail person={selected} cases={cases} onUpdate={updatePerson} />
        </div>
      </div>

      {message && <div className="industrial-message industrial-message-success">{message}</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}

      <PersonImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSelectImportFile={onSelectImportFile}
        onPreviewImport={onPreviewImport}
        onExecuteImport={onExecuteImport}
        onImported={showMessage}
        onError={showError}
      />
    </ModuleFrame>
  );
}
