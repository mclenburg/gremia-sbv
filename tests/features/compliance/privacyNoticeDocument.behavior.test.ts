import { describe, expect, it } from 'vitest';
import { ReportService } from '../../../services/reportService';
import { createPdfDocument } from '../../../services/documents/pdfDocumentRenderer';
import { inspectPdf } from '../../helpers/pdf';
import { dataProtectionNoticeDefaults, renderDataProtectionNotice, validateDataProtectionNotice } from '../../../src/domain/compliance/dataProtectionNotice';
import type { DataProtectionNoticeInput } from '../../../src/domain/models/compliance.model';
import { EMPTY_TEMPLATE_DEFAULT_VALUES } from '../../../src/domain/models/template-default.model';

const input: DataProtectionNoticeInput = {
  responsibleEntity: 'Muster GmbH',
  responsibleContact: 'Musterstraße 4, 12345 Musterstadt · datenschutz@muster.de',
  sbvContact: 'Schwerbehindertenvertretung · sbv@muster.de',
  privacyOfficerContact: 'Datenschutzbeauftragte · dsb@muster.de',
  legalBasis: 'Art. 6 Abs. 1 lit. c, Art. 9 Abs. 2 lit. b DSGVO; § 26 Abs. 1 und 3 BDSG; § 178 SGB IX',
  dataSources: 'Angaben der betroffenen Person und erforderliche Mitteilungen des Arbeitgebers.',
  recipients: 'Schwerbehindertenvertretung und zulässig einbezogene Stellvertretungen; weitere Stellen nur bei rechtlicher Erforderlichkeit.',
  retention: 'Bis zum Abschluss des jeweiligen Vorgangs; danach Prüfung nach dem betrieblichen Löschkonzept.',
  thirdCountryTransfers: 'Keine Übermittlung in Drittländer vorgesehen.',
  supervisoryAuthority: 'Landesbeauftragte für Datenschutz des Landes Musterland',
  issueDate: '2026-11-05',
};

describe('versandfähige Datenschutzinformation', () => {
  it('verlangt lokale Pflichtangaben und erzeugt keine Vorlage mit Platzhaltern', () => {
    expect(validateDataProtectionNotice({ ...input, responsibleEntity: '' })).toContain('Verantwortliche Stelle');
    expect(() => renderDataProtectionNotice({ ...input, responsibleEntity: '' })).toThrow('Verantwortliche Stelle');
    expect(validateDataProtectionNotice({ ...input, responsibleContact: '[Kontakt eintragen]' })).toContain('Kontakt der verantwortlichen Stelle ohne Platzhalter');
    expect(validateDataProtectionNotice({ ...input, privacyOfficerContact: '[DSB eintragen]' })).toContain('Datenschutzkontakt ohne Platzhalter');
    expect(validateDataProtectionNotice({ ...input, issueDate: '2026-02-30' })).toContain('Gültiges Datum');
    const body = renderDataProtectionNotice(input);
    expect(body).toContain('Muster GmbH');
    expect(body).toContain('dsb@muster.de');
    expect(body).toContain('Angaben der betroffenen Person');
    expect(body).toContain('Art. 13 und 14 DSGVO');
    expect(body).not.toMatch(/\[[^\]]+\]|Vorlage|Arbeitsentwurf|vor Verwendung|Gremia\.SBV versendet/);
  });

  it('übernimmt vorhandene Stammdaten aus den Einstellungen', () => {
    const defaults = { ...EMPTY_TEMPLATE_DEFAULT_VALUES,
      'arbeitgeber.name': 'Muster GmbH',
      'datenschutz.kontakt.email': 'datenschutz@muster.de',
      'datenschutz.dsb.name': 'DSB Muster',
      'datenschutz.dsb.email': 'dsb@muster.de',
      'sbv.name': 'SBV Muster',
      'sbv.email': 'sbv@muster.de',
    };
    expect(dataProtectionNoticeDefaults(defaults, '2026-11-05')).toMatchObject({
      responsibleEntity: 'Muster GmbH',
      responsibleContact: 'datenschutz@muster.de',
      sbvContact: 'SBV Muster · sbv@muster.de',
      privacyOfficerContact: 'DSB Muster · dsb@muster.de',
    });
  });

  it('rendert ein externes, druckbares PDF ohne interne Prüfhinweise', async () => {
    const reports = new ReportService(() => { throw new Error('Kein Datenbankzugriff nötig'); }, () => '/not-used');
    const built = reports.build({ type: 'compliance_document', complianceDocumentType: 'data_protection_notice', complianceNoticeInput: input });
    const inspected = await inspectPdf(await createPdfDocument(built.document));
    const text = inspected.textByPage.join(' ');
    expect(text).toContain('Muster GmbH');
    expect(text).toContain('dsb@muster.de');
    expect(text).toContain('Beschwerde');
    expect(text).not.toMatch(/Intern \/ Compliance|fachlich prüfen|Klartextkopie|Vorlage|Arbeitsentwurf/);
    expect(inspected.language).toBe('de-DE');
  });
});
