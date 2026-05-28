export type GremiaBrEndpointAuthMode = 'anonymous' | 'bearer';

export interface GremiaBrEndpointDefinition {
  method: 'GET' | 'POST';
  template: string;
  auth: GremiaBrEndpointAuthMode;
  purpose: string;
}

const API_SEGMENT_PATTERN = '[^/?#]+';

export const GREMIA_BR_READ_API_CATALOG: readonly GremiaBrEndpointDefinition[] = [
  { method: 'POST', template: '/auth/login', auth: 'anonymous', purpose: 'Token für explizit ausgelöste Lesesitzung holen' },
  { method: 'GET', template: '/auth/me', auth: 'bearer', purpose: 'Sessionstatus für konfigurierte Lesebrücke prüfen' },
  { method: 'GET', template: '/auth/profile', auth: 'bearer', purpose: 'Gremia.BR-Profil für Verbindungstest laden' },
  { method: 'GET', template: '/search', auth: 'bearer', purpose: 'BR-Inhalte lokal referenzierbar suchen' },
  { method: 'GET', template: '/search/suggest', auth: 'bearer', purpose: 'BR-Beschlüsse als Inline-Referenz vorschlagen' },
  { method: 'GET', template: '/sitzungen/naechste', auth: 'bearer', purpose: 'Nächste BR-Sitzung lesen' },
  { method: 'GET', template: '/sitzungen/aktuelle', auth: 'bearer', purpose: 'Aktuell laufende BR-Sitzung lesen' },
  { method: 'GET', template: '/sitzungen/kommende', auth: 'bearer', purpose: 'Kommende BR-Sitzungen lesen' },
  { method: 'GET', template: '/sitzungen/wiedervorlagen', auth: 'bearer', purpose: 'Offene BR-Wiedervorlagen lesen' },
  { method: 'GET', template: '/sitzungen/{id}', auth: 'bearer', purpose: 'Details einer BR-Sitzung lesen' },
  { method: 'GET', template: '/sitzungen/{id}/agenda', auth: 'bearer', purpose: 'Tagesordnung einer BR-Sitzung lesen' },
  { method: 'GET', template: '/sitzungen/{id}/protokoll-status', auth: 'bearer', purpose: 'Protokollstatus einer BR-Sitzung lesen' },
  { method: 'GET', template: '/protokolle', auth: 'bearer', purpose: 'BR-Protokollübersicht lesen' },
  { method: 'GET', template: '/protokolle/{id}', auth: 'bearer', purpose: 'BR-Protokoll lesen' },
  { method: 'GET', template: '/protokolle/sitzung/{sitzungId}', auth: 'bearer', purpose: 'BR-Protokoll zu einer Sitzung lesen' },
  { method: 'GET', template: '/protokolle/{id}/beschluesse', auth: 'bearer', purpose: 'Beschlüsse eines BR-Protokolls lesen' },
  { method: 'GET', template: '/protokolle/beschluesse', auth: 'bearer', purpose: 'BR-Beschlüsse lesen' },
  { method: 'GET', template: '/protokolle/beschluesse/faellig', auth: 'bearer', purpose: 'Fällige BR-Beschlüsse lesen' },
  { method: 'GET', template: '/protokolle/beschluesse/ueberfaellig', auth: 'bearer', purpose: 'Überfällige BR-Beschlüsse lesen' },
  { method: 'GET', template: '/protokolle/beschluesse/statistik', auth: 'bearer', purpose: 'BR-Beschlussstatistik lesen' },
  { method: 'GET', template: '/protokolle/beschluesse/statistik-extended', auth: 'bearer', purpose: 'Erweiterte BR-Beschlussstatistik lesen' },
] as const;

function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\?.*$/, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function templateToRegex(template: string): RegExp {
  const escaped = escapeRegex(template).replace(/\\\{[^/]+\\\}/g, API_SEGMENT_PATTERN);
  return new RegExp(`^${escaped}$`);
}

export function findGremiaBrEndpointDefinition(method: string, path: string): GremiaBrEndpointDefinition | undefined {
  const normalizedMethod = method.trim().toUpperCase();
  const normalizedPath = normalizePath(path.trim());
  return GREMIA_BR_READ_API_CATALOG.find((definition) => {
    return definition.method === normalizedMethod && templateToRegex(definition.template).test(normalizedPath);
  });
}

export function toGremiaBrEndpointLabel(method: string, path: string): string {
  const definition = findGremiaBrEndpointDefinition(method, path);
  return `${method.trim().toUpperCase()} ${definition?.template ?? normalizePath(path.trim())}`;
}
