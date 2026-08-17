import { describe, expect, it } from 'vitest';
import {
  createPdfDocument,
  metricCards,
  paragraph,
  reportDocument,
  section,
  table,
} from '../../../services/documents/pdfDocumentRenderer';
import { ReportService } from '../../../services/reportService';
import { inspectPdf } from '../../helpers/pdf';

describe('PDFKit report rendering', () => {
  it('renders report semantics as accessible PDF content without an HTML print runtime', async () => {
    const definition = reportDocument(
      'Tätigkeitsbericht der SBV',
      'Zeitraum: 1. Januar 2026 bis 31. Dezember 2026',
      'Anonymisiert',
      [
        metricCards({ 'Neue Fälle': 4, 'Abgeschlossene Fälle': 3 }),
        section('Fallstatus', [
          table(['Status', 'Anzahl'], [['Offen', 1], ['Abgeschlossen', 3]]),
          paragraph('Die Werte enthalten keine Namen oder Diagnosen.'),
        ]),
      ],
      [],
    );

    const inspected = await inspectPdf(await createPdfDocument(definition));
    const text = inspected.textByPage.join(' ');

    expect(text).toContain('Tätigkeitsbericht der SBV');
    expect(text).toContain('Neue Fälle 4');
    expect(text).toContain('Fallstatus');
    expect(text).toContain('Offen 1');
    expect(text).toContain('Keine Auffälligkeiten in dieser Prüfung.');
    expect(inspected.title).toBe('Tätigkeitsbericht der SBV');
    expect(inspected.language).toBe('de-DE');
    expect(inspected.hasStructureTree).toBe(true);
    expect(inspected.structureRoles).toEqual(expect.arrayContaining(['H1', 'H2', 'Table', 'TR', 'TH', 'TD']));
  });

  it('renders the productive compliance-report seam with headings, lists and tables', async () => {
    const reports = new ReportService(
      () => { throw new Error('Compliance-Dokument darf keine Datenbankabfrage benötigen.'); },
      () => '/not-used',
    );
    const built = reports.build({
      type: 'compliance_document',
      complianceTitle: 'Datenschutz-Freigabe',
      complianceBody: [
        '# Prüfergebnis',
        'Die Verarbeitung bleibt lokal.',
        '',
        '- Keine Cloud-Übertragung',
        '- Verschlüsselter Export',
        '',
        '| Prüfung | Ergebnis |',
        '| --- | --- |',
        '| Datenminimierung | erfüllt |',
      ].join('\n'),
    });

    const inspected = await inspectPdf(await createPdfDocument(built.document));
    const text = inspected.textByPage.join(' ');
    expect(text).toContain('Datenschutz-Freigabe');
    expect(text).toContain('Prüfergebnis');
    expect(text).toContain('Keine Cloud-Übertragung');
    expect(text).toContain('Datenminimierung erfüllt');
    expect(text).toContain('Compliance-Dokumente vor Weitergabe fachlich prüfen.');
  });
});
