import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Save, Search, Trash2 } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { useConfirmDialog } from '../../shared/dialogs/ConfirmDialogProvider';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';
import type { ContactCategory, ContactRecord, CreateContactInput, DeleteContactResult } from '../../core/models/contact.model';
import { filterContactsForQuery, formatContactReference } from './contactDisplay';

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

  return (
    <ModuleFrame title="Kontakte" kicker="Netzwerk" description="Ansprechpersonen, Stellen und interne Kontakte. In Protokollen mit @@ einfügen.">
      <ModuleFeedback items={[message ? { id: 'contacts-message', tone: 'success', message } : null, error ? { id: 'contacts-error', tone: 'warning', message: error } : null]} />
      <section className="industrial-grid-two">
        <section className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Register</p><h2>Kontaktliste</h2></div></div>
          <label className="industrial-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kontakt suchen …" /></label>
          <div className="contact-register-list">
            {filteredContacts.map((contact) => (
              <article key={contact.id} className="contact-register-card">
                <div>
                  <strong>{formatContactReference(contact)}</strong>
                  <span>{[contact.role, contact.email, contact.phone].filter(Boolean).join(' · ') || contact.category}</span>
                </div>
                <button
                  type="button"
                  className="industrial-danger-button compact"
                  onClick={async () => {
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
                  }}
                  title="Kontakt löschen und Textbezüge anonymisieren"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </article>
            ))}
            {!filteredContacts.length && <div className="industrial-empty">Noch keine passenden Kontakte vorhanden.</div>}
          </div>
        </section>

        <section className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Erfassen</p><h2>Kontakt anlegen</h2></div></div>
          <form onSubmit={submit} className="industrial-form">
            <label><span>Vorname</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
            <label><span>Nachname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label><span>Firma / Stelle</span><input value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
            <label><span>Rolle</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="z. B. Personalleiter" /></label>
            <label><span>Kategorie</span><select value={category} onChange={(event) => setCategory(event.target.value as ContactCategory)}><option value="arbeitgeber">Arbeitgeber</option><option value="inklusionsamt">Inklusionsamt</option><option value="agentur_fuer_arbeit">Agentur für Arbeit</option><option value="betriebsarzt">Betriebsarzt</option><option value="reha">Reha</option><option value="anwalt">Anwalt</option><option value="betriebsrat">Betriebsrat</option><option value="beratung">Beratung</option><option value="intern">intern</option><option value="sonstiges">sonstiges</option></select></label>
            <label><span>E-Mail</span><input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label><span>Telefon</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <button type="submit" className="industrial-button"><Save className="h-4 w-4" />Kontakt speichern</button>
          </form>
        </section>
      </section>
    </ModuleFrame>
  );
}
