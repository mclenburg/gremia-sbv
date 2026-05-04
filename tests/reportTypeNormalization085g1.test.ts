import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeReportType, REPORT_TYPES } from '../src/app/core/models/report.model';

describe('0.8.5-g.1 report type normalization', () => {
  it('keeps all known report types stable', () => {
    for (const reportType of REPORT_TYPES) {
      expect(normalizeReportType(reportType)).toBe(reportType);
    }
  });

  it('falls back to a valid ReportType for invalid runtime values', () => {
    expect(normalizeReportType('unknown')).toBe('system_integrity');
    expect(normalizeReportType(undefined)).toBe('system_integrity');
    expect(normalizeReportType({ type: 'activity' })).toBe('system_integrity');
  });

  it('does not assign arbitrary strings to ReportGenerationResult.reportType in report IPC', () => {
    const reportIpc = readFileSync('electron/ipc/reportIpc.ts', 'utf8');

    expect(reportIpc).toContain('normalizeReportType');
    expect(reportIpc).not.toContain('reportType: typeof input === "object"');
    expect(reportIpc).not.toContain('reportType: "unknown"');
  });
});
