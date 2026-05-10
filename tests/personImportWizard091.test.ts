import { describe, expect, it } from 'vitest';
import { buildDefaultMapping, updateColumnMapping } from '../src/app/features/persons/personImportUi';

describe('0.9.1 Import-Assistent Personenverzeichnis', () => {
  it('erkennt echte Dateispalten und setzt Personalnummer nur optional', () => {
    const mapping = buildDefaultMapping(['Name', 'Status', 'Gültig bis', 'Bereich']);

    expect(mapping.fullName).toBe('Name');
    expect(mapping.firstName).toBe('');
    expect(mapping.lastName).toBe('');
    expect(mapping.protectionStatus).toBe('Status');
    expect(mapping.statusValidUntil).toBe('Gültig bis');
    expect(mapping.organizationalUnit).toBe('Bereich');
    expect(mapping.personnelNumber).toBe('');
  });

  it('schaltet zwischen Vollnamen-Spalte und getrennten Namensspalten ohne Doppelmapping um', () => {
    const fullNameMapping = updateColumnMapping(buildDefaultMapping(), 'fullName', 'Name');
    expect(fullNameMapping.fullName).toBe('Name');
    expect(fullNameMapping.firstName).toBe('');
    expect(fullNameMapping.lastName).toBe('');

    const firstNameMapping = updateColumnMapping(fullNameMapping, 'firstName', 'Vorname');
    expect(firstNameMapping.fullName).toBe('');
    expect(firstNameMapping.firstName).toBe('Vorname');
  });
});
