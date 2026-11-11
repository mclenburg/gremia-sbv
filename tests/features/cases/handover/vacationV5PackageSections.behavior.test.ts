import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
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

  it('weist doppelte Referenzen und Dokumente ohne verifizierbare Bytes zurück', () => {
    const duplicate = { ...meeting, items: [{ ...meeting.items[0], ref: 'case_1' }] };
    expect(() => createVacationV5PackageManifest([person, selectedCase, duplicate])).toThrow(/Referenz/);
    const bytes = Buffer.from('Attestinhalt', 'utf8');
    const document = { type: 'case_document', schemaVersion: 1, count: 1, items: [
      { ref: 'document_1', links: { caseRef: 'case_1' }, data: { filename: 'Attest.pdf',
        sha256: createHash('sha256').update(bytes).digest('hex'), size_bytes: bytes.length }, contentBase64: bytes.toString('base64') },
    ] };
    expect(createVacationV5PackageManifest([person, selectedCase, document]).sections.map((entry) => entry.type))
      .toEqual(['protected_person', 'case', 'case_document']);
    expect(() => createVacationV5PackageManifest([person, selectedCase, { ...document, items: [
      { ...document.items[0], contentBase64: 'QQ==' },
    ] }])).toThrow(/Dokument/);
  });

  it('bindet ausgewählte Amtsdokumente und Eigentümerverweise an dasselbe Manifest', () => {
    const bytes = Buffer.from('Protokoll', 'utf8');
    const document = { type: 'generated_document', schemaVersion: 1, count: 1, items: [{
      ref: 'generated_document_1', data: { title: 'Protokoll', filename: 'protokoll.pdf',
        mime_type: 'application/pdf', document_kind: 'generic', size_bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex') }, contentBase64: bytes.toString('base64'),
    }] };
    const link = { type: 'workflow_document_link', schemaVersion: 1, count: 1, items: [{
      ref: 'workflow_document_link_1', documentRef: 'generated_document_1', ownerRef: 'meeting_1',
      data: { purpose: 'Protokoll', document_class: 'generated_document' },
    }] };
    const sections = [meeting, document, link];
    const manifest = createVacationV5PackageManifest(sections);
    expect(assertVacationV5PackageSections(sections, manifest)).toEqual(sections);
    expect(() => createVacationV5PackageManifest([document, link])).toThrow();
  });
});
