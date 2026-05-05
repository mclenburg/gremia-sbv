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
  | '/bem'
  | '/praev'
  | '/prävention'
  | '/praevention'
  | '/gleich'
  | '/gdb'
  | '/kuend'
  | '/kündigung'
  | '/kuendigung'
  | '/bet'
  | '/beteiligung'
  | '/anp'
  | '/anpassung'
  | '/arbeitsplatz'
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
  | 'bem_measure'
  | 'prevention_measure'
  | 'equalization_measure'
  | 'termination_measure'
  | 'participation'
  | 'workplace_accommodation'
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
  { kind: 'bem_measure', tokens: ['/bem'], label: 'BEM-Vorgang anlegen', description: 'BEM-Vorgang als Maßnahme/Prozess der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'prevention_measure', tokens: ['/praev', '/prävention', '/praevention'], label: 'Prävention anlegen', description: 'Präventionsverfahren nach § 167 Abs. 1 SGB IX in der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'equalization_measure', tokens: ['/gleich', '/gdb'], label: 'Gleichstellung/GdB anlegen', description: 'Gleichstellungs- oder GdB-Beratungsprozess in der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'termination_measure', tokens: ['/kuend', '/kündigung', '/kuendigung'], label: 'Kündigungsanhörung anlegen', description: 'Kündigungsanhörung als Vorgang der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'participation', tokens: ['/bet', '/beteiligung'], label: 'SBV-Beteiligung anlegen', description: 'SBV-Beteiligung nach § 178 Abs. 2 SGB IX als Maßnahme der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'workplace_accommodation', tokens: ['/anp', '/anpassung', '/arbeitsplatz'], label: 'Arbeitsplatzgestaltung anlegen', description: 'Behinderungsgerechte Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX als Maßnahme der aktuellen Fallakte anlegen.', requiresCase: true },
  { kind: 'template', tokens: ['/vl', '/vorlage'], label: 'Vorlage vormerken', description: 'Vorlagenbezug im Protokoll vormerken; die Dokumenterzeugung erfolgt im Vorlagenbereich.' }
];

export const TEXT_COMMANDS = TEXT_COMMAND_REGISTRY.reduce((acc, definition) => {
  for (const token of definition.tokens) acc[token] = definition.description;
  return acc;
}, {} as Record<TextCommandToken, string>);

export const TEXT_COMMAND_HINT = 'Strg+H zeigt alle Kurzbefehle';

export interface TextCommandHelpGroup {
  title: string;
  description: string;
  kinds: TextCommandKind[];
}

export const TEXT_COMMAND_HELP_GROUPS: TextCommandHelpGroup[] = [
  { title: 'Live-Erfassung', description: 'Direkt im Gespräch Fristen, Wiedervorlagen und Aufgaben vormerken.', kinds: ['deadline', 'follow_up', 'open_task'] },
  { title: 'Fallakten-Maßnahmen', description: 'Strukturierte SBV-Vorgänge in der geöffneten Fallakte anlegen.', kinds: ['bem_measure', 'prevention_measure', 'participation', 'termination_measure', 'equalization_measure', 'workplace_accommodation'] },
  { title: 'Wissen und Bezüge', description: 'Kontakte, Fallbezüge, Normen und Vorlagen in den Arbeitsfluss holen.', kinds: ['contact', 'case_reference', 'legal_norm', 'template'] },
  { title: 'Datenschutz und Bewertung', description: 'Risiken, Vertraulichkeit und Anonymisierung während des Protokolls markieren.', kinds: ['risk', 'confidentiality', 'anonymization'] }
];

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

