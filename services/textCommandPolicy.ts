export type TextCommandToken =
  | '//'
  | '/fr'
  | '/frist'
  | '/wv'
  | '/wiedervorlage'
  | '@@'
  | '/kontakt'
  | '##'
  | '/fall'
  | '§§'
  | '/norm'
  | '!!'
  | '/risiko'
  | '>>'
  | '/todo'
  | '/aufgabe'
  | '^^'
  | '/vertr'
  | '/vertraulich'
  | '~~'
  | '/anon'
  | '/anonym'
  | '/bet'
  | '/beteiligung'
  | '/vl'
  | '/vorlage';

export type TextCommandKind =
  | 'deadline'
  | 'follow_up'
  | 'contact'
  | 'case_reference'
  | 'legal_norm'
  | 'risk'
  | 'open_task'
  | 'confidentiality'
  | 'anonymization'
  | 'participation'
  | 'template';

export interface TextCommandDefinition {
  kind: TextCommandKind;
  tokens: TextCommandToken[];
  label: string;
  description: string;
  requiresCase?: boolean;
}

export interface LegalNormSuggestion {
  id: string;
  source: string;
  paragraph: string;
  title: string;
  shortText: string;
}

export type RiskLevelCommand = 'low' | 'medium' | 'high' | 'critical';
export type ConfidentialCommandLevel = 'normal' | 'sensibel' | 'hoch_sensibel';

export const TEXT_COMMAND_REGISTRY: TextCommandDefinition[] = [
  { kind: 'deadline', tokens: ['//', '/fr', '/frist'], label: 'Frist anlegen', description: 'Frist mit Datum direkt aus dem Protokoll anlegen.', requiresCase: true },
  { kind: 'follow_up', tokens: ['/wv', '/wiedervorlage'], label: 'Wiedervorlage anlegen', description: 'Wiedervorlage mit Datum direkt aus dem Protokoll anlegen.', requiresCase: true },
  { kind: 'contact', tokens: ['@@', '/kontakt'], label: 'Kontakt einfügen', description: 'Kontakt suchen oder anlegen und in den Text einfügen.' },
  { kind: 'case_reference', tokens: ['##', '/fall'], label: 'Fallbezug verknüpfen', description: 'Weiteren Fallbezug in Text und Notiz hinterlegen.' },
  { kind: 'legal_norm', tokens: ['§§', '/norm'], label: 'Rechtsnorm einfügen', description: 'Rechtsnorm suchen, einfügen und mit der Fallakte verknüpfen.' },
  { kind: 'risk', tokens: ['!!', '/risiko'], label: 'Risiko markieren', description: 'Risiko- oder Warnhinweis sichtbar im Protokoll markieren.' },
  { kind: 'open_task', tokens: ['>>', '/todo', '/aufgabe'], label: 'Offene Aufgabe anlegen', description: 'Offene Aufgabe ohne konkretes Ablaufdatum anlegen.', requiresCase: true },
  { kind: 'confidentiality', tokens: ['^^', '/vertr', '/vertraulich'], label: 'Vertraulichkeit setzen', description: 'Vertraulichkeitsstufe der Notiz anheben.' },
  { kind: 'anonymization', tokens: ['~~', '/anon', '/anonym'], label: 'Anonymisierung vormerken', description: 'Textstelle für spätere Anonymisierung markieren.' },
  { kind: 'participation', tokens: ['/bet', '/beteiligung'], label: 'SBV-Beteiligung anlegen', description: 'SBV-Beteiligung nach § 178 Abs. 2 SGB IX als Maßnahme der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'template', tokens: ['/vl', '/vorlage'], label: 'Vorlage vormerken', description: 'Vorlagenbezug im Protokoll vormerken; die Dokumenterzeugung erfolgt im Vorlagenbereich.' }
];

export const TEXT_COMMANDS = TEXT_COMMAND_REGISTRY.reduce((acc, definition) => {
  for (const token of definition.tokens) acc[token] = definition.description;
  return acc;
}, {} as Record<TextCommandToken, string>);

export const TEXT_COMMAND_HINT = '// oder /fr Frist · /wv Wiedervorlage · /bet Beteiligung · /vl Vorlage · @@ Kontakt · §§ Norm · !! Risiko · >> Aufgabe';

const TOKEN_TO_KIND = TEXT_COMMAND_REGISTRY.reduce((acc, definition) => {
  for (const token of definition.tokens) acc[token] = definition.kind;
  return acc;
}, {} as Record<TextCommandToken, TextCommandKind>);

export function getTextCommandKind(token: TextCommandToken): TextCommandKind {
  return TOKEN_TO_KIND[token];
}

export function isTextCommandKind(token: TextCommandToken, kind: TextCommandKind): boolean {
  return getTextCommandKind(token) === kind;
}

export function tokensForTextCommandKind(kind: TextCommandKind): TextCommandToken[] {
  return TEXT_COMMAND_REGISTRY.find((definition) => definition.kind === kind)?.tokens ?? [];
}

export function primaryTokenForTextCommandKind(kind: TextCommandKind): TextCommandToken {
  return tokensForTextCommandKind(kind)[0];
}

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

export function formatTemplateMarkerText(query: string): string {
  return `[Vorlage vormerken: ${query.trim() || 'Vorlage auswählen'}]`;
}

export function formatParticipationMarkerText(title: string): string {
  return `SBV-Beteiligung angelegt: ${title.trim() || 'Beteiligung nach § 178 Abs. 2 SGB IX prüfen'}`;
}

export function formatContactReferenceText(contact: { firstName?: string; lastName?: string; organization?: string; role?: string; email?: string }): string {
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  const org = [contact.organization, contact.role].filter(Boolean).join(' · ');
  const email = contact.email ? ` <${contact.email}>` : '';
  return [name || 'Kontakt', org].filter(Boolean).join(' – ') + email;
}
