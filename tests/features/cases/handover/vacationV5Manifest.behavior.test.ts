import { describe, expect, it } from 'vitest';
import { createVacationV5Manifest, assertVacationV5Sections } from '../../../../services/vacationV5SectionManifest';

const meeting = { type: 'meeting', schemaVersion: 1, count: 1, items: [{ ref: 'meeting_1', data: { meeting_type: 'other', title: 'Sitzung', starts_at: '2026-11-20T10:00:00.000Z', status: 'draft' } }] };
const agenda = { type: 'meeting_agenda', schemaVersion: 1, count: 1, items: [{ ref: 'agenda_1', parentRef: 'meeting_1', data: { position: 1, title: 'TOP', status: 'open' } }] };

describe('Format-5-Abschnittsmanifest', () => {
  it('bindet Abschnittstyp, Anzahl, Daten und Elternreferenzen an eindeutige Hashes', () => {
    const sections = [meeting, agenda];
    const manifest = createVacationV5Manifest(sections);
    expect(manifest.sections).toHaveLength(2);
    expect(assertVacationV5Sections(sections, manifest)).toEqual(sections);
    expect(() => assertVacationV5Sections([{ ...meeting, items: [{ ...meeting.items[0], data: { ...meeting.items[0].data, title: 'Manipuliert' } }] }, agenda], manifest)).toThrow(/manifest/);
  });

  it('sperrt unbekannte Abschnitte, zusätzliche Felder, Dubletten und verwaiste Kinder', () => {
    expect(() => createVacationV5Manifest([{ ...meeting, type: 'unknown' }])).toThrow(/Abschnitt/);
    expect(() => createVacationV5Manifest([{ ...meeting, extra: 'payload' }])).toThrow(/unerwartete/);
    expect(() => createVacationV5Manifest([meeting, meeting])).toThrow(/doppelte/);
    expect(() => createVacationV5Manifest([meeting, { ...agenda, items: [{ ...agenda.items[0], parentRef: 'missing' }] }])).toThrow(/Elternreferenz/);
  });
});
