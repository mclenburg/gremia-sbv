import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function tsxFilesUnder(dir: string): string[] {
  const files: string[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path)) {
      const child = `${path}/${entry}`;
      if (statSync(child).isDirectory()) visit(child);
      else if (child.endsWith('.tsx')) files.push(child);
    }
  }
  visit(dir);
  return files;
}

function lineCount(path: string): number {
  return source(path).split('\n').length;
}

describe('Compliance Refactor Patch P13', () => {
  it('hält die Compliance-View als dünne Orchestrierung statt neuer Großdatei', () => {
    const view = source('src/app/features/compliance/ComplianceView.tsx');

    expect(lineCount('src/app/features/compliance/ComplianceView.tsx')).toBeLessThan(140);
    expect(view).toContain('useComplianceCenter');
    expect(view).toContain('ComplianceStatusPanel');
    expect(view).toContain('ComplianceIncidentsPanel');
    expect(view).toContain('ComplianceDsarPanel');
    expect(view).not.toContain('useState');
    expect(view).not.toContain('waitForBridge');
  });

  it('zerlegt Compliance-Arbeitsbereiche in reviewbare Komponenten und Hook-Dateien', () => {
    for (const path of [
      'src/app/features/compliance/useComplianceCenter.ts',
      'src/app/features/compliance/complianceViewUtils.ts',
      'src/app/features/compliance/components/ComplianceIncidentsPanel.tsx',
      'src/app/features/compliance/components/ComplianceDsarPanel.tsx',
      'src/app/features/compliance/components/ComplianceDocumentsPanel.tsx',
    ]) {
      expect(source(path).trim().length).toBeGreaterThan(0);
      expect(lineCount(path)).toBeLessThan(320);
    }
  });

  it('bewahrt zentrale UI-Komponenten im gesamten Compliance-Feature statt in einer Monolithdatei', () => {
    const compliance = [
      'src/app/features/compliance/ComplianceView.tsx',
      'src/app/features/compliance/useComplianceCenter.ts',
      'src/app/features/compliance/complianceViewUtils.ts',
      ...tsxFilesUnder('src/app/features/compliance/components'),
    ].map(source).join('\n');

    for (const marker of [
      'WorkbenchPage',
      'WorkbenchWorkspace',
      'IndustrialStatusCard',
      'IndustrialSelectionCard',
      'FormSection',
      'SearchToolbar',
      'RecordList',
      'ComplianceBadge',
      'RiskBadge',
      'ProcessStatusBadge',
      'useAnnouncer',
    ]) {
      expect(compliance).toContain(marker);
    }
  });
});
