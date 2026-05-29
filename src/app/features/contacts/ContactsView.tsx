import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { DangerButton, IndustrialButton } from '../../shared/components/IndustrialButton';
import {
  EmptyState,
  IndustrialPanel,
  IndustrialRecordCard,
  RecordList,
  SearchToolbar,
  WorkbenchPage
} from '../../shared/components/WorkbenchLayout';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { ContactRecord, CreateContactInput, DeleteContactResult } from '../../core/models/contact.model';
import { filterContactsForQuery, formatContactReference } from './contactDisplay';
import { ContactCreateModal } from './ContactCreateModal';

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const confirmDialog = useConfirmDialog();
  const announce = useAnnouncer();

  const filteredContacts = useMemo(() => filterContactsForQuery(contacts, query), [contacts, query]);

  function handleCreated(nextMessage: string) {
    setError('');
    setMessage(nextMessage);
    announce(nextMessage, 'polite');
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
    <WorkbenchPage
      title="Kontakte"
      kicker="Netzwerk"
      description="Ansprechpersonen, Stellen und interne Kontakte. In Protokollen mit @@ einfügen."
      actions={
        <IndustrialButton onClick={() => setCreateModalOpen(true)} data-e2e="open-contact-create">
          <Plus className="h-4 w-4" />Kontakt anlegen
        </IndustrialButton>
      }
    >
      <ModuleFeedback items={[message ? { id: 'contacts-message', tone: 'success', message } : null, error ? { id: 'contacts-error', tone: 'warning', message: error } : null]} />
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

      {createModalOpen ? (
        <ContactCreateModal
          onCreateContact={onCreateContact}
          onCreated={handleCreated}
          onClose={() => setCreateModalOpen(false)}
        />
      ) : null}
    </WorkbenchPage>
  );
}
