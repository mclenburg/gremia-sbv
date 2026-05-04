import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../package.json';
import { APP_VERSION as RENDERER_APP_VERSION } from '../src/app/generated/appVersion';
import { APP_VERSION as SERVICE_APP_VERSION } from '../services/generated/appMetadata';
import { buildComplianceReportInput, listComplianceDocuments, renderComplianceDocument } from '../services/complianceCenterService';

describe('0.8.4-c Compliance-PDFs und Report-Erzeugung', () => {
  const complianceView = readFileSync(join(process.cwd(), 'src/app/features/compliance/ComplianceView.tsx'), 'utf8');
  const reportService = readFileSync(join(process.cwd(), 'services/reportService.ts'), 'utf8');
  const complianceService = readFileSync(join(process.cwd(), 'services/complianceCenterService.ts'), 'utf8');
  const reportIpc = readFileSync(join(process.cwd(), 'electron/ipc/reportIpc.ts'), 'utf8');

  it('führt die Patch-Version zentral in Renderer und Services', () => {
    expect(packageJson.version).toBe('0.8.4-c');
    expect(RENDERER_APP_VERSION).toBe(packageJson.version);
    expect(SERVICE_APP_VERSION).toBe(packageJson.version);
  });

  it('stellt alle wesentlichen Compliance-Dokumente als abrufbare Dokumenttypen bereit', () => {
    const types = listComplianceDocuments().map((item) => item.type);

    expect(types).toContain('toms');
    expect(types).toContain('vvt');
    expect(types).toContain('dsfa');
    expect(types).toContain('dsgvo_bdsg_matrix');
    expect(types).toContain('retention_schedule');
    expect(types).toContain('data_subject_rights');
    expect(types).toContain('export_policy');
    expect(types).toContain('dsb_it_security_approval');
    expect(types).toContain('dsar_response');
  });

  it('zentralisiert den Compliance-PDF-Input statt ihn in der View zusammenzubauen', () => {
    const vvt = renderComplianceDocument('vvt');
    const input = buildComplianceReportInput(vvt);

    expect(input.type).toBe('compliance_document');
    expect(input.complianceDocumentType).toBe('vvt');
    expect(input.complianceTitle).toContain('VVT');
    expect(input.complianceClassification).toBe('Intern / Compliance');
    expect(complianceView).toContain('buildComplianceReportInput(document)');
    expect(complianceView).not.toContain("complianceClassification: document.type === 'toms'");
  });

  it('nutzt den bestehenden Report-Service auch für Compliance-PDFs', () => {
    expect(reportService).toContain("case 'compliance_document': return this.buildComplianceDocumentReport(input);");
    expect(reportService).toContain('complianceDocumentType');
    expect(reportService).toContain('verschlüsselter PDF-Report');
    expect(reportIpc).toContain('encryptReportPdf');
    expect(reportIpc).toContain('.gsbvpdf');
  });

  it('kann Compliance-Dokumente als verschlüsselten PDF-Report erzeugen und als PDF abrufen', () => {
    expect(complianceView).toContain('PDF erzeugen');
    expect(complianceView).toContain('PDF abrufen');
    expect(complianceView).toContain('bridge.reports.generate(buildComplianceReportInput(document))');
    expect(complianceView).toContain('bridge.reports.openExportFolder(result.filePath)');
    expect(complianceService).toContain('Beim Abruf als PDF wird eine temporäre Klartextkopie');
  });
});
