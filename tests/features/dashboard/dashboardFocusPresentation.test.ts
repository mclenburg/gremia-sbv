import { describe, expect, it, vi } from 'vitest';
import { GremiaBrDashboardTile, GremiaBrMeetingAgenda } from '../../../src/app/features/dashboard/GremiaBrDashboardPanels';
import type { GremiaBrDashboardOverview } from '../../../src/domain/models/gremia-br.model';
import { descendants, renderComponent, visibleText } from '../../helpers/renderedMarkup';

const overview: GremiaBrDashboardOverview = {
  accessibleCases: [],
  ownTasks: [],
  ownAccessApprovals: [],
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


describe('Gremia.BR im Dashboard', () => {
  it('zeigt höchstens fünf Tagesordnungspunkte und drei relevante Sitzungstreffer', () => {
    const { markup } = renderComponent(GremiaBrMeetingAgenda, {
      enabled: true, error: '', status: '',
      overview: { ...overview, relevantMeetings: Array.from({ length: 4 }, (_, index) => ({
        item: { id: `relevant-${index}`, title: `Relevante Sitzung ${index + 1}` },
        matchedGroups: ['BEM'], matchedKeywords: ['bem'],
      })) },
    });
    const text = visibleText(markup);
    expect(text).toContain('TOP 1: Arbeitsplätze');
    expect(text).toContain('TOP 5: Ausstattung');
    expect(text).not.toContain('TOP 6: Sonstiges');
    expect(text).toContain('Relevante Sitzung 3');
    expect(text).not.toContain('Relevante Sitzung 4');
    expect(text).toContain('Treffer: BEM');
  });

  it('blendet Sitzungsdetails bei deaktivierter Lesebrücke vollständig aus', () => {
    expect(renderComponent(GremiaBrMeetingAgenda, { enabled: false, overview, error: '', status: '' }).markup).toBe('');
  });

  it('bietet bei deaktivierter Lesebrücke keinen Abruf an', () => {
    const onRefresh = vi.fn(async () => undefined);
    expect(renderComponent(GremiaBrDashboardTile, { enabled: false, overview, busy: false, onRefresh }).markup).toBe('');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('zeigt den Abrufzeitpunkt und bietet genau eine bewusst auszulösende Abrufaktion an', () => {
    const onRefresh = vi.fn(async () => undefined);
    const { markup, tree } = renderComponent(GremiaBrDashboardTile, { enabled: true, overview, busy: false, onRefresh });
    const text = visibleText(markup);
    expect(text).toContain('1 relevante Sitzung(en)');
    expect(text).toMatch(/22\.05\.2026|22\. Mai 2026/);
    expect(descendants(tree).filter((node) => node.tag === 'button')).toHaveLength(1);
    expect(text).toContain('Abrufen');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'ungueltig'])('zeigt einen neutralen Hinweis für den fehlenden oder ungültigen Cache-Zeitpunkt %s', (lastFetchedAt) => {
    const { markup } = renderComponent(GremiaBrDashboardTile, {
      enabled: true, overview: { ...overview, lastFetchedAt }, busy: false, onRefresh: async () => undefined,
    });
    expect(visibleText(markup)).toContain('Letzter Datenabruf: noch nicht abgerufen');
  });

  it('sperrt die Abrufaktion während eines laufenden Abrufs', () => {
    const { markup, tree } = renderComponent(GremiaBrDashboardTile, {
      enabled: true, overview, busy: true, onRefresh: async () => undefined,
    });
    const button = descendants(tree).find((node) => node.tag === 'button');
    expect(button?.attrs.disabled).toBeDefined();
    expect(visibleText(markup)).toContain('Abruf läuft …');
  });

  it('verwendet ohne ausdrücklich nächste Sitzung den ersten vorhandenen Termin mit seiner Agenda', () => {
    const { markup } = renderComponent(GremiaBrMeetingAgenda, {
      enabled: true, error: '', status: '',
      overview: { ...overview, nextMeeting: undefined, meetingAgendas: { 'meeting-2': [{ titel: 'Synthetischer Ersatz-TOP' }] } },
    });
    const text = visibleText(markup);
    expect(text).toContain('Ersatztermin');
    expect(text).toContain('Synthetischer Ersatz-TOP');
    expect(text).not.toContain('TOP 1: Arbeitsplätze');
  });

  it('zeigt bei leerem Lesecache einen verständlichen Leerzustand', () => {
    const { markup } = renderComponent(GremiaBrMeetingAgenda, {
      enabled: true, error: '', status: '', overview: { ...overview, nextMeeting: undefined, upcomingMeetings: [] },
    });
    expect(visibleText(markup)).toContain('Keine BR-Sitzung im lokalen Lesecache.');
  });

  it('zeigt fehlende Tagesordnung sowie Fehler und Erfolg semantisch getrennt an', () => {
    const { markup, tree } = renderComponent(GremiaBrMeetingAgenda, {
      enabled: true, error: 'Synthetischer Abruffehler', status: 'Synthetischer Cache-Status',
      overview: { ...overview, meetingAgendas: {} },
    });
    expect(visibleText(markup)).toContain('Keine Tagesordnung im aktuellen Lesecache.');
    expect(visibleText(markup)).toContain('Synthetischer Abruffehler');
    expect(visibleText(markup)).toContain('Synthetischer Cache-Status');
    expect(descendants(tree).filter((node) => node.attrs.role === 'alert')).toHaveLength(1);
    expect(descendants(tree).filter((node) => node.attrs.role === 'status')).toHaveLength(1);
  });
});
