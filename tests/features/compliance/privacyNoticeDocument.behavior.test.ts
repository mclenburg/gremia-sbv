import { describe, expect, it } from 'vitest';
import { ReportService } from '../../../services/reportService';
import { createPdfDocument } from '../../../services/documents/pdfDocumentRenderer';
import { inspectPdf } from '../../helpers/pdf';
import { dataProtectionNoticeDefaults, renderDataProtectionNotice, validateDataProtectionNotice } from '../../../src/domain/compliance/dataProtectionNotice';
import type { DataProtectionNoticeInput } from '../../../src/domain/models/compliance.model';
import { EMPTY_TEMPLATE_DEFAULT_VALUES } from '../../../src/domain/models/template-default.model';
import { DEFAULT_RETENTION_SETTINGS } from '../../../services/retentionSettings';

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
    expect(body).toContain('Personenstamm und Schutzstatus');
    expect(body).toContain('Wahlunterlagen mit Personenbezug');
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
      'datenschutz.aufsichtsbehoerde': 'Landesdatenschutzbehörde Musterland',
      'datenschutz.drittlandangabe': 'Keine Übermittlung durch die verantwortliche Stelle vorgesehen.',
    };
    expect(dataProtectionNoticeDefaults(defaults, '2026-11-05', DEFAULT_RETENTION_SETTINGS)).toMatchObject({
      responsibleEntity: 'Muster GmbH',
      responsibleContact: 'datenschutz@muster.de',
      sbvContact: 'SBV Muster · sbv@muster.de',
      privacyOfficerContact: 'DSB Muster · dsb@muster.de',
      supervisoryAuthority: 'Landesdatenschutzbehörde Musterland',
      thirdCountryTransfers: 'Keine Übermittlung durch die verantwortliche Stelle vorgesehen.',
    });
  });

  it('befüllt bekannte SBV-Verarbeitung automatisch und übernimmt die eingestellte Löschprüfung', () => {
    const settings = { ...DEFAULT_RETENTION_SETTINGS, moduleRules: {
      ...DEFAULT_RETENTION_SETTINGS.moduleRules,
      case_file: { kind: 'months_after_completion' as const, months: 24 },
    } };
    const suggested = dataProtectionNoticeDefaults(EMPTY_TEMPLATE_DEFAULT_VALUES, '2026-11-05', settings);
    expect(suggested.legalBasis).toContain('§ 178 SGB IX');
    expect(suggested.dataSources).toContain('Arbeitgeber');
    expect(suggested.recipients).toContain('Stellvertretungen');
    expect(suggested.thirdCountryTransfers).toBe('Eine Übermittlung personenbezogener Daten an Empfänger in Drittländern oder internationale Organisationen findet nicht statt.');
    expect(suggested.retention).toContain('24 Monate nach Abschluss');
    expect(suggested.retention).toContain('keine automatische Löschung');
    expect(suggested.supervisoryAuthority).toBe('');
    expect(validateDataProtectionNotice({ ...suggested, responsibleEntity: 'Muster GmbH', responsibleContact: 'kontakt@muster.de', sbvContact: 'sbv@muster.de', supervisoryAuthority: 'Behörde' })).toEqual([]);
  });

  it('nennt ohne geladene Prüffristen nur sichere Aufbewahrungskriterien', () => {
    const suggested = dataProtectionNoticeDefaults(EMPTY_TEMPLATE_DEFAULT_VALUES, '2026-11-05');
    expect(suggested.retention).toContain('Zweck');
    expect(suggested.retention).not.toContain('36 Monaten');
  });

  it('rendert ein externes, druckbares PDF ohne interne Prüfhinweise', async () => {
    const reports = new ReportService(() => { throw new Error('Kein Datenbankzugriff nötig'); }, () => '/not-used');
    const built = reports.build({ type: 'compliance_document', complianceDocumentType: 'data_protection_notice', complianceNoticeInput: input });
    expect(built.title).toBe('Datenschutzinformation');
    const inspected = await inspectPdf(await createPdfDocument(built.document));
    expect(inspected.pageCount).toBeLessThanOrEqual(2);
    const text = inspected.textByPage.join(' ');
    expect(text).toContain('Muster GmbH');
    expect(text).toContain('dsb@muster.de');
    expect(text).toContain('Beschwerde');
    expect(text).not.toMatch(/Intern \/ Compliance|fachlich prüfen|Klartextkopie|Vorlage|Arbeitsentwurf/);
    expect(inspected.language).toBe('de-DE');
  });

  it('hält die vollständig vorbelegte Datenschutzinformation ohne verwaiste Schlussseite lesbar', async () => {
    const reports = new ReportService(() => { throw new Error('Kein Datenbankzugriff nötig'); }, () => '/not-used');
    const prefilled = dataProtectionNoticeDefaults({ ...EMPTY_TEMPLATE_DEFAULT_VALUES,
      'arbeitgeber.name': 'Beispielbetrieb',
      'datenschutz.kontakt.email': 'datenschutz@beispiel.invalid',
      'sbv.email': 'sbv@beispiel.invalid',
      'datenschutz.aufsichtsbehoerde': 'Beispielhafte Aufsichtsbehörde',
    }, '2026-11-05');
    const built = reports.build({ type: 'compliance_document', complianceDocumentType: 'data_protection_notice', complianceNoticeInput: prefilled });
    const pdf = await inspectPdf(await createPdfDocument(built.document));
    expect(pdf.pageCount).toBeLessThanOrEqual(2);
    expect(pdf.textByPage.join(' ')).toContain('automatisierte Entscheidungen');
    expect(pdf.textByPage.join(' ')).not.toContain('Die Beispielbetrieb');
    const auditListPage = pdf.textByPage.find((page) => page.includes('Datensparsame Lifecycle- und Audit-Ereignisse'));
    expect(auditListPage).toContain('Manipulationsnachweis und Nachvollziehbarkeit');
  });
});