function isCommandBoundaryBefore(value: string, index: number): boolean {
  if (index <= 0) return true;
  return /[\s([{;:,.!?\n\r]/.test(value.charAt(index - 1));
}

function isCommandBoundaryAfter(value: string, index: number, token: TextCommandToken): boolean {
  const next = value.charAt(index + token.length);
  if (!next) return true;
  if (token.startsWith('/')) return /[\s([{;:,.!?\n\r]/.test(next);
  return true;
}

export function isTextCommandAt(value: string, index: number, token: TextCommandToken): boolean {
  return value.slice(index).startsWith(token)
    && isCommandBoundaryBefore(value, index)
    && isCommandBoundaryAfter(value, index, token);
}

export function findFirstTextCommand(value: string, disabledCommands: TextCommandToken[] = []): { token: TextCommandToken; index: number } | null {
  const disabled = new Set(disabledCommands);
  const matches: Array<{ token: TextCommandToken; index: number }> = [];

  for (const token of Object.keys(TEXT_COMMANDS) as TextCommandToken[]) {
    if (disabled.has(token)) continue;
    let index = value.indexOf(token);
    while (index >= 0) {
      if (isTextCommandAt(value, index, token)) {
        matches.push({ token, index });
        break;
      }
      index = value.indexOf(token, index + token.length);
    }
  }

  return matches.sort((a, b) => a.index - b.index || b.token.length - a.token.length)[0] ?? null;
}

export function getTextCommandArgument(value: string, markerIndex: number, token: TextCommandToken): string {
  const index = isTextCommandAt(value, markerIndex, token) ? markerIndex : value.indexOf(token);
  if (index < 0) return '';
  const afterToken = value.slice(index + token.length);
  const newlineIndex = afterToken.search(/[\r\n]/);
  const segment = newlineIndex >= 0 ? afterToken.slice(0, newlineIndex) : afterToken;
  return segment.replace(/\s+/g, ' ').trim();
}

export function getTextCommandRangeLength(value: string, markerIndex: number, token: TextCommandToken): number {
  const argument = getTextCommandArgument(value, markerIndex, token);
  return token.length + (argument ? argument.length + 1 : 0);
}

export function replaceCommandMarker(value: string, markerIndex: number, token: TextCommandToken, replacement: string, rangeLength?: number): string {
  const index = isTextCommandAt(value, markerIndex, token) ? markerIndex : value.indexOf(token);
  if (index < 0) return value;
  const length = rangeLength ?? token.length;
  return `${value.slice(0, index)}${replacement}${value.slice(index + length)}`.replace(/ {2,}/g, ' ');
}

export function removeCommandMarker(value: string, markerIndex: number, token: TextCommandToken, rangeLength?: number): string {
  return replaceCommandMarker(value, markerIndex, token, '', rangeLength).replace(/ {2,}/g, ' ');
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

export function formatWorkplaceAccommodationMarkerText(title: string): string {
  return `Arbeitsplatzgestaltung angelegt: ${title.trim() || 'behinderungsgerechte Beschäftigung nach § 164 Abs. 4 SGB IX prüfen'}`;
}

export function formatBemMarkerText(title: string): string {
  return `BEM-Vorgang angelegt: ${title.trim() || 'Betriebliches Eingliederungsmanagement prüfen'}`;
}

export function formatPreventionMarkerText(title: string): string {
  return `Präventionsverfahren angelegt: ${title.trim() || 'Prävention nach § 167 Abs. 1 SGB IX prüfen'}`;
}

export function formatEqualizationMarkerText(title: string): string {
  return `Gleichstellung/GdB angelegt: ${title.trim() || 'Gleichstellung oder GdB-Beratung prüfen'}`;
}

export function formatTerminationMarkerText(title: string): string {
  return `Kündigungsanhörung angelegt: ${title.trim() || 'Kündigungsanhörung prüfen'}`;
}

export function formatContactReferenceText(contact: { firstName?: string; lastName?: string; organization?: string; role?: string; email?: string }): string {
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  const org = [contact.organization, contact.role].filter(Boolean).join(' · ');
  const email = contact.email ? ` <${contact.email}>` : '';
  return [name || 'Kontakt', org].filter(Boolean).join(' – ') + email;
}
