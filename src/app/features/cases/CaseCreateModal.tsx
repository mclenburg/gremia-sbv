import type { FormEvent } from 'react';
import { FolderKanban, UserRoundSearch } from 'lucide-react';
import type { CaseCategory } from '../../../domain/models/case.model';
import type { ProtectedPersonRecord } from '../../../domain/models/protected-person.model';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { FormActions, SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { IndustrialButton } from '../../shared/components/IndustrialButton';

export function CaseCreateModal({
  open,
  caseNumber,
  displayName,
  category,
  summary,
  selectedProtectedPersonId,
  protectedPersons,
  error,
  onCaseNumberChange,
  onDisplayNameChange,
  onCategoryChange,
  onSummaryChange,
  onProtectedPersonChange,
  onCancel,
  onSubmit,
  onAnonymousSubmit
}: {
  open: boolean;
  caseNumber: string;
  displayName: string;
  category: CaseCategory;
  summary: string;
  selectedProtectedPersonId: string;
  protectedPersons: ProtectedPersonRecord[];
  error?: string;
  onCaseNumberChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onCategoryChange: (value: CaseCategory) => void;
  onSummaryChange: (value: string) => void;
  onProtectedPersonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAnonymousSubmit: () => void | Promise<void>;
}) {
  if (!open) return null;

  const description = 'Neue reguläre Fallakten benötigen eine Person aus dem Personenverzeichnis. Für anonyme Beratungsgespräche ohne Namensnennung: Fallakte ohne Personenbezug anlegen.';
  const personOptions = [{ value: '', label: 'Person auswählen …' }, ...protectedPersons.map((person) => ({ value: person.id, label: person.pseudonymLabel || `${person.lastName}, ${person.firstName}` }))];
  const categoryOptions: { value: CaseCategory; label: string }[] = [
    { value: 'bem', label: 'BEM' },
    { value: 'praevention', label: 'Prävention' },
    { value: 'kuendigung', label: 'Kündigung' },
    { value: 'gleichstellung', label: 'Gleichstellung' },
    { value: 'gdb', label: 'GdB' },
    { value: 'nachteilsausgleich', label: 'Nachteilsausgleich' },
    { value: 'arbeitsplatzgestaltung', label: 'Arbeitsplatzgestaltung' },
    { value: 'diskriminierung', label: 'Diskriminierung' },
    { value: 'anregung_beschwerde', label: 'Anregung / Beschwerde' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  return (
    <IndustrialModal
      title="Neue Fallakte anlegen"
      kicker="Fallakte"
      description={description}
      icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
      className="case-create-modal-responsive"
      onClose={onCancel}
    >
        <form onSubmit={(event) => void onSubmit(event)} className="industrial-form case-create-form">
          <TextInput label="Aktenzeichen" value={caseNumber} onValueChange={onCaseNumberChange} placeholder="z. B. BEM-2026-004" error={error} />
          <SelectInput label="Person aus Verzeichnis wählen" value={selectedProtectedPersonId} onValueChange={onProtectedPersonChange} options={personOptions} />
          <TextInput label="Anzeigename / Pseudonym" value={displayName} onValueChange={onDisplayNameChange} placeholder="leer lassen für Personenname oder anonymes Gespräch" />
          <SelectInput label="Kategorie" value={category} onValueChange={(value) => onCategoryChange(value as CaseCategory)} options={categoryOptions} />
          <TextInput label="Kurzbeschreibung" value={summary} onValueChange={onSummaryChange} placeholder="knappe Sachebene" wide />
          <div className="case-create-path-actions industrial-modal-wide" aria-label="Anlegewege">
            <IndustrialButton type="submit"><UserRoundSearch className="h-4 w-4" aria-hidden="true" />Person auswählen →</IndustrialButton>
            <IndustrialButton type="button" variant="secondary" onClick={() => void onAnonymousSubmit()} data-e2e="anonymous-request-path">Ohne Personenbezug dokumentieren →</IndustrialButton>
          </div>
          <FormActions className="industrial-modal-wide">
            <IndustrialButton type="button" variant="secondary" onClick={onCancel}>Abbrechen</IndustrialButton>
          </FormActions>
        </form>
    </IndustrialModal>
  );
}
