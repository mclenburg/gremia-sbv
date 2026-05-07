import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateTerminationWarnings,
  hasPotentialSpecialDismissalProtection,
  isExtraordinaryTermination,
  suggestedStatementDueAt,
  suggestNextTerminationStatus,
  terminationStatusLabel,
  terminationStatusObjective
} from '../services/terminationWorkflowPolicy';
import type { TerminationHearingRecord } from '../src/app/core/models/termination.model';

function process(overrides: Partial<TerminationHearingRecord> = {}): TerminationHearingRecord {
  return {
    id: 'termination-1',
    caseId: 'case-1',
    status: 'eingang',
    terminationType: 'ordentlich',
    receivedAt: '2026-05-01T08:00:00.000Z',
    sbvStatementDueAt: '2026-05-08T08:00:00.000Z',
    protectionStatus: 'schwerbehindert',
    employerReason: 'betriebsbedingt',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides
  };
}

describe('termination workflow policy behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates seven days for ordinary and three days for extraordinary SBV statement deadlines', () => {
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'ordentlich')).toBe('2026-05-08T08:00:00.000Z');
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'ausserordentlich')).toBe('2026-05-04T08:00:00.000Z');
    expect(suggestedStatementDueAt('2026-05-01T08:00:00.000Z', 'verdachtskuendigung')).toBe('2026-05-04T08:00:00.000Z');
  });

  it('returns undefined for missing or invalid received dates', () => {
    expect(suggestedStatementDueAt(undefined, 'ordentlich')).toBeUndefined();
    expect(suggestedStatementDueAt('kein-datum', 'ordentlich')).toBeUndefined();
  });

  it('classifies extraordinary termination types and protected statuses', () => {
    expect(isExtraordinaryTermination('ausserordentlich')).toBe(true);
    expect(isExtraordinaryTermination('verdachtskuendigung')).toBe(true);
    expect(isExtraordinaryTermination('ordentlich')).toBe(false);
    expect(hasPotentialSpecialDismissalProtection(process({ protectionStatus: 'gleichgestellt' }))).toBe(true);
    expect(hasPotentialSpecialDismissalProtection(process({ protectionStatus: 'nicht_bekannt' }))).toBe(false);
  });

  it('emits critical warnings for missing received date, unclear protection and missing due date', () => {
    const warnings = evaluateTerminationWarnings(process({ receivedAt: undefined, protectionStatus: 'unklar', sbvStatementDueAt: undefined }));
    expect(warnings.filter((warning) => warning.level === 'critical').map((warning) => warning.message)).toEqual(expect.arrayContaining([
      'Eingangsdatum der Kündigungsanhörung fehlt.',
      'Schutzstatus ist nicht geklärt. Schwerbehinderung, Gleichstellung oder laufender Antrag müssen vor Bewertung geprüft werden.',
      'SBV-Stellungnahmefrist fehlt.'
    ]));
  });

  it('warns on near due dates and escalates overdue due dates', () => {
    const near = evaluateTerminationWarnings(process({ sbvStatementDueAt: '2026-05-08T07:00:00.000Z' }));
    expect(near.some((warning) => warning.level === 'warning' && warning.message.includes('24 Stunden'))).toBe(true);

    const overdue = evaluateTerminationWarnings(process({ sbvStatementDueAt: '2026-05-06T07:00:00.000Z' }));
    expect(overdue.some((warning) => warning.level === 'critical' && warning.message.includes('überschritten'))).toBe(true);
  });

  it('does not warn about overdue due dates after the statement was submitted or the process was closed', () => {
    expect(evaluateTerminationWarnings(process({ status: 'stellungnahme_abgegeben', sbvStatementDueAt: '2026-05-06T07:00:00.000Z' })).some((warning) => warning.message.includes('überschritten'))).toBe(false);
    expect(evaluateTerminationWarnings(process({ status: 'abgeschlossen', sbvStatementDueAt: '2026-05-06T07:00:00.000Z' })).some((warning) => warning.message.includes('überschritten'))).toBe(false);
  });

  it('requires integration office documentation for protected employees and employer reasons for all cases', () => {
    const warnings = evaluateTerminationWarnings(process({ employerReason: undefined }));
    expect(warnings.some((warning) => warning.level === 'critical' && warning.message.includes('Integrationsamts'))).toBe(true);
    expect(warnings.some((warning) => warning.level === 'warning' && warning.message.includes('Kündigungsgrund'))).toBe(true);
  });

  it('suggests the next status from documented process facts', () => {
    expect(suggestNextTerminationStatus(process({ status: 'eingang' }))).toBe('unterlagen_pruefen');
    expect(suggestNextTerminationStatus(process({ status: 'unterlagen_pruefen', employerReason: 'krankheitsbedingt' }))).toBe('sbv_anhoerung_offen');
    expect(suggestNextTerminationStatus(process({ status: 'sbv_anhoerung_offen' }))).toBe('integrationsamt_pruefen');
    expect(suggestNextTerminationStatus(process({ status: 'integrationsamt_pruefen', sbvAssessment: 'kritisch' }))).toBe('stellungnahme_in_arbeit');
    expect(suggestNextTerminationStatus(process({ status: 'stellungnahme_in_arbeit', statement: 'Stellungnahme' }))).toBe('stellungnahme_abgegeben');
    expect(suggestNextTerminationStatus(process({ status: 'stellungnahme_abgegeben' }))).toBe('abgeschlossen');
    expect(suggestNextTerminationStatus(process({ status: 'abgeschlossen' }))).toBeUndefined();
  });

  it('provides stable labels and objectives for all known statuses', () => {
    expect(terminationStatusLabel('integrationsamt_pruefen')).toBe('Integrationsamt prüfen');
    expect(terminationStatusObjective('sbv_anhoerung_offen')).toContain('§ 178 Abs. 2 Satz 1 SGB IX');
  });
});
