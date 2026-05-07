import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('RC review type-safety fixes', () => {
  it('does not cast ReportsView bridge access to any', () => {
    const source = readFileSync('src/app/features/reports/ReportsView.tsx', 'utf8');
    expect(source).not.toContain('waitForBridge() as any');
    expect(source).toContain('if (!bridge?.reports)');
    expect(source).toContain('bridge.reports.descriptors()');
    expect(source).toContain('bridge.reports.generate(input)');
    expect(source).toContain('bridge.reports.openExportFolder(filePath)');
  });

  it('keeps process template action dependencies explicitly typed', () => {
    const source = readFileSync('src/app/features/cases/useProcessTemplateActions.ts', 'utf8');
    expect(source).toContain('selectedCase?: CaseRecord');
    expect(source).toContain('confirmDialog: ConfirmDialog');
    expect(source).not.toContain('selectedCase: any');
    expect(source).not.toContain('confirmDialog: any');
  });

  it('imports case measure bridge model types in vite env declarations', () => {
    const source = readFileSync('src/vite-env.d.ts', 'utf8');
    expect(source).toContain('CaseMeasureRecord');
    expect(source).toContain('CreateCaseMeasureInput');
    expect(source).toContain('UpdateCaseMeasureInput');
    expect(source).toContain('from "./app/core/models/case-measure.model"');
    expect(source).toContain('caseMeasures:');
  });
});
