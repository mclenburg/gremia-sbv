import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS,
  filterRelevantGremiaBrMeetings,
  findGremiaBrRelevance,
  parseGremiaBrRelevanceSettings,
  serializeGremiaBrRelevanceSettings,
} from '../services/gremiaBr/gremiaBrRelevanceService';

describe('Gremia.BR Relevanzfilter 0.9.2-D', () => {
  it('erkennt SBV-relevante Tagesordnungspunkte lokal ohne Serverfilter', () => {
    const meetings = [
      { id: 's1', titel: 'BR-Sitzung Mai' },
      { id: 's2', titel: 'BR-Sitzung Juni' },
    ];
    const agendas = {
      s1: [{ titel: 'Betriebliches Eingliederungsmanagement und Hilfsmittel' }],
      s2: [{ titel: 'Sommerfest' }],
    };

    const result = filterRelevantGremiaBrMeetings(meetings, agendas, DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS);

    expect(result).toHaveLength(1);
    expect(result[0].matchedGroups).toEqual(expect.arrayContaining(['BEM', 'Arbeitsplatzgestaltung']));
    expect(result[0].matchedKeywords).toEqual(expect.arrayContaining(['betriebliches eingliederungsmanagement', 'hilfsmittel']));
  });

  it('serialisiert und normalisiert konfigurierbare Stichwortgruppen', () => {
    const serialized = serializeGremiaBrRelevanceSettings({
      groups: [{ id: 'custom', label: ' Eigene Gruppe ', enabled: true, keywords: [' BEM ', 'bem', '', 'GdB'] }],
    });

    const parsed = parseGremiaBrRelevanceSettings(serialized);

    expect(parsed.groups).toEqual([{ id: 'custom', label: 'Eigene Gruppe', enabled: true, keywords: ['bem', 'gdb'] }]);
    expect(findGremiaBrRelevance({ text: 'GdB und BEM' }, parsed)?.matchedKeywords).toEqual(['bem', 'gdb']);
  });
});
