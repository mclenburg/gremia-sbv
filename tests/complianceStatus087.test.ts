import { describe, expect, it } from 'vitest';
import { listComplianceDocuments, renderComplianceDocument } from '../services/complianceCenterService';

const source = await import('node:fs').then((fs) => fs.readFileSync('src/app/features/compliance/ComplianceView.tsx', 'utf8'));

describe('0.8.7 compliance status and release readiness', () => {
  it('adds Datenschutzstatus and Release-Checkliste as compliance documents', () => {
    const types = listComplianceDocuments().map((item) => item.type);
    expect(types).toContain('data_protection_status');
    expect(types).toContain('release_readiness_checklist');
    expect(renderComplianceDocument('data_protection_status').body).toContain('Auto-Lock');
    expect(renderComplianceDocument('release_readiness_checklist').body).toContain('npm run build:linux');
  });

  it('surfaces the Datenschutzstatus in the compliance view without claiming automatic DSGVO approval', () => {
    expect(source).toContain('Technischer Status');
    expect(source).toContain('Datenschutz- und Integritätsstatus');
    expect(source).toContain('Technischen Status aktualisieren');
    expect(source).toContain('Organisatorische Datenschutz-Prüfpunkte');
  });
});
