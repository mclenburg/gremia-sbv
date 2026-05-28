import { describe, expect, it } from 'vitest';
import { formatGermanDateTime, resolveGremiaBrDashboardTile, resolveNextGremiaBrMeetingAgenda } from '../src/app/features/dashboard/DashboardFocusOverview';
import type { GremiaBrDashboardOverview } from '../src/app/core/models/gremia-br.model';

const overview: GremiaBrDashboardOverview = {
  nextMeeting: { id: 'meeting-1', title: 'BR-Sitzung' },
  upcomingMeetings: [{ id: 'meeting-2', title: 'Ersatztermin' }],
  meetingAgendas: {
    'meeting-1': [
      { title: 'TOP 1: Arbeitsplätze' },
      { title: 'TOP 2: BEM' },
      { title: 'TOP 3: Prävention' },
      { title: 'TOP 4: Fristen' },
      { title: 'TOP 5: Ausstattung' },
      { title: 'TOP 6: Sonstiges' },
    ],
  },
  pendingFollowUps: [],
  decisions: [],
  dueDecisions: [],
  overdueDecisions: [],
  relevanceSettings: { groups: [] },
  relevantMeetings: [{ item: { id: 'meeting-1', title: 'BR-Sitzung' }, matchedGroups: ['BEM'], matchedKeywords: ['bem'] }],
  openDecisionCount: 0,
  dueDecisionCount: 0,
  overdueDecisionCount: 0,
  lastFetchedAt: '2026-05-22T20:39:00.000Z',
};

describe('dashboard presentation 0.9.2-I', () => {
  it('zeigt die nächste BR-Sitzung nur bei aktivierter Lesebrücke und begrenzt die Agenda auf Dashboardgröße', () => {
    const resolved = resolveNextGremiaBrMeetingAgenda({ enabled: true, overview });

    expect(resolved?.meeting).toEqual({ id: 'meeting-1', title: 'BR-Sitzung' });
    expect(resolved?.agenda).toHaveLength(5);
    expect(resolved?.agenda.at(0)).toEqual({ title: 'TOP 1: Arbeitsplätze' });
  });

  it('blendet BR-Sitzungsdetails aus, solange Gremia.BR nicht aktiviert ist', () => {
    expect(resolveNextGremiaBrMeetingAgenda({ enabled: false, overview })).toBeNull();
  });

  it('blendet die Gremia.BR-Dashboard-Kachel bei deaktivierter Lesebrücke aus', () => {
    expect(resolveGremiaBrDashboardTile({ enabled: false, overview })).toBeNull();
  });

  it('zeigt bei aktivierter Lesebrücke den letzten Datenabruf in deutscher Schreibweise', () => {
    const tile = resolveGremiaBrDashboardTile({ enabled: true, overview });

    expect(tile).toEqual({
      relevantMeetingCount: 1,
      lastFetchedLabel: expect.stringMatching(/22\.05\.2026|22\. Mai 2026/),
    });
  });

  it('zeigt ohne Cache-Zeitpunkt einen neutralen Abrufhinweis statt technischer Rohdaten', () => {
    expect(formatGermanDateTime(undefined)).toBe('noch nicht abgerufen');
  });


});
