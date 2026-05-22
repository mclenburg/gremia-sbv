import type {
  GremiaBrRelevanceKeywordGroup,
  GremiaBrRelevanceMatch,
  GremiaBrRelevanceSettings,
} from '../../src/app/core/models/gremia-br.model.js';

export const DEFAULT_GREMIA_BR_RELEVANCE_GROUPS: readonly GremiaBrRelevanceKeywordGroup[] = [
  { id: 'severe_disability', label: 'Schwerbehinderung', enabled: true, keywords: ['schwerbehind', 'gdb', 'nachteilsausgleich'] },
  { id: 'bem', label: 'BEM', enabled: true, keywords: ['betriebliches eingliederungsmanagement', 'bem'] },
  { id: 'prevention', label: 'Prävention', enabled: true, keywords: ['prävention', '§ 167', '167 sgb ix', 'integrationsamt', 'inklusionsamt'] },
  { id: 'workplace', label: 'Arbeitsplatzgestaltung', enabled: true, keywords: ['arbeitsplatzgestaltung', 'ausstattung', 'hilfsmittel', 'barriere'] },
  { id: 'termination', label: 'Kündigung', enabled: true, keywords: ['kündigung', 'sonderkündigungsschutz', 'integrationsamt'] },
  { id: 'equalization', label: 'Gleichstellung', enabled: true, keywords: ['gleichstellung', 'gdb-antrag', 'gleichstellungsantrag'] },
  { id: 'inclusion', label: 'Inklusion', enabled: true, keywords: ['inklusion', 'inklusionsvereinbarung', '§ 166', '166 sgb ix'] },
] as const;

export const DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS: GremiaBrRelevanceSettings = {
  groups: DEFAULT_GREMIA_BR_RELEVANCE_GROUPS.map((group) => ({ ...group, keywords: [...group.keywords] })),
};

function normalizeKeyword(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('de-DE') : '';
}

function normalizeText(value: unknown): string {
  return String(value ?? '').toLocaleLowerCase('de-DE');
}

function collectText(value: unknown, depth = 0): string[] {
  if (value == null || depth > 4) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => collectText(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/id|uuid|password|token|secret/i.test(key))
      .flatMap(([, nested]) => collectText(nested, depth + 1));
  }
  return [];
}

export function parseGremiaBrRelevanceSettings(json?: string | null): GremiaBrRelevanceSettings {
  if (!json) return DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS;
  try {
    const parsed = JSON.parse(json) as { groups?: unknown };
    if (!Array.isArray(parsed.groups)) return DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS;
    const groups = parsed.groups
      .map((item) => item as Partial<GremiaBrRelevanceKeywordGroup>)
      .filter((item): item is Partial<GremiaBrRelevanceKeywordGroup> & { id: string; label: string } => typeof item.id === 'string' && typeof item.label === 'string')
      .map((item) => ({
        id: item.id,
        label: item.label,
        enabled: item.enabled !== false,
        keywords: Array.isArray(item.keywords)
          ? Array.from(new Set(item.keywords.map(normalizeKeyword).filter(Boolean)))
          : [],
      }))
      .filter((group) => group.keywords.length > 0);
    return groups.length ? { groups } : DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS;
  } catch {
    return DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS;
  }
}

export function serializeGremiaBrRelevanceSettings(settings: GremiaBrRelevanceSettings): string {
  const groups = settings.groups.map((group) => ({
    id: group.id,
    label: group.label.trim(),
    enabled: group.enabled !== false,
    keywords: Array.from(new Set(group.keywords.map(normalizeKeyword).filter(Boolean))),
  })).filter((group) => group.label && group.keywords.length > 0);
  return JSON.stringify({ groups: groups.length ? groups : DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS.groups });
}

export function findGremiaBrRelevance(value: unknown, settings: GremiaBrRelevanceSettings): GremiaBrRelevanceMatch | null {
  const text = normalizeText(collectText(value).join('\n'));
  if (!text) return null;
  const matchedGroups: string[] = [];
  const matchedKeywords: string[] = [];
  for (const group of settings.groups) {
    if (group.enabled === false) continue;
    const groupMatches = group.keywords
      .map(normalizeKeyword)
      .filter(Boolean)
      .filter((keyword) => text.includes(keyword));
    if (groupMatches.length) {
      matchedGroups.push(group.label);
      matchedKeywords.push(...groupMatches);
    }
  }
  if (!matchedGroups.length) return null;
  return {
    matchedGroups: Array.from(new Set(matchedGroups)),
    matchedKeywords: Array.from(new Set(matchedKeywords)),
  };
}

export function filterRelevantGremiaBrMeetings(
  meetings: unknown[],
  agendas: Record<string, unknown[]>,
  settings: GremiaBrRelevanceSettings,
): GremiaBrRelevanceMatch[] {
  return meetings.flatMap((meeting) => {
    const meetingId = getGremiaBrItemId(meeting);
    const agendaItems = meetingId ? agendas[meetingId] ?? [] : [];
    const match = findGremiaBrRelevance([meeting, agendaItems], settings);
    if (!match) return [];
    return [{ ...match, item: meeting, agendaItems }];
  });
}

export function getGremiaBrItemId(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const id = record.id ?? record.uuid ?? record.sitzungId ?? record.beschlussId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

export function getGremiaBrItemTitle(item: unknown, fallback = 'Gremia.BR-Eintrag'): string {
  if (!item || typeof item !== 'object') return fallback;
  const record = item as Record<string, unknown>;
  const title = record.titel ?? record.title ?? record.name ?? record.beschlusstext ?? record.beschlussText;
  return typeof title === 'string' && title.trim() ? title.trim() : fallback;
}

export function getGremiaBrItemDate(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const date = record.datum ?? record.date ?? record.frist ?? record.dueAt;
  return typeof date === 'string' && date.trim() ? date.trim() : undefined;
}
