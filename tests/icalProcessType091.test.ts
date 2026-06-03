import { describe, expect, it } from 'vitest';
import { exportDeadlinesToIcal } from '../services/deadlineIcalExportService';
import { containsDirectIdentifier, deadlineProcessTypeLabel, sanitizeIcalText } from '../services/icalPrivacyPolicy';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';
import type { DeadlineIcalPrivacyLevel } from '../services/deadlineIcalExportService';

const base: DeadlineRecord = {
  id: 'd1',
  processType: 'bem',
  deadlineType: 'follow_up',
  title: 'BEM Max Mustermann nächste Maßnahme',
  confidentialTitle: 'BEM Max Mustermann',
  description: 'Diagnose und Maßnahmentext dürfen nicht exportiert werden',
  dueAt: '2026-06-01T09:00:00.000Z',
  severity: 'normal',
  status: 'open',
  calculationMode: 'workflow',
  isLegalDeadline: false,
  isUserEditable: true,
  warningThresholdHours: 48,
  criticalThresholdHours: 24,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
};

function ical(deadlines: DeadlineRecord[], privacyLevel?: DeadlineIcalPrivacyLevel) {
  return exportDeadlinesToIcal(deadlines, { privacyLevel, now: new Date('2026-05-01T00:00:00.000Z') });
}

describe('0.9.1 iCal process_type Export', () => {
  it('nutzt process_type als Standard und exportiert keine Direktidentifikatoren', () => {
    const ics = ical([base]);
    expect(ics).toContain('SUMMARY:Gremia.SBV: BEM-Wiedervorlage');
    expect(ics).not.toContain('Gremia.SBV Wiedervorlage');
    expect(ics).not.toContain('Max Mustermann');
    expect(ics).not.toContain('Diagnose');
    expect(ics.split('BEGIN:VEVENT').length).toBeGreaterThan(1);
    expect(ics.includes(String.fromCharCode(13, 10))).toBe(true);
  });

  it('exportiert Statusablauf und Datenschutzprüfung sprechend aus sourceEvent', () => {
    const ics = ical([
      { ...base, id: 'status', processType: 'custom', sourceEvent: 'protected_person.status_expiry_warning' },
      { ...base, id: 'privacy', processType: 'custom', sourceEvent: 'protected_person.status_expired_privacy_review' },
      { ...base, id: 'retention', processType: 'custom', sourceEvent: 'privacy_review.retention_due' }
    ]);
    expect(ics).toContain('SUMMARY:Gremia.SBV: Statusnachweis läuft ab');
    expect(ics).toContain('SUMMARY:Gremia.SBV: Datenschutzprüfung nach Statusablauf');
    expect(ics).toContain('SUMMARY:Gremia.SBV: Datenschutzprüfung wiedervorlegen');
  });

  it('deckt Privacy-Stufen und Prozesstypen ohne Direktdaten ab', () => {
    const deadlines = [
      { ...base, id: 'prevention', processType: 'prevention' as const, deadlineType: 'follow_up' as const, caseId: 'case-123456789' },
      { ...base, id: 'termination', processType: 'termination_hearing' as const, deadlineType: 'legal_deadline' as const },
      { ...base, id: 'case', processType: 'case' as const, deadlineType: 'legal_deadline' as const },
      { ...base, id: 'equalization', processType: 'equalization' as const, deadlineType: 'follow_up' as const },
      { ...base, id: 'gdb', processType: 'gdb' as const, deadlineType: 'follow_up' as const },
      { ...base, id: 'control', processType: 'sbv_control_protocol' as const, deadlineType: 'follow_up' as const },
      { ...base, id: 'fallback', processType: 'custom' as const, deadlineType: 'follow_up' as const }
    ];
    expect(ical(deadlines, 'privacy_first')).toContain('SUMMARY:Gremia.SBV Wiedervorlage');
    expect(ical(deadlines, 'case_reference')).toContain('Fall case-123');
    expect(ical(deadlines, 'process_type')).toContain('Prävention prüfen');
    expect(ical(deadlines, 'process_type')).toContain('Stellungnahmefrist prüfen');
    expect(ical(deadlines, 'process_type')).toContain('Gleichstellung prüfen');
    expect(ical(deadlines, 'process_type')).toContain('Statusverfahren prüfen');
    expect(ical(deadlines, 'process_type')).toContain('Steuerungsprotokoll-Wiedervorlage');
  });

  it('lässt details nur für geprüfte, nicht identifizierende Titel durch', () => {
    expect(ical([{ ...base, title: 'Interne Frist', confidentialTitle: 'Interne Frist', description: 'technische Erinnerung' }], 'details')).toContain('SUMMARY:Interne Frist');
    expect(ical([{ ...base, title: 'Rücksprache', confidentialTitle: 'max.mustermann@example.invalid', description: 'ohne Inhalt' }], 'details')).toContain('SUMMARY:Frist prüfen');
    expect(ical([{ ...base, title: 'Rücksprache', confidentialTitle: 'PNR P-12345', description: 'ohne Inhalt' }], 'details')).toContain('SUMMARY:Frist prüfen');
    expect(ical([{ ...base, title: 'Rücksprache', confidentialTitle: 'Attest prüfen', description: 'Depression' }], 'details')).toContain('DESCRIPTION:Bitte Vorgang in Gremia.SBV prüfen.');
  });

  it('prüft direkte Identifikatoren und Prozesslabels branch-sicher', () => {
    expect(containsDirectIdentifier(undefined)).toBe(false);
    expect(containsDirectIdentifier('Interne Frist')).toBe(false);
    expect(containsDirectIdentifier('Max Mustermann')).toBe(true);
    expect(containsDirectIdentifier('max.mustermann@example.invalid')).toBe(true);
    expect(sanitizeIcalText('Max Mustermann')).toBe('Frist prüfen');
    expect(deadlineProcessTypeLabel({ processType: 'case', deadlineType: 'follow_up' })).toBe('Fall-Wiedervorlage');
    expect(deadlineProcessTypeLabel({ processType: 'custom', deadlineType: 'warning' })).toBe('Wiedervorlage');
    expect(deadlineProcessTypeLabel({ processType: 'sbv_control_protocol', deadlineType: 'follow_up' })).toBe('Steuerungsprotokoll-Wiedervorlage');
  });

  it('faltet lange Zeilen und hält CRLF plattformunabhängig ein', () => {
    const ics = ical([{ ...base, id: 'long', processType: 'custom', title: 'Technische Erinnerung', description: 'x'.repeat(180) }], 'details');
    const lines = ics.split(String.fromCharCode(13, 10));
    expect(lines.some((line) => line.startsWith(' '))).toBe(true);
    expect(ics.endsWith(String.fromCharCode(13, 10))).toBe(true);
  });
});
