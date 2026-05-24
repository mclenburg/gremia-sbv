import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DangerButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import {
  EmptyState,
  IndustrialPanel,
  IndustrialRecordCard,
  RecordList,
  SearchToolbar,
  WorkbenchGrid,
  WorkbenchPage
} from '../../shared/components/WorkbenchLayout';
import {
  FormActions,
  FormSection,
  SelectInput,
  TextInput
} from '../../shared/components/IndustrialForm';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { ContactCategory, ContactRecord, CreateContactInput, DeleteContactResult } from '../../core/models/contact.model';
import { filterContactsForQuery, formatContactReference } from './contactDisplay';

const contactCategoryOptions: Array<{ value: ContactCategory; label: string }> = [
  { value: 'arbeitgeber', label: 'Arbeitgeber' },
  { value: 'inklusionsamt', label: 'Inklusionsamt' },
  { value: 'agentur_fuer_arbeit', label: 'Agentur für Arbeit' },
  { value: 'betriebsarzt', label: 'Betriebsarzt' },
  { value: 'reha', label: 'Reha' },
  { value: 'anwalt', label: 'Anwalt' },
  { value: 'betriebsrat', label: 'Betriebsrat' },
  { value: 'beratung', label: 'Beratung' },
  { value: 'intern', label: 'intern' },
  { value: 'sonstiges', label: 'sonstiges' }
];

export function ContactsView({
  contacts,
  onCreateContact,
  onDeleteContact
}: {
  contacts: ContactRecord[];
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onDeleteContact: (contact: ContactRecord) => Promise<DeleteContactResult>;
}) {
  const [query, setQuery] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<ContactCategory>('sonstiges');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  const filteredContacts = useMemo(() => filterContactsForQuery(contacts, query), [contacts, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await onCreateContact({
        firstName,
        lastName,
        organization: organization || undefined,
        role: role || undefined,
        category,
        email: email || undefined,
        phone: phone || undefined
      });
      setFirstName('');
      setLastName('');
      setOrganization('');
      setRole('');
      setCategory('sonstiges');
      setEmail('');
      setPhone('');
      setMessage(`Kontakt angelegt: ${formatContactReference(created)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kontakt konnte nicht angelegt werden.');
    }
  }

  async function deleteContact(contact: ContactRecord) {
    setError('');
    setMessage('');
    const ok = await confirmDialog({
      variant: 'danger',
      title: 'Kontakt löschen?',
      message: `Der Kontakt wird gelöscht. Bekannte Textstellen werden anonymisiert.\n\n${formatContactReference(contact)}`,
      confirmLabel: 'Kontakt löschen',
      cancelLabel: 'Abbrechen'
    });
    if (!ok) return;
    try {
      const result = await onDeleteContact(contact);
      const successMessage = result.anonymizedReferences
        ? `Kontakt gelöscht. ${result.anonymizedReferences} Textbezug/Textbezüge in ${result.touchedNotes} Protokoll(en) wurden anonymisiert.`
        : 'Kontakt gelöscht. Es wurden keine gespeicherten Textbezüge gefunden.';
      setMessage(successMessage);
      announce(successMessage, 'polite');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kontakt konnte nicht gelöscht werden.';
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    }
  }

  return (
    <WorkbenchPage title="Kontakte" kicker="Netzwerk" description="Ansprechpersonen, Stellen und interne Kontakte. In Protokollen mit @@ einfügen.">
      <ModuleFeedback items={[message ? { id: 'contacts-message', tone: 'success', message } : null, error ? { id: 'contacts-error', tone: 'warning', message: error } : null]} />
      <WorkbenchGrid>
        <IndustrialPanel kicker="Register" title="Kontaktliste">
          <SearchToolbar
            searchValue={query}
            onSearchChange={setQuery}
            searchLabel="Kontakt suchen"
            searchPlaceholder="Kontakt suchen …"
            resultCount={filteredContacts.length}
          />
          <RecordList
            items={filteredContacts}
            getKey={(contact) => contact.id}
            ariaLabel="Kontaktliste"
            empty={<EmptyState title="Keine Treffer" text="Noch keine passenden Kontakte vorhanden." />}
            renderItem={(contact) => (
              <IndustrialRecordCard ariaLabel={formatContactReference(contact)}>
                <div className="industrial-record-card-header">
                  <div>
                    <strong>{formatContactReference(contact)}</strong>
                    <span>{[contact.role, contact.email, contact.phone].filter(Boolean).join(' · ') || contact.category}</span>
                  </div>
                  <DangerButton
                    compact
                    onClick={() => void deleteContact(contact)}
                    title="Kontakt löschen und Textbezüge anonymisieren"
                    aria-label={`${formatContactReference(contact)} löschen`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </DangerButton>
                </div>
              </IndustrialRecordCard>
            )}
          />
        </IndustrialPanel>

        <IndustrialPanel kicker="Erfassen" title="Kontakt anlegen">
          <form onSubmit={submit} className="industrial-form">
            <FormSection>
              <div className="industrial-form-grid">
                <TextInput label="Vorname" value={firstName} onValueChange={setFirstName} />
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
            <FormActions>
              <IndustrialButton type="submit">
                <Save className="h-4 w-4" />Kontakt speichern
              </IndustrialButton>
            </FormActions>
          </form>
        </IndustrialPanel>
      </WorkbenchGrid>
    </WorkbenchPage>
  );
}
