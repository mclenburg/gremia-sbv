import { describe, expect, it, vi } from 'vitest';
import { assertActivityReportHasNoSensitiveFreeText, renderActivityReport } from '../services/activityReportService';

describe('activity report service behavior', () => {
  it('renders anonymized status summaries and stable filenames for defined input', () => {
    vi.setSystemTime(new Date('2026-05-07T08:00:00.000Z'));

    const report = renderActivityReport({
      periodLabel: 'April 2026',
      generatedAt: '2026-05-07T08:00:00.000Z',
      cases: [{ category: 'BEM' }, { category: 'BEM' }, { category: 'Prävention' }],
      contacts: [{}, {}],
      deadlines: [
        { status: 'open' },
        { status: 'done' },
        { dueAt: '2026-05-01T00:00:00.000Z' }
      ],
      preventionProcesses: [{ status: 'offen' }],
      bemProcesses: [{ status: 'angenommen' }],
      equalizationProcesses: [{ applicationStatus: 'eingereicht' }],
      terminationProcesses: [{ status: 'sbv_anhoerung_offen' }]
    });

    expect(report.title).toBe('SBV-Tätigkeitsbericht – April 2026');
    expect(report.filename).toBe('gremia-sbv-taetigkeitsbericht-2026-05-07.md');
    expect(report.body).toContain('| Fallakten | 3 |');
    expect(report.body).toContain('| Kontakte | 2 |');
    expect(report.body).toContain('| offene / relevante Fristen | 2 |');
    expect(report.body).toContain('| davon überfällig | 1 |');
    expect(report.body).toContain('| BEM | 2 |');
    expect(report.body).toContain('| Prävention | 1 |');
    expect(assertActivityReportHasNoSensitiveFreeText(report.body)).toBe(true);
  });

  it('renders empty tables and detects forbidden sensitive free text markers', () => {
    const report = renderActivityReport({
      periodLabel: 'Leerbestand',
      generatedAt: '2026-05-07T08:00:00.000Z',
      cases: [],
      contacts: [],
      deadlines: [],
      preventionProcesses: [],
      bemProcesses: [],
      equalizationProcesses: [],
      terminationProcesses: []
    });

    expect(report.body).toContain('Keine Daten im Auswertungszeitraum.');
    expect(assertActivityReportHasNoSensitiveFreeText('Diagnose: Test')).toBe(false);
    expect(assertActivityReportHasNoSensitiveFreeText('SBV-Stellungnahme: vertraulich')).toBe(false);
    expect(assertActivityReportHasNoSensitiveFreeText('Nur aggregierte Kennzahlen')).toBe(true);
  });
});
