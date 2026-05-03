export type TextCommandToken = '//' | '@@' | '##' | '§§' | '!!' | '>>' | '^^' | '~~';

export interface LegalNormSuggestion {
  id: string;
  source: string;
  paragraph: string;
  title: string;
  shortText: string;
}

export type RiskLevelCommand = 'low' | 'medium' | 'high' | 'critical';
export type ConfidentialCommandLevel = 'normal' | 'sensibel' | 'hoch_sensibel';

export const TEXT_COMMANDS: Record<TextCommandToken, string> = {
  '//': 'Frist mit Datum anlegen',
  '@@': 'Kontakt einfügen',
  '##': 'weiteren Fallbezug verknüpfen',
  '§§': 'Rechtsnorm einfügen',
  '!!': 'Risiko oder Warnung markieren',
  '>>': 'offene Aufgabe ohne Datum anlegen',
  '^^': 'Vertraulichkeitsstufe der Notiz anheben',
  '~~': 'Textstelle zur späteren Anonymisierung vormerken'
};

export const LEGAL_NORM_SUGGESTIONS: LegalNormSuggestion[] = [
  { id: 'sgb-ix-167-1', source: 'SGB IX', paragraph: '§ 167 Abs. 1 SGB IX', title: 'Präventionsverfahren', shortText: 'Arbeitgeber muss bei Gefährdung frühzeitig SBV, Interessenvertretung und Inklusionsamt einschalten.' },
  { id: 'sgb-ix-167-2', source: 'SGB IX', paragraph: '§ 167 Abs. 2 SGB IX', title: 'Betriebliches Eingliederungsmanagement', shortText: 'BEM nach mehr als sechs Wochen Arbeitsunfähigkeit innerhalb von zwölf Monaten.' },
  { id: 'sgb-ix-178-1', source: 'SGB IX', paragraph: '§ 178 Abs. 1 SGB IX', title: 'Aufgaben der SBV', shortText: 'SBV fördert Eingliederung und wacht über zugunsten schwerbehinderter Menschen geltende Vorschriften.' },
  { id: 'sgb-ix-178-2', source: 'SGB IX', paragraph: '§ 178 Abs. 2 SGB IX', title: 'Unterrichtung und Anhörung der SBV', shortText: 'SBV ist unverzüglich und umfassend zu unterrichten und vor Entscheidungen anzuhören.' },
  { id: 'sgb-ix-164-4', source: 'SGB IX', paragraph: '§ 164 Abs. 4 SGB IX', title: 'Behinderungsgerechte Beschäftigung', shortText: 'Anspruch auf behinderungsgerechte Beschäftigung, Arbeitsplatzgestaltung und Unterstützung.' },
  { id: 'sgb-ix-168', source: 'SGB IX', paragraph: '§ 168 SGB IX', title: 'Zustimmung Integrationsamt', shortText: 'Kündigung schwerbehinderter Menschen bedarf vorheriger Zustimmung des Integrationsamts.' },
  { id: 'betrvg-102', source: 'BetrVG', paragraph: '§ 102 BetrVG', title: 'Anhörung des Betriebsrats bei Kündigungen', shortText: 'Betriebsrat ist vor jeder Kündigung anzuhören.' },
  { id: 'betrvg-99', source: 'BetrVG', paragraph: '§ 99 BetrVG', title: 'Personelle Einzelmaßnahmen', shortText: 'Mitbestimmung bei Einstellung, Eingruppierung, Umgruppierung und Versetzung.' },
  { id: 'agg-7', source: 'AGG', paragraph: '§ 7 AGG', title: 'Benachteiligungsverbot', shortText: 'Beschäftigte dürfen wegen eines geschützten Merkmals nicht benachteiligt werden.' },
  { id: 'kschg-1', source: 'KSchG', paragraph: '§ 1 KSchG', title: 'Soziale Rechtfertigung der Kündigung', shortText: 'Kündigung muss sozial gerechtfertigt sein.' }
];

export function findFirstTextCommand(value: string, disabledCommands: TextCommandToken[] = []): { token: TextCommandToken; index: number } | null {
  const disabled = new Set(disabledCommands);
  const matches = (Object.keys(TEXT_COMMANDS) as TextCommandToken[])
    .filter((token) => !disabled.has(token))
    .map((token) => ({ token, index: value.indexOf(token) }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index || b.token.length - a.token.length);
  return matches[0] ?? null;
}

export function replaceCommandMarker(value: string, markerIndex: number, token: TextCommandToken, replacement: string): string {
  const index = value.slice(markerIndex).startsWith(token) ? markerIndex : value.indexOf(token);
  if (index < 0) return value;
  return `${value.slice(0, index)}${replacement}${value.slice(index + token.length)}`.replace(/ {2,}/g, ' ');
}

export function removeCommandMarker(value: string, markerIndex: number, token: TextCommandToken): string {
  return replaceCommandMarker(value, markerIndex, token, '').replace(/ {2,}/g, ' ');
}

export function formatCaseReferenceText(caseNumber: string, displayName?: string): string {
  return displayName ? `Fallbezug ${caseNumber} (${displayName})` : `Fallbezug ${caseNumber}`;
}

export function formatLegalNormText(norm: Pick<LegalNormSuggestion, 'paragraph' | 'title'>): string {
  return `${norm.paragraph} – ${norm.title}`;
}

export function formatRiskText(level: RiskLevelCommand, text: string): string {
  const label = level === 'critical' ? 'kritisch' : level === 'high' ? 'hoch' : level === 'medium' ? 'mittel' : 'niedrig';
  return `[Risiko: ${label}] ${text.trim() || 'Risiko vermerkt'}`;
}

export function formatOpenTaskText(title: string): string {
  return `Aufgabe offen: ${title.trim() || 'Nächsten Schritt klären'}`;
}

export function formatConfidentialityText(level: ConfidentialCommandLevel): string {
  const label = level === 'hoch_sensibel' ? 'hoch sensibel' : level;
  return `[Vertraulichkeit: ${label}]`;
}

export function formatAnonymizationMarkerText(label: string): string {
  return `[Anonymisierung vormerken: ${label.trim() || 'Textstelle'}]`;
}


export function formatContactReferenceText(contact: { firstName?: string; lastName?: string; organization?: string; role?: string; email?: string }): string {
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  const org = [contact.organization, contact.role].filter(Boolean).join(' · ');
  const email = contact.email ? ` <${contact.email}>` : '';
  return [name || 'Kontakt', org].filter(Boolean).join(' – ') + email;
}
