import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertVacationV5OfficeDocumentGraph } from '../../../../services/vacationV5OfficeDocumentGraph';

const contentBase64 = Buffer.from('Sitzungsprotokoll äöü').toString('base64');
const sha256 = createHash('sha256').update(Buffer.from(contentBase64, 'base64')).digest('hex');
const document = { type: 'generated_document', schemaVersion: 1, count: 1, items: [{
  ref: 'generated_document_1', contentBase64,
  data: { title: 'Protokoll', filename: 'Protokoll.pdf', mime_type: 'application/pdf',
    document_kind: 'generic', sha256, size_bytes: Buffer.from(contentBase64, 'base64').length },
}] };
const link = { type: 'workflow_document_link', schemaVersion: 1, count: 1, items: [{
  ref: 'workflow_document_link_1', documentRef: 'generated_document_1', ownerRef: 'meeting_1',
  data: { purpose: 'Protokoll', document_class: 'generated_document' },
}] };

describe('Format-5-Amtsdokumentgraph', () => {
  it('akzeptiert nur ein ausgewähltes Dokument mit erreichbarer Eigentümerbeziehung', () => {
    expect(assertVacationV5OfficeDocumentGraph([document, link], [{ ref: 'meeting_1', type: 'meeting' }])).toHaveLength(2);
  });

  it('verwirft fehlende Elternobjekte, beschädigte Bytes und lokale Speicherpfade', () => {
    expect(() => assertVacationV5OfficeDocumentGraph([document, link], [])).toThrow();
    expect(() => assertVacationV5OfficeDocumentGraph([{ ...document, items: [{ ...document.items[0], contentBase64: 'YWJj' }] }, link],
      [{ ref: 'meeting_1', type: 'meeting' }])).toThrow();
    expect(() => assertVacationV5OfficeDocumentGraph([{ ...document, items: [{ ...document.items[0],
      data: { ...document.items[0].data, storage_path: '/private/doc.pdf' } }] }, link],
    [{ ref: 'meeting_1', type: 'meeting' }])).toThrow();
    expect(() => assertVacationV5OfficeDocumentGraph([document, { ...link, count: 2, items: [
      link.items[0], { ...link.items[0], ref: 'workflow_document_link_2' },
    ] }], [{ ref: 'meeting_1', type: 'meeting' }])).toThrow();
  });

  it('bindet Verstoßdokumente nur an Verstöße und verlangt eine gültige Dokumentverknüpfung', () => {
    const violationLink = { type: 'violation_document_link', schemaVersion: 1, count: 1, items: [{
      ref: 'violation_document_link_1', documentRef: 'generated_document_1', ownerRef: 'violation_1',
      data: { stage: 'request', template_key: 'request', template_version: '1', immutable_snapshot: 1 },
    }] };
    const violationDocument = { ...document, items: [{ ...document.items[0],
      data: { ...document.items[0].data, document_kind: 'sbv_participation_violation' } }] };
    expect(assertVacationV5OfficeDocumentGraph([violationDocument, violationLink], [{ ref: 'violation_1', type: 'violation' }]))
      .toHaveLength(2);
    expect(() => assertVacationV5OfficeDocumentGraph([violationDocument, violationLink], [{ ref: 'meeting_1', type: 'meeting' }]))
      .toThrow();
  });
});
