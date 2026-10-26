import type { CreateProtectedPersonInput } from '../src/domain/models/protected-person.model.js';

/** A roster must not silently let a later row override an earlier identity. */
export function duplicatePersonImportRows(inputs: readonly CreateProtectedPersonInput[]): Set<number> {
  const rowsByIdentity = new Map<string, number[]>();
  inputs.forEach((input, index) => {
    const keys = [
      input.personnelNumber?.trim() && `personnel:${input.personnelNumber.trim().toLocaleLowerCase('de-DE')}`,
      input.workEmail?.trim() && `email:${input.workEmail.trim().toLocaleLowerCase('de-DE')}`,
    ].filter((key): key is string => Boolean(key));
    if (!keys.length && input.firstName.trim() && input.lastName.trim()) {
      keys.push(`name:${input.lastName.trim().toLocaleLowerCase('de-DE')}|${input.firstName.trim().toLocaleLowerCase('de-DE')}|${input.organizationalUnit?.trim().toLocaleLowerCase('de-DE') ?? ''}`);
    }
    for (const key of keys) {
      const rows = rowsByIdentity.get(key) ?? [];
      rows.push(index);
      rowsByIdentity.set(key, rows);
    }
  });
  return new Set([...rowsByIdentity.values()].filter((rows) => rows.length > 1).flat());
}

export const DUPLICATE_PERSON_IMPORT_MESSAGE = 'Mehrfach vorkommende Personalnummer, dienstliche E-Mail oder derselbe Name in derselben Organisationseinheit. Bitte die Datei bereinigen und erneut prüfen.';
