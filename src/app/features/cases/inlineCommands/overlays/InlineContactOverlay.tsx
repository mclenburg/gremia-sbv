import { Users } from "lucide-react";
import type { ContactCategory } from "../../../../../domain/models/contact.model";
import { filterContactsForQuery, formatContactReference } from "../../../contacts/contactDisplay";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import { IndustrialModalSurface } from "../../../../shared/dialogs/IndustrialDialogs";

type ContactOverlayProps = Pick<InlineCommandOverlaysProps,
  "inlineContactDraft" | "setInlineContactDraft" | "contacts" | "insertExistingContactFromProtocol" |
  "createAndInsertContactFromProtocol" | "cancelInlineContactDraft">;

function ContactSearch({ props }: { props: ContactOverlayProps }) {
  const { inlineContactDraft: draft, setInlineContactDraft, contacts, insertExistingContactFromProtocol } = props;
  if (!draft) return null;
  const matches = filterContactsForQuery(contacts, draft.query);
  return <>
    <div className="industrial-modal-grid"><label className="industrial-modal-wide"><span>Bestehenden Kontakt suchen</span><input value={draft.query} onChange={(event) => setInlineContactDraft((current) => current ? { ...current, query: event.target.value } : current)} placeholder="Name, Organisation, Rolle, E-Mail …" /></label></div>
    <div className="inline-contact-results">
      {matches.map((contact) => <button key={contact.id} type="button" className="inline-contact-result" onClick={() => void insertExistingContactFromProtocol(contact)}><strong>{formatContactReference(contact)}</strong><span>{[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") || "Kontakt"}</span></button>)}
      {!matches.length && <div className="industrial-empty compact">Kein bestehender Kontakt gefunden. Unten neu erfassen.</div>}
    </div>
  </>;
}

function ContactCreateFields({ props }: { props: ContactOverlayProps }) {
  const { inlineContactDraft: draft, setInlineContactDraft } = props;
  if (!draft) return null;
  const update = (patch: Partial<typeof draft>) => setInlineContactDraft((current) => current ? { ...current, ...patch } : current);
  return <>
    <div className="industrial-modal-grid">
      <label><span>Vorname</span><input value={draft.firstName} onChange={(event) => update({ firstName: event.target.value })} /></label>
      <label><span>Nachname</span><input value={draft.lastName} onChange={(event) => update({ lastName: event.target.value })} /></label>
      <label><span>Firma / Stelle</span><input value={draft.organization} onChange={(event) => update({ organization: event.target.value })} /></label>
      <label><span>Rolle</span><input value={draft.role} onChange={(event) => update({ role: event.target.value })} placeholder="z. B. Personalleiter" /></label>
      <label><span>Kategorie</span><select className="industrial-select" value={draft.category} onChange={(event) => update({ category: event.target.value as ContactCategory })}>
        <option value="arbeitgeber">Arbeitgeber</option><option value="inklusionsamt">Inklusionsamt</option><option value="agentur_fuer_arbeit">Agentur für Arbeit</option><option value="betriebsarzt">Betriebsarzt</option><option value="betriebsrat">Betriebsrat</option><option value="beratung">Beratung</option><option value="intern">intern</option><option value="sonstiges">sonstiges</option>
      </select></label>
      <label><span>E-Mail</span><input value={draft.email} onChange={(event) => update({ email: event.target.value })} /></label>
      <label><span>Telefon</span><input value={draft.phone} onChange={(event) => update({ phone: event.target.value })} /></label>
    </div>
    {(draft.firstName || draft.lastName) && <div className="industrial-modal-preview">Wird im Protokoll eingefügt: <strong>{formatContactReference({ firstName: draft.firstName, lastName: draft.lastName, organization: draft.organization })}</strong></div>}
  </>;
}

export function InlineContactOverlay({ props }: { props: InlineCommandOverlaysProps }) {
  if (!props.inlineContactDraft) return null;
  const contactProps: ContactOverlayProps = props;
  return <IndustrialModalSurface labelledById="inline-contact-title" onClose={props.cancelInlineContactDraft}>
    <div className="industrial-modal-header"><div className="industrial-modal-icon"><Users className="h-5 w-5" /></div><div><p className="industrial-kicker">Inline-Kontakt</p><h2 id="inline-contact-title">Kontakt im Protokoll einfügen</h2><p>Nach dem Einfügen steht im Text: Name, Vorname (Firma).</p></div></div>
    <ContactSearch props={contactProps} />
    <ContactCreateFields props={contactProps} />
    <div className="industrial-modal-actions"><button type="button" className="industrial-secondary-button" onClick={props.cancelInlineContactDraft}>Abbrechen</button><button type="button" className="industrial-button" onClick={() => void props.createAndInsertContactFromProtocol()}><Users className="h-4 w-4" />Kontakt vormerken und einfügen</button></div>
  </IndustrialModalSurface>;
}
