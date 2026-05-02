import { describe, expect, it } from 'vitest';
import { contactDisplayName, contactMatchVariants, findContactMatches } from '../services/contactPrivacyService';

const kontakt = { id: 'k1', first_name: 'Max', last_name: 'Mustermann', organization: 'Personalabteilung' };

describe('contact recognition privacy rules', () => {
  it('formats contact references as Nachname, Vorname (Firma)', () => {
    expect(contactDisplayName(kontakt)).toBe('Mustermann, Max (Personalabteilung)');
  });

  it('recognizes full names, reverse names and organization variants', () => {
    const text = 'Teilnehmer: Max Mustermann, später Mustermann, Max (Personalabteilung).';
    const matches = findContactMatches(text, kontakt);
    expect(matches).toContain('Max Mustermann');
    expect(matches).toContain('Mustermann, Max (Personalabteilung)');
  });

  it('recognizes initial and salutation variants only when explicitly allowed', () => {
    const text = 'M. Mustermann sagte, Frau Mustermann meldet sich.';
    expect(findContactMatches(text, kontakt)).toEqual([]);
    expect(findContactMatches(text, kontakt, { allowInitialLastName: true, allowSalutationLastName: true })).toEqual(['M. Mustermann', 'Frau Mustermann']);
  });

  it('does not match names inside longer words', () => {
    expect(findContactMatches('Der Mustermannfall ist kein Kontaktverweis.', kontakt, { allowSalutationLastName: true })).toEqual([]);
  });

  it('offers all variants needed for later anonymization', () => {
    const variants = contactMatchVariants(kontakt, { allowInitialLastName: true, allowSalutationLastName: true });
    expect(variants).toEqual(expect.arrayContaining(['Mustermann, Max', 'Max Mustermann', 'M. Mustermann', 'Herr Mustermann', 'Frau Mustermann']));
  });
});
