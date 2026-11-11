import { describe, expect, it } from 'vitest';
import { createVacationV5PackageManifest, assertVacationV5PackageSections } from '../../../../services/vacationV5PackageSections';

const person = { type: 'protected_person', schemaVersion: 1, count: 1, items: [
  { ref: 'person_1', links: {}, data: { first_name: 'Alex', last_name: 'Beispiel', protection_status: 'unclear' } },
] };
const selectedCase = { type: 'case', schemaVersion: 1, count: 1, items: [
  { ref: 'case_1', links: { protectedPersonRef: 'person_1' }, data: {
    case_number: 'SBV-1', display_name: 'Anfrage', category: 'sonstiges', status: 'offen', opened_at: '2026-11-11',
  } },
] };
const meeting = { type: 'meeting', schemaVersion: 1, count: 1, items: [
  { ref: 'meeting_1', data: { meeting_type: 'other', title: 'Sitzung', starts_at: '2099-11-20', status: 'draft' } },
] };

describe('Format-5-Paketabschnitte', () => {
  it('bindet Fall- und fallfreie Abschnitte gemeinsam an ein Manifest', () => {
    const sections = [person, selectedCase, meeting];
    const manifest = createVacationV5PackageManifest(sections);
    expect(manifest.sections.map((entry) => entry.type)).toEqual(['protected_person', 'case', 'meeting']);
    expect(assertVacationV5PackageSections(sections, manifest)).toEqual(sections);
    expect(() => assertVacationV5PackageSections(sections, { sections: manifest.sections.map((entry, index) =>
      index === 1 ? { ...entry, sha256: 'a'.repeat(64) } : entry) })).toThrow(/Manifest/);
  });

  it('weist doppelte Referenzen und noch nicht transportfähige Dokumentabschnitte zurück', () => {
    const duplicate = { ...meeting, items: [{ ...meeting.items[0], ref: 'case_1' }] };
    expect(() => createVacationV5PackageManifest([person, selectedCase, duplicate])).toThrow(/Referenz/);
    const document = { type: 'case_document', schemaVersion: 1, count: 1, items: [
      { ref: 'document_1', links: { caseRef: 'case_1' }, data: { filename: 'Attest.pdf', sha256: 'a'.repeat(64) } },
    ] };
    expect(() => createVacationV5PackageManifest([selectedCase, document])).toThrow(/Dokument/);
  });
});
