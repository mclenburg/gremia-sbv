import { useState, type FormEvent } from 'react';
import { Save, UserRoundPlus } from 'lucide-react';
import type { ContactCategory, ContactRecord, CreateContactInput } from '../../core/models/contact.model';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { GhostButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import { FormActions, FormSection, SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { formatContactReference } from './contactDisplay';

export const contactCategoryOptions: Array<{ value: ContactCategory; label: string }> = [
  { value: 'arbeitgeber', label: 'Arbeitgeber' },
  { value: 'inklusionsamt', label: 'Inklusionsamt' },
  { value: 'agentur_fuer_arbeit', label: 'Agentur für Arbeit' },
  { value: 'betriebsarzt', label: 'Betriebsarzt' },
  { value: 'reha', label: 'Reha' },
  { value: 'anwalt', label: 'Anwalt' },
  { value: 'betriebsrat', label: 'Betriebsrat' },
  { value: 'beratung', label: 'Beratung' },
  { value: 'intern', label: 'intern' },
  { value: 'sonstiges', label: 'sonstiges' },
];

export function ContactCreateModal({
  onCreateContact,
  onCreated,
  onClose,
}: {
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCreated: (message: string) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<ContactCategory>('sonstiges');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const created = await onCreateContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organization: organization.trim() || undefined,
        role: role.trim() || undefined,
        category,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onCreated(`Kontakt angelegt: ${formatContactReference(created)}`);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kontakt konnte nicht angelegt werden.');
    }
  }

  return (
    <IndustrialModal
      title="Kontakt anlegen"
      kicker="Netzwerk"
      description="Kontaktstammdaten werden zentral erfasst und können in Protokollen mit @@ referenziert werden."
      icon={<UserRoundPlus className="h-5 w-5" />}
      onClose={onClose}
      dataE2e="contact-create-modal"
    >
      <form onSubmit={submit} className="industrial-settings-form mt-5" noValidate>
        <FormSection title="Kontaktdaten" description="Mindestens Name, Organisation oder Kategorie sollte fachlich eindeutig sein.">
          <div className="industrial-form-grid">
            <TextInput label="Vorname" value={firstName} onValueChange={setFirstName} autoFocus />
            <TextInput label="Nachname" value={lastName} onValueChange={setLastName} />
            <TextInput label="Firma / Stelle" value={organization} onValueChange={setOrganization} />
            <TextInput label="Rolle" value={role} onValueChange={setRole} placeholder="z. B. Personalleiter" />
            <SelectInput
              label="Kategorie"
              value={category}
              options={contactCategoryOptions}
              onValueChange={(value) => setCategory(value as ContactCategory)}
            />
            <TextInput label="E-Mail" value={email} onValueChange={setEmail} type="email" />
            <TextInput label="Telefon" value={phone} onValueChange={setPhone} />
          </div>
        </FormSection>
        {error ? <ModuleFeedback items={[{ id: 'contact-create-error', tone: 'warning', message: error }]} /> : null}
        <FormActions>
          <GhostButton onClick={onClose}>Abbrechen</GhostButton>
          <IndustrialButton type="submit"><Save className="h-4 w-4" />Kontakt speichern</IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
