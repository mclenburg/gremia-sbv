import { useMemo, useState, type FormEvent } from 'react';
import type { CreateEqualizationIntakeInput, EqualizationIntakeResult } from '../../../domain/models/equalization.model';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { FormErrorSummary, SelectInput, TextareaInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

type PersonMode = CreateEqualizationIntakeInput['person']['mode'];
type EqualizationIntakeDialogProps = {
  persons: ProtectedPersonRecord[];
  onClose: () => void;
  onCreate: (input: CreateEqualizationIntakeInput) => Promise<EqualizationIntakeResult>;
};

function personLabel(person: ProtectedPersonRecord): string {
  return person.recordKind === 'pseudonymous_request'
    ? person.pseudonymLabel || 'Pseudonyme Anfrage'
    : `${person.lastName}, ${person.firstName}`;
}

function IntakeEffectNotice({ existingPerson }: { existingPerson: boolean }) {
  const effectText = existingPerson
    ? 'Die ausgewählte Person wird verknüpft. Neu entstehen eine Fallakte und ein Gleichstellungs-/GdB-Verfahren.'
    : 'Neu entstehen gemeinsam ein Personeneintrag, eine damit verknüpfte Fallakte und ein Gleichstellungs-/GdB-Verfahren.';
  return <div className="industrial-message" role="status" aria-live="polite">
    <strong>Auswirkung des Speicherns</strong>
    <p>{effectText}</p>
    <p>Aufbewahrung und Löschprüfung folgen dem Verfahren und der verknüpften Fallakte. Die Löschung bleibt manuell.</p>
  </div>;
}

export function EqualizationIntakeDialog({ persons, onClose, onCreate }: EqualizationIntakeDialogProps) {
  const [personMode, setPersonMode] = useState<PersonMode>('new_identified');
  const [protectedPersonId, setProtectedPersonId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pseudonymLabel, setPseudonymLabel] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [category, setCategory] = useState<'gleichstellung' | 'gdb'>('gleichstellung');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const personOptions = useMemo(() => [
    { value: '', label: 'Person auswählen …' },
    ...persons.map((person) => ({ value: person.id, label: personLabel(person) })),
  ], [persons]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const person = personMode === 'existing'
      ? { mode: personMode, protectedPersonId } as const
      : personMode === 'new_pseudonymous'
        ? { mode: personMode, pseudonymLabel } as const
        : { mode: personMode, firstName, lastName } as const;
    setSaving(true);
    try {
      await onCreate({ person, caseNumber, category, summary: summary.trim() || undefined });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Person, Fallakte und Verfahren konnten nicht gemeinsam angelegt werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <IndustrialModal
      title="Gleichstellungs-/GdB-Vorgang anlegen"
      kicker="Geführte Erstanlage"
      description="Die Erstanlage wird als zusammengehöriger Vorgang gespeichert. Unvollständige Teildatensätze bleiben nicht zurück."
      onClose={saving ? undefined : onClose}
      closeOnEscape={!saving}
      wide
      dataE2e="equalization-intake-dialog"
      actions={<>
        <ToolbarButton onClick={onClose} disabled={saving}>Abbrechen</ToolbarButton>
        <IndustrialButton type="submit" form="equalization-intake-form" loading={saving}>
          {personMode === 'existing' ? 'Fall und Verfahren anlegen' : 'Person, Fall und Verfahren anlegen'}
        </IndustrialButton>
      </>}
    >
      <form id="equalization-intake-form" className="industrial-form" onSubmit={(event) => void submit(event)}>
        <IntakeEffectNotice existingPerson={personMode === 'existing'} />
        <FormErrorSummary errors={[error]} />
        <div className="industrial-form-grid industrial-form-grid-2">
          <SelectInput
            label="Personenbezug"
            value={personMode}
            onValueChange={(value) => setPersonMode(value as PersonMode)}
            options={[
              { value: 'new_identified', label: 'Neue Person mit Namen anlegen' },
              { value: 'existing', label: 'Vorhandene Person verknüpfen' },
              { value: 'new_pseudonymous', label: 'Pseudonyme Anfrage anlegen' },
            ]}
            required
          />
          <SelectInput
            label="Vorgangsart"
            value={category}
            onValueChange={(value) => setCategory(value as 'gleichstellung' | 'gdb')}
            options={[
              { value: 'gleichstellung', label: 'Gleichstellung' },
              { value: 'gdb', label: 'GdB-Antrag / Feststellung' },
            ]}
            required
          />
          {personMode === 'existing' ? (
            <SelectInput
              label="Person"
              value={protectedPersonId}
              onValueChange={setProtectedPersonId}
              options={personOptions}
              required
              wide
            />
          ) : null}
          {personMode === 'new_identified' ? <>
            <TextInput label="Vorname" value={firstName} onValueChange={setFirstName} required autoFocus />
            <TextInput label="Nachname" value={lastName} onValueChange={setLastName} required />
          </> : null}
          {personMode === 'new_pseudonymous' ? (
            <TextInput
              label="Bezeichnung der pseudonymen Anfrage"
              value={pseudonymLabel}
              onValueChange={setPseudonymLabel}
              helpText="Keine Namen, Personalnummern oder Kontaktdaten erfassen."
              required
              wide
            />
          ) : null}
          <TextInput label="Aktenzeichen" value={caseNumber} onValueChange={setCaseNumber} required />
          <TextareaInput
            label="Kurzbeschreibung / Anliegen"
            value={summary}
            onValueChange={setSummary}
            helpText="Nur die für die Bearbeitung erforderlichen Angaben erfassen."
            wide
          />
        </div>
      </form>
    </IndustrialModal>
  );
}
