import { describe, expect, it } from 'vitest';
import { exportDeadlinesToIcal } from '../services/deadlineIcalExportService';
import { readNormalizedSourceText } from './helpers/sourceText';
import type { DeadlineRecord } from '../src/app/core/models/deadline.model';

const deadline: DeadlineRecord = {
  id: 'frist-1',
  processType: 'custom',
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
  it('nutzt bestehende deadlines statt paralleler Dashboard-Mechanik', () => {
    const service = readNormalizedSourceText('services/protectedPersonService.ts');
    const app = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');

    expect(service).toContain('new DeadlineService');
    expect(service).toContain("sourceEvent: 'protected_person.status_expiry_warning'");
    expect(app).toContain('Ablauf prüfen');
    expect(app).not.toContain('PersonExpiryDashboardCard');
  });

  it('exportiert iCal standardmäßig ohne Namen und Fallinhalte mit CRLF', () => {
    const ics = exportDeadlinesToIcal([deadline], { now: new Date('2026-05-01T00:00:00.000Z'), privacyLevel: 'privacy_first' });
    const rawDescription = deadline.description ?? '';
    const crlf = String.fromCharCode(13, 10);

    expect(ics.startsWith(`BEGIN:VCALENDAR${crlf}`)).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615');
    expect(ics).toContain('SUMMARY:Gremia.SBV Wiedervorlage');
    expect(ics).not.toContain('Max Mustermann');
    expect(ics).not.toContain(rawDescription);
  });
});
