import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { assertVacationV5CaseGraph } from '../../../../services/vacationV5CaseGraph';

const person = { type: 'protected_person', schemaVersion: 1, count: 1, items: [
  { ref: 'person_1', links: {}, data: { first_name: 'Alex', last_name: 'Beispiel', protection_status: 'unclear' } },
] };
const firstCase = { type: 'case', schemaVersion: 1, count: 2, items: [
  { ref: 'case_1', links: { protectedPersonRef: 'person_1' }, data: {
    case_number: 'SBV-1', display_name: 'Anfrage', category: 'sonstiges', status: 'offen', opened_at: '2026-11-11',
  } },
  { ref: 'case_2', links: {}, data: {
    case_number: 'SBV-2', display_name: 'Anfrage 2', category: 'sonstiges', status: 'offen', opened_at: '2026-11-11',
  } },
] };
const measure = { type: 'case_measure', schemaVersion: 1, count: 1, items: [
  { ref: 'measure_1', links: { caseRef: 'case_1' }, data: { type: 'bem', title: 'Maßnahme', status: 'open', opened_at: '2026-11-11' } },
] };
const note = { type: 'case_measure_note', schemaVersion: 1, count: 1, items: [
  { ref: 'measure_note_1', links: { caseRef: 'case_1', measureRef: 'measure_1' }, data: {
    measure_type: 'bem', title: 'Notiz', note_at: '2026-11-11', content: 'Nächster Schritt',
  } },
] };

describe('Format-5-Fallreferenzgraph', () => {
  it('bindet ausgewählte Dokumentbytes kanonisch an Hash, Größe und Fallreferenz', () => {
    const bytes = Buffer.from('Vertraulicher Inhalt', 'utf8');
    const document = { type: 'case_document', schemaVersion: 1, count: 1, items: [{
      ref: 'document_1', links: { caseRef: 'case_1' },
      data: { filename: 'Attest.pdf', sha256: createHash('sha256').update(bytes).digest('hex'), size_bytes: bytes.length },
      contentBase64: bytes.toString('base64'),
    }] };
    expect(assertVacationV5CaseGraph([firstCase, person, document]).find((section) => section.type === 'case_document')?.count).toBe(1);
    expect(() => assertVacationV5CaseGraph([firstCase, person, { ...document, items: [
      { ...document.items[0], contentBase64: 'QQ==' },
    ] }])).toThrow(/Dokument/);
    expect(() => assertVacationV5CaseGraph([firstCase, person, { ...document, items: [
      { ...document.items[0], contentBase64: 'Q===' },
    ] }])).toThrow(/Dokument/);
    expect(() => assertVacationV5CaseGraph([firstCase, person, { ...document, items: [
      { ref: 'document_1', links: { caseRef: 'case_1' }, data: document.items[0].data },
    ] }])).toThrow(/Dokument/);
  });

  it('löst Beziehungen innerhalb ausgewählter Fallakten auf', () => {
    expect(assertVacationV5CaseGraph([person, firstCase, measure, note]).map((section) => section.type))
      .toEqual(['protected_person', 'case', 'case_measure', 'case_measure_note']);
  });

  it('blockiert fremde, fehlende und fallübergreifende Referenzen', () => {
    expect(() => assertVacationV5CaseGraph([firstCase, measure])).toThrow(/ungelöste Beziehung/);
    expect(() => assertVacationV5CaseGraph([person, firstCase, measure, { ...note, items: [
      { ...note.items[0], links: { caseRef: 'case_2', measureRef: 'measure_1' } },
    ] }])).toThrow(/anderen Fallakte/);
    expect(() => assertVacationV5CaseGraph([person, firstCase, measure, { ...note, items: [
      { ...note.items[0], links: { caseRef: 'case_1', measureRef: 'missing_1' } },
    ] }])).toThrow(/ungelöste Beziehung/);
    expect(() => assertVacationV5CaseGraph([person, { ...firstCase, items: [
      { ...firstCase.items[0], data: { ...firstCase.items[0].data, protected_person_id: 'local-person' } },
      firstCase.items[1],
    ] }, measure])).toThrow(/Unerwartete Felder/);
  });
});
