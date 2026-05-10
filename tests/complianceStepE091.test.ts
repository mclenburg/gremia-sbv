import { describe, expect, it } from 'vitest';
import { buildComplianceReportInput, renderComplianceDocument } from '../services/complianceCenterService';
import { auditHashChainDecisionSection, informationAndAccessRightsSection, personDirectoryProcessingActivitySection, sqlCipherDecisionSection, stepELegalBasesSection } from '../services/complianceStepEContent';

function bodies() {
  return {
    dsfa: renderComplianceDocument('dsfa').body,
    toms: renderComplianceDocument('toms').body,
    vvt: renderComplianceDocument('vvt').body,
    matrix: renderComplianceDocument('dsgvo_bdsg_matrix').body,
    rights: renderComplianceDocument('data_subject_rights').body
  };
}

describe('0.9.1 Step E Compliance Center', () => {
  it('generiert DSFA, TOMs und VVT mit Personenverzeichnis und Rechtsgrundlagen', () => {
    const rendered = bodies();
    for (const body of [rendered.dsfa, rendered.vvt]) {
      expect(body).toContain('Personenverzeichnis schwerbehinderter und gleichgestellter Beschäftigter');
      expect(body).toContain('Art. 6 Abs. 1 lit. c DSGVO');
      expect(body).toContain('Art. 9 Abs. 2 lit. b DSGVO');
      expect(body).toContain('§ 26 Abs. 3 BDSG');
      expect(body).toContain('§ 163 SGB IX');
      expect(body).toContain('§ 164 Abs. 4 SGB IX');
      expect(body).toContain('§ 178 Abs. 1 SGB IX');
      expect(body).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
    }
    expect(rendered.toms).toContain('Audit-Hash-Kette ohne Direktidentifikatoren');
    expect(rendered.toms).toContain('SQLCipher-Entscheidung und Feldverschlüsselung');
  });

  it('dokumentiert Art. 13/14, Art. 15, Audit-Hash-Kette und SQLCipher-Entscheidung', () => {
    const rendered = bodies();
    for (const body of [rendered.dsfa, rendered.vvt, rendered.matrix, rendered.rights]) {
      expect(body).toContain('Art. 13/14 DSGVO');
      expect(body).toContain('Art. 15 DSGVO');
    }
    expect(rendered.matrix).toContain('Audit ohne Direktidentifikatoren');
    expect(rendered.matrix).toContain('keine zusätzliche Namens-Feldverschlüsselung');
    expect(rendered.vvt).toContain('Gremia.SBV versendet keine eigenständigen Art. 13/14-DSGVO-Benachrichtigungen');
  });



  it('führt Step-E-Inhalte auch durch den Compliance-Exportpfad', () => {
    const document = renderComplianceDocument('dsfa');
    const report = buildComplianceReportInput(document);
    expect(report.complianceTitle).toContain('DSFA');
    expect(report.complianceBody).toContain('Personenverzeichnis schwerbehinderter und gleichgestellter Beschäftigter');
    expect(report.complianceBody).toContain('§ 164 Abs. 4 SGB IX');
    expect(report.complianceBody).toContain('Audit-Hash-Kette ohne Direktidentifikatoren');
  });

  it('hält Compliance-Bausteine als Generatorinhalt statt statischer Markdown-Pflege vor', () => {
    expect(personDirectoryProcessingActivitySection()).toContain('Fallaktenbindung');
    expect(stepELegalBasesSection()).toContain('§ 164 Abs. 4 SGB IX');
    expect(informationAndAccessRightsSection()).toContain('strukturierte Auskunftsfähigkeit');
    expect(auditHashChainDecisionSection()).toContain('keine Namen');
    expect(sqlCipherDecisionSection()).toContain('SQLCipher');
  });
});
