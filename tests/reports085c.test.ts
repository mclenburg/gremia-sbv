import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportModel = fs.readFileSync(path.join(root, 'src/app/core/models/report.model.ts'), 'utf8');
const reportService = fs.readFileSync(path.join(root, 'services/reportService.ts'), 'utf8');
const reportsView = fs.readFileSync(path.join(root, 'src/app/features/reports/ReportsView.tsx'), 'utf8');
const reportCss = fs.readFileSync(path.join(root, 'src/app/reportsWorkbench.css'), 'utf8');

describe('0.8.5-c Berichtskatalog und Systemberichte', () => {
  it('registriert die wiederhergestellten Fach-, Datenschutz- und Systemberichte zentral', () => {
    for (const type of [
      'activity',
      'case_deadline_controlling',
      'bem_prevention',
      'sbv_participation',
      'termination_hearings',
      'equalization_gdb',
      'privacy_audit',
      'retention_cleanup',
      'audit_log',
      'system_integrity',
      'compliance_document',
    ]) {
      expect(reportModel).toContain(`'${type}'`);
      expect(reportService).toContain(`type: "${type}"`);
    }
  });

  it('nutzt für Kündigungsberichte die aktuelle Schema-0019-Spaltenstruktur', () => {
    expect(reportService).toContain('periodWhere("received_at", input)');
    expect(reportService).toContain('protection_status');
    expect(reportService).toContain('sbv_statement_due_at');
    expect(reportService).not.toContain('hearing_received_at');
    expect(reportService).not.toContain('statement_status');
    expect(reportService).not.toContain('integration_office_approval_status');
  });

  it('ersetzt die alte reine Tätigkeitsbericht-Ansicht durch einen Berichtskatalog', () => {
    expect(reportsView).toContain('Berichtskatalog');
    expect(reportsView).toContain('SBV-Fachberichte');
    expect(reportsView).toContain('Datenschutz & Compliance');
    expect(reportsView).toContain('Systemberichte');
    expect(reportsView).toContain('bridge.reports.generate');
    expect(reportsView).toContain('bridge.reports.openExportFolder');
  });

  it('liefert ein responsives Berichtslayout für Katalog, Detail und Historie', () => {
    expect(reportCss).toContain('.reports-layout-grid');
    expect(reportCss).toContain('.reports-card-list');
    expect(reportCss).toContain('.reports-detail-panel');
    expect(reportCss).toContain('.reports-history-item');
    expect(reportCss).toContain('@media (max-width: 78rem)');
  });
});
