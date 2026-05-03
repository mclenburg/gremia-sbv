import type { ContactRecord } from '../../core/models/contact.model';

export function formatContactReference(contact: ContactRecord | Pick<ContactRecord, 'firstName' | 'lastName' | 'organization'>): string {
  const name = [contact.lastName, contact.firstName].filter(Boolean).join(', ');
  return contact.organization ? `${name || 'Kontakt'} (${contact.organization})` : name || 'Kontakt';
}

export function filterContactsForQuery(contacts: ContactRecord[], query: string): ContactRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return contacts;
  return contacts.filter((contact) => [contact.firstName, contact.lastName, contact.organization, contact.role, contact.email, contact.phone]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized)));
}
