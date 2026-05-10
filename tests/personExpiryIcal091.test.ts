import { describe, expect, it } from 'vitest';
import { exportDeadlinesToIcal } from '../services/deadlineIcalExportService';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';

const deadline: DeadlineRecord = {
  id: 'frist-1',
  processType: 'prevention',
  deadlineType: 'warning',
  title: 'Statusnachweis Max Mustermann läuft ab',
  confidentialTitle: 'Statusnachweis prüfen',
  description: 'Fallinhalt mit Person Max Mustermann',
  dueAt: '2026-06-15T09:00:00.000Z',
  severity: 'important',
  status: 'open',
  calculationMode: 'workflow',
  isLegalDeadline: false,
  isUserEditable: false,
  warningThresholdHours: 720,
  criticalThresholdHours: 168,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
};

describe('0.9.1 Statusablauf und iCal', () => {
  it('exportiert datenschutzfreundlich, aber fachlich sprechend statt als Dummy-Wiedervorlage', () => {
    const ics = exportDeadlinesToIcal([deadline], { now: new Date('2026-05-01T00:00:00.000Z'), privacyLevel: 'privacy_first' });
    const crlf = String.fromCharCode(13, 10);

    expect(ics.startsWith(`BEGIN:VCALENDAR${crlf}`)).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615');
    expect(ics).toContain('SUMMARY:Gremia.SBV: Prävention prüfen');
    expect(ics).toContain('Fristart: Prävention prüfen');
    expect(ics).not.toContain('Max Mustermann');
    expect(ics).not.toContain(deadline.description ?? '');
  });

  it('benennt Statusablauf- und Datenschutzprüfungsfristen aus dem Fristenmodul', () => {
    const statusDeadline = { ...deadline, id: 'status-1', processType: 'custom' as const, sourceEvent: 'protected_person.status_expiry_warning' };
    const reviewDeadline = { ...deadline, id: 'review-1', processType: 'custom' as const, sourceEvent: 'protected_person.status_expired_privacy_review' };
    const ics = exportDeadlinesToIcal([statusDeadline, reviewDeadline], { now: new Date('2026-05-01T00:00:00.000Z') });

    expect(ics).toContain('SUMMARY:Gremia.SBV: Statusnachweis läuft ab');
    expect(ics).toContain('SUMMARY:Gremia.SBV: Datenschutzprüfung nach Statusablauf');
  });
});
