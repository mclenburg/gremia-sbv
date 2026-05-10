import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { CreateProtectedPersonInput, ProtectedPersonRecord, UpdateProtectedPersonInput } from '../../core/models/protected-person.model';
import type { PrivacyReviewItemRecord } from '../../core/models/privacy-review.model';
import { PersonList } from './PersonList';
import { PersonForm } from './PersonForm';
import { PersonDetail } from './PersonDetail';
import { PersonExpiryDashboardCard } from './PersonExpiryDashboardCard';
import { PersonImportWizard } from './PersonImportWizard';
import { PersonCaseCreateDialog } from './PersonCaseCreateDialog';
import { PersonPrivacyActionDialog, type PersonPrivacyActionMode } from './PersonPrivacyActionDialog';
import { PersonToolbar } from './PersonToolbar';
import type { CreateCaseForPersonInput, PersonsViewProps } from './personsViewTypes';

function personCaseDialogLabel(selected: ProtectedPersonRecord | null): string {
  if (!selected) return 'ausgewählte Person';
  if (selected.recordKind === 'pseudonymous_request') return selected.pseudonymLabel || 'Anonyme Anfrage';
  return `${selected.lastName}, ${selected.firstName}`;
}

export function PersonsView(props: PersonsViewProps) {
  const { persons, cases, onCreateCaseForPerson, onCreate, onUpdate, onSelectImportFile, onPreviewImport, onExecuteImport, onEvaluateExpiry, onExportIcal, onListOpenPrivacyReviews, onDocumentRetention, onScheduleReviewLater, onClearReview, onAnonymizeReviewCase, onDeleteReviewCase, onAnonymizePerson, onDeletePerson } = props;
  const announce = useAnnouncer();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProtectedPersonRecord | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [privacyReviewOpen, setPrivacyReviewOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [personCreateOpen, setPersonCreateOpen] = useState(false);
  const [personPrivacyAction, setPersonPrivacyAction] = useState<PersonPrivacyActionMode | null>(null);
  const [privacyReviews, setPrivacyReviews] = useState<PrivacyReviewItemRecord[]>([]);
  const [privacyReviewLoading, setPrivacyReviewLoading] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return persons;
    return persons.filter((person) => [person.firstName, person.lastName, person.workEmail, person.organizationalUnit, person.location, person.personnelNumber].some((value) => value?.toLowerCase().includes(needle)));
  }, [persons, query]);

  function showMessage(nextMessage: string) { setError(''); setMessage(nextMessage); announce(nextMessage); }
  function showError(nextError: string) { setMessage(''); setError(nextError); announce(nextError); }
  async function createPerson(input: CreateProtectedPersonInput) { setError(''); await onCreate(input); announce('Person wurde angelegt.'); }
  async function updatePerson(id: string, input: UpdateProtectedPersonInput) { setError(''); await onUpdate(id, input); if (selected?.id === id) setSelected({ ...selected, ...input } as ProtectedPersonRecord); announce('Personendaten wurden aktualisiert.'); }
  async function createCaseFromPerson(input: CreateCaseForPersonInput) { if (!selected) return; setError(''); await onCreateCaseForPerson(selected, input); showMessage('Fallakte wurde aus der Person heraus angelegt.'); }
  async function evaluateExpiry() { await onEvaluateExpiry(); announce('Statusabläufe wurden geprüft.'); }
  async function exportIcal() { await onExportIcal(); announce('Fristenexport wurde erstellt.'); }

  async function openPrivacyReview() {
    if (!selected) return;
    setPrivacyReviewOpen(true); setPrivacyReviewLoading(true);
    try {
      const items = await onListOpenPrivacyReviews(selected.id);
      setPrivacyReviews(items);
      announce(items.length ? 'Fallakte benötigt Datenschutzprüfung.' : 'Keine offenen Datenschutzprüfungen vorhanden.');
    } catch (err) { showError(err instanceof Error ? err.message : 'Datenschutzprüfungen konnten nicht geladen werden.'); }
    finally { setPrivacyReviewLoading(false); }
  }

  async function submitPersonPrivacyAction(reason: string) {
    if (!selected || !personPrivacyAction) return;
    if (personPrivacyAction === 'anonymize') {
      await onAnonymizePerson(selected.id, reason);
      setSelected(null);
      showMessage('Person wurde anonymisiert. Verbundene Fallakten benötigen Datenschutzprüfung.');
      return;
    }
    await onDeletePerson(selected.id, reason);
    setSelected(null);
    showMessage('Person wurde gelöscht. Verbundene Fallakten benötigen Datenschutzprüfung.');
  }

  return (
    <ModuleFrame title="Personenverzeichnis" kicker="0.9.1 · Datenschutz-Lifecycle" description="Datensparsames Verzeichnis schwerbehinderter und gleichgestellter Personen mit Import, Statusablauf und Fristenintegration.">
      <div className="industrial-alert"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" aria-hidden="true" /><p>Gremia.SBV speichert hier nur den Schutzstatus, nicht den GdB. Importdateien werden lokal verarbeitet und nicht dauerhaft gespeichert.</p></div>
      <PersonToolbar query={query} selected={selected} onQueryChange={setQuery} onOpenCreate={() => setPersonCreateOpen(true)} onOpenCaseCreate={() => setCaseDialogOpen(true)} onOpenPrivacyAction={setPersonPrivacyAction} onOpenImport={() => setImportOpen(true)} onExportIcal={() => void exportIcal()} />
      <div className="person-workbench-grid" data-e2e="persons-workbench">
        <PersonList persons={filtered} selectedId={selected?.id} onSelect={setSelected} onDelete={(person) => { setSelected(person); setPersonPrivacyAction('delete'); }} />
        <div className="person-side-stack">
          <PersonDetail person={selected} cases={cases} onUpdate={updatePerson} privacyReviewOpen={privacyReviewOpen} privacyReviews={privacyReviews} privacyReviewLoading={privacyReviewLoading} onOpenPrivacyReview={openPrivacyReview} onClosePrivacyReview={() => setPrivacyReviewOpen(false)} onDocumentRetention={onDocumentRetention} onScheduleLater={onScheduleReviewLater} onClearReview={onClearReview} onAnonymizeCase={onAnonymizeReviewCase} onDeleteCase={onDeleteReviewCase} onMessage={showMessage} onError={showError} />
          <PersonExpiryDashboardCard persons={persons} onEvaluateExpiry={evaluateExpiry} onExportIcal={exportIcal} />
        </div>
      </div>
      {message && <div className="industrial-message industrial-message-success">{message}</div>}
      {error && <div className="industrial-message industrial-message-warning">{error}</div>}
      <PersonForm open={personCreateOpen} onClose={() => setPersonCreateOpen(false)} onCreate={createPerson} onCreated={showMessage} onError={showError} />
      <PersonCaseCreateDialog open={caseDialogOpen} personLabel={personCaseDialogLabel(selected)} onClose={() => setCaseDialogOpen(false)} onSubmit={createCaseFromPerson} onError={showError} />
      <PersonImportWizard open={importOpen} onClose={() => setImportOpen(false)} onSelectImportFile={onSelectImportFile} onPreviewImport={onPreviewImport} onExecuteImport={onExecuteImport} onImported={showMessage} onError={showError} />
      <PersonPrivacyActionDialog open={personPrivacyAction !== null} mode={personPrivacyAction ?? 'anonymize'} person={selected} affectedCaseCount={selected ? cases.filter((item) => item.protectedPersonId === selected.id).length : 0} onClose={() => setPersonPrivacyAction(null)} onSubmit={submitPersonPrivacyAction} onError={showError} />
    </ModuleFrame>
  );
}
