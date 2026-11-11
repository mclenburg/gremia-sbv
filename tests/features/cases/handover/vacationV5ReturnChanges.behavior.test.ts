import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertVacationV5ReturnChanges } from '../../../../services/vacationV5ReturnChanges';

const hash = (digit: string) => digit.repeat(64);
const meeting = { ref: 'meeting_1', kind: 'meeting', operation: 'upsert', deputyBaselineSha256: hash('a'),
  deputyCurrentSha256: hash('b'), data: { meeting_type: 'other', title: 'Geändert', starts_at: '2099-11-20', status: 'draft' } };

describe('Format-5-Rückgabeänderungen', () => {
  it('prüft geänderte Zeilen, Dokumentbytes und Stornowünsche ohne lokale Referenzen', () => {
    const plain = Buffer.from('Anlage', 'utf8');
    const document = { ref: 'generated_document_1', kind: 'generated_document', operation: 'upsert',
      deputyBaselineSha256: hash('c'), deputyCurrentSha256: hash('d'),
      data: { title: 'Anlage', filename: 'anlage.pdf', mime_type: 'application/pdf', document_kind: 'generic',
        sha256: createHash('sha256').update(plain).digest('hex'), size_bytes: plain.length },
      contentBase64: plain.toString('base64') };
    const cancelled = { ref: 'meeting_2', kind: 'meeting', operation: 'cancel_request',
      deputyBaselineSha256: hash('e'), deputyCurrentSha256: null, reason: 'Termin entfällt' };
    expect(assertVacationV5ReturnChanges([meeting, document, cancelled])).toHaveLength(3);
    expect(() => assertVacationV5ReturnChanges([{ ...document, contentBase64: 'YWJj' }])).toThrow();
    expect(() => assertVacationV5ReturnChanges([{ ...meeting, data: { ...meeting.data, id: 'local-id' } }])).toThrow();
    expect(() => assertVacationV5ReturnChanges([{ ...cancelled, reason: '' }])).toThrow();
    expect(() => assertVacationV5ReturnChanges([meeting, meeting])).toThrow();
  });

  it('verlangt für Unterdatensätze gültige Paketbeziehungen', () => {
    const agenda = { ref: 'agenda_1', kind: 'meeting_agenda', operation: 'upsert',
      deputyBaselineSha256: hash('a'), deputyCurrentSha256: hash('b'),
      data: { position: 1, title: 'TOP', status: 'open' }, links: { meetingRef: 'meeting_1' } };
    expect(assertVacationV5ReturnChanges([agenda])).toHaveLength(1);
    expect(() => assertVacationV5ReturnChanges([{ ...agenda, links: {} }])).toThrow();
    expect(() => assertVacationV5ReturnChanges([{ ...agenda, links: { meetingRef: '../local' } }])).toThrow();
    const deadline = { ref: 'deadline_1', kind: 'deadline', operation: 'upsert',
      deputyBaselineSha256: hash('a'), deputyCurrentSha256: hash('b'),
      data: { process_type: 'custom', deadline_type: 'custom', title: 'Frist', due_at: '2099-11-20', status: 'open' } };
    expect(assertVacationV5ReturnChanges([deadline])).toHaveLength(1);
    const addition = { ...agenda, ref: 'return_meeting_agenda_1', deputyBaselineSha256: null };
    expect(assertVacationV5ReturnChanges([addition])).toHaveLength(1);
    expect(() => assertVacationV5ReturnChanges([{ ...addition, ref: 'agenda_2' }])).toThrow();
  });
});
