import { describe, expect, it } from 'vitest';
import type { BemProcessRecord, BemStatus } from '../src/app/core/models/bem.model';
import { bemStatusObjective, buildBemStatusGuidance, suggestNextBemStatus } from '../services/bemGuidancePolicy';

function process(status: BemStatus, patch: Partial<BemProcessRecord> = {}): BemProcessRecord {
  return {
    id: 'bem-1',
    caseId: 'case-1',
    status,
    title: 'BEM Verfahren',
    triggerType: 'sechs_wochen_au',
    employeeResponse: 'offen',
    contactIds: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...patch,
  };
}

describe('bem guidance branch coverage 0.9.2', () => {
  it('liefert fuer jeden Status ein fachliches Ziel', () => {
    const statuses: BemStatus[] = ['zu_pruefen', 'angebot_vorzubereiten', 'angebot_versendet', 'reaktion_abwarten', 'angenommen', 'abgelehnt', 'gespraech_geplant', 'massnahmen_in_klaerung', 'massnahmen_vereinbart', 'wirksamkeit_pruefen', 'abgeschlossen', 'abgebrochen'];
    for (const status of statuses) expect(bemStatusObjective(status)).toBeTruthy();
  });

  it('schlaegt naechste Status nur bei belastbaren Prozessdaten vor', () => {
    expect(suggestNextBemStatus(process('zu_pruefen', { triggerDescription: '6 Wochen AU' }))).toBe('angebot_vorzubereiten');
    expect(suggestNextBemStatus(process('angebot_vorzubereiten', { bemOfferedAt: '2026-06-01' }))).toBe('angebot_versendet');
    expect(suggestNextBemStatus(process('angebot_versendet', { responseDueAt: '2026-06-15' }))).toBe('reaktion_abwarten');
    expect(suggestNextBemStatus(process('reaktion_abwarten', { employeeResponse: 'angenommen' }))).toBe('angenommen');
    expect(suggestNextBemStatus(process('angenommen', { privacyNoticeAt: '2026-06-01', consentScope: 'SBV und BEM-Team' }))).toBe('gespraech_geplant');
    expect(suggestNextBemStatus(process('gespraech_geplant', { firstMeetingAt: '2026-06-20' }))).toBe('massnahmen_in_klaerung');
    expect(suggestNextBemStatus(process('massnahmen_in_klaerung', { measures: 'Arbeitsplatz pruefen' }))).toBe('massnahmen_vereinbart');
    expect(suggestNextBemStatus(process('massnahmen_vereinbart', { nextReviewAt: '2026-07-20' }))).toBe('wirksamkeit_pruefen');
    expect(suggestNextBemStatus(process('wirksamkeit_pruefen', { result: 'wirksam' }))).toBe('abgeschlossen');
    expect(suggestNextBemStatus(process('zu_pruefen'))).toBeUndefined();
  });

  it('baut Pflicht- und Abschluss-Hinweise je Statusfeld ohne Statuswechselzwang', () => {
    const planned = buildBemStatusGuidance(process('gespraech_geplant'));
    expect(planned.required.map((item) => item.field)).toEqual(expect.arrayContaining(['privacyNoticeAt', 'consentScope', 'firstMeetingAt']));
    expect(planned.suggestedNextStatus).toBeUndefined();

    const measures = buildBemStatusGuidance(process('massnahmen_vereinbart'));
    expect(measures.required.map((item) => item.field)).toEqual(expect.arrayContaining(['measures', 'measureOwners', 'nextReviewAt']));

    const closed = buildBemStatusGuidance(process('abgeschlossen'));
    expect(closed.required.map((item) => item.field)).toEqual(expect.arrayContaining(['completionReason', 'dataRetentionNote']));
    expect(closed.required.some((item) => item.level === 'info')).toBe(true);
  });
});
