import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link2 } from 'lucide-react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { FormActions, TextInput, TextareaInput } from '../../shared/components/IndustrialForm';
import { IndustrialButton } from '../../shared/components/IndustrialButton';

function personLabel(person: ProtectedPersonRecord): string {
  return person.pseudonymLabel || [person.lastName, person.firstName].filter(Boolean).join(', ') || person.id;
}

export function LegacyCaseBindingDialog({ open, legacyCase, persons, error, onClose, onAssign }: {
  open: boolean;
  legacyCase?: CaseRecord;
  persons: ProtectedPersonRecord[];
  error?: string;
  onClose: () => void;
  onAssign: (personId: string, reason: string) => Promise<void>;
}) {
  const [personId, setPersonId] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [reason, setReason] = useState('');
  const personSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPersonId('');
    setPersonFilter('');
    setReason('');
  }, [open, legacyCase?.id]);

  if (!open || !legacyCase) return null;
  const description = `${legacyCase.caseNumber} ist ein Altfall ohne sicheren führenden Personenbezug. Wählen Sie bewusst eine Person und dokumentieren Sie den Prüfgrund.`;
  const normalizedFilter = personFilter.trim().toLocaleLowerCase('de-DE');
  const filteredPersons = normalizedFilter
    ? persons.filter((person) => personLabel(person).toLocaleLowerCase('de-DE').includes(normalizedFilter))
    : persons;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAssign(personId, reason);
  }

  return (
    <IndustrialModal
      title="Altfall einer Person zuordnen"
      kicker="Legacy-Zuordnung"
      description={description}
      icon={<Link2 className="h-5 w-5" aria-hidden="true" />}
      className="case-create-modal-responsive"
      initialFocusRef={personSelectRef}
      onClose={onClose}
      dataE2e="legacy-case-binding-dialog"
    >
      <form onSubmit={(event) => void submit(event)} className="industrial-form case-create-form">
        <TextInput
          label="Liste filtern"
          value={personFilter}
          onValueChange={setPersonFilter}
          type="search"
          placeholder="Name oder Pseudonym eingeben …"
          wide
        />
        <label className="industrial-modal-wide">
          <span>Person</span>
          <select ref={personSelectRef} className="industrial-select" value={personId} onChange={(event) => setPersonId(event.target.value)} required>
            <option value="">Person auswählen …</option>
            {filteredPersons.map((person) => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}
          </select>
        </label>
        <TextareaInput
          label="Prüfgrund"
          value={reason}
          onValueChange={setReason}
          placeholder="z. B. Zuordnung nach Aktenprüfung / Gespräch / vorhandener aktiver Altverknüpfung"
          required
          wide
        />
        {error ? <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert">{error}</div> : null}
        <FormActions className="industrial-modal-wide">
          <IndustrialButton type="button" variant="secondary" onClick={onClose}>Abbrechen</IndustrialButton>
          <IndustrialButton type="submit">Zuordnung speichern</IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
