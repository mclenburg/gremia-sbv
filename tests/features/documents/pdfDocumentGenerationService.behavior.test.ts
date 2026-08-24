import { describe, expect, it } from 'vitest';
import { PdfDocumentGenerationService } from '../../../services/documents/pdfDocumentGenerationService';
import {
  externalLetterDocument,
  paragraph,
  reportDocument,
  section,
} from '../../../services/documents/pdfDocumentDefinition';
import { inspectPdf } from '../../helpers/pdf';

describe('zentrale PDF-Dokumenterzeugung', () => {
  it('bewahrt rechtlich relevante Unicode-Zeichen und das einheitliche Gremia-Layout', async () => {
    const service = new PdfDocumentGenerationService();
    const pdf = await service.generate({
      source: 'measure',
      definition: reportDocument('Anhörung', 'Maßnahme', 'Vertraulich', [
        section('Inhalt', [paragraph('Wählerliste, Kündigung, Größe, Maßnahme – unverändert.\nZweite rechtlich relevante Zeile.')]),
      ], []),
    });
    const inspected = await inspectPdf(pdf);
    expect(inspected.textByPage.join(' ')).toContain('Wählerliste, Kündigung, Größe, Maßnahme – unverändert.');
    expect(inspected.textByPage.join(' ')).toContain('Zweite rechtlich relevante Zeile.');
    expect(inspected.hasStructureTree).toBe(true);
  });

  it('verhindert den Export mit nicht aufgelösten Pflichtplatzhaltern', async () => {
    const service = new PdfDocumentGenerationService();
    await expect(service.generate({
      source: 'template',
      definition: reportDocument('Anschreiben', '', 'Vertraulich', [paragraph('Sehr geehrte {{empfaenger.name}}')], []),
    })).rejects.toThrow('Pflichtplatzhalter');
  });

  it('blockiert direkte Identifikatoren in als anonymisiert deklarierten Dokumenten', async () => {
    const service = new PdfDocumentGenerationService();
    await expect(service.generate({
      source: 'report',
      privacyProfile: 'anonymized',
      definition: reportDocument('Tätigkeitsbericht', '', 'Anonymisiert', [paragraph('Kontakt: person@example.org')], []),
    })).rejects.toThrow('Identifikatoren');
  });

  it('rendert externe Schreiben ohne interne Prüf- und Systemhinweise', async () => {
    const service = new PdfDocumentGenerationService();
    const pdf = await service.generate({
      source: 'assembly',
      privacyProfile: 'lawful_personal_data',
      definition: externalLetterDocument({
        title: 'Einladung zur Schwerbehindertenversammlung',
        sender: ['Schwerbehindertenvertretung', 'Musterbetrieb'],
        recipient: ['An die schwerbehinderten und gleichgestellten Beschäftigten'],
        date: '24.08.2026',
        subject: 'Schwerbehindertenversammlung 2026',
        blocks: [paragraph('Sehr geehrte Kolleginnen und Kollegen,')],
      }),
    });

    const text = (await inspectPdf(pdf)).textByPage.join(' ');
    expect(text).toContain('An die schwerbehinderten und gleichgestellten Beschäftigten');
    expect(text).toContain('Sehr geehrte Kolleginnen und Kollegen,');
    expect(text).not.toContain('Prüfstatus');
    expect(text).not.toContain('Keine Auffälligkeiten');
    expect(text).not.toContain('interne Prüfberichte');
  });
});
