export type GremiaBrEndpointAuthMode = 'anonymous' | 'bearer';

export interface GremiaBrEndpointDefinition {
  method: 'GET' | 'POST';
  template: string;
  auth: GremiaBrEndpointAuthMode;
  purpose: string;
  category: 'auth' | 'read_context' | 'workspace_action';
}

const API_SEGMENT_PATTERN = '[^/?#]+';

export const GREMIA_BR_API_CATALOG: readonly GremiaBrEndpointDefinition[] = [
  { method: 'POST', template: '/api/v1/auth/login', auth: 'anonymous', category: 'auth', purpose: 'Gremia.BR-2.0-Session für explizite Nutzeraktion öffnen' },
  { method: 'GET', template: '/api/v1/auth/session', auth: 'bearer', category: 'read_context', purpose: 'Gremia.BR-2.0-Sessionstatus prüfen' },
  { method: 'GET', template: '/api/v1/me/bodies', auth: 'bearer', category: 'read_context', purpose: 'Eigene berechtigte Gremien in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/bodies/{bodyId}', auth: 'bearer', category: 'read_context', purpose: 'Berechtigtes Gremium in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/bodies/{bodyId}/meetings', auth: 'bearer', category: 'read_context', purpose: 'Sitzungen eines berechtigten Gremiums in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}', auth: 'bearer', category: 'read_context', purpose: 'Sitzungsdetails in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}/agenda', auth: 'bearer', category: 'read_context', purpose: 'Tagesordnung in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}/agenda/versions', auth: 'bearer', category: 'read_context', purpose: 'Tagesordnungsversionen in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}/remote-access', auth: 'bearer', category: 'read_context', purpose: 'Geschützten Remote-Zugang nach ausdrücklicher Nutzeraktion lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}/decisions', auth: 'bearer', category: 'read_context', purpose: 'Beschlüsse einer Sitzung in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/decisions/{decisionId}', auth: 'bearer', category: 'read_context', purpose: 'Beschlussdetails in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/meetings/{meetingId}/minutes', auth: 'bearer', category: 'read_context', purpose: 'Protokoll einer Sitzung in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/documents', auth: 'bearer', category: 'read_context', purpose: 'Dokumente eines ausdrücklich gewählten Sicherheitsbereichs in Gremia.BR 2.0 lesen' },
  { method: 'POST', template: '/api/v1/documents/search', auth: 'bearer', category: 'read_context', purpose: 'Dokumente in einem ausdrücklich gewählten Sicherheitsbereich in Gremia.BR 2.0 suchen' },
  { method: 'GET', template: '/api/v1/documents/{documentId}', auth: 'bearer', category: 'read_context', purpose: 'Dokumentmetadaten in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/documents/{documentId}/versions', auth: 'bearer', category: 'read_context', purpose: 'Dokumentversionen in Gremia.BR 2.0 lesen' },
  { method: 'GET', template: '/api/v1/documents/{documentId}/shares', auth: 'bearer', category: 'read_context', purpose: 'Freigaben eines bewusst ausgewählten Dokuments lesen' },
  { method: 'GET', template: '/api/v1/documents/versions/{documentVersionId}/content', auth: 'bearer', category: 'read_context', purpose: 'Dokumentversion nach expliziter Nutzeraktion aus Gremia.BR 2.0 laden' },
  { method: 'GET', template: '/api/v1/cases', auth: 'bearer', category: 'read_context', purpose: 'Berechtigte Sachverhalte für die bewusste Verfahrensauswahl lesen' },
  { method: 'GET', template: '/api/v1/procedures/{procedureId}', auth: 'bearer', category: 'read_context', purpose: 'Details eines ausdrücklich gewählten zugänglichen Verfahrens lesen' },
  { method: 'GET', template: '/api/v1/procedures/{procedureId}/information-requests', auth: 'bearer', category: 'read_context', purpose: 'Informationsanforderungen eines bewusst gewählten verknüpften Verfahrens lesen' },
  { method: 'GET', template: '/api/v1/tasks', auth: 'bearer', category: 'read_context', purpose: 'Eigene offene Aufgaben nach bewusstem Gesamtabruf lesen' },
  { method: 'GET', template: '/api/v1/tasks/{taskId}', auth: 'bearer', category: 'read_context', purpose: 'Eigene Aufgabendetails nach ausdrücklicher Auswahl lesen' },
  { method: 'GET', template: '/api/v1/tasks/{taskId}/transitions', auth: 'bearer', category: 'read_context', purpose: 'Mögliche Statusänderungen einer eigenen Aufgabe bewusst abrufen' },
  { method: 'POST', template: '/api/v1/procedures/tasks/{taskId}/transitions', auth: 'bearer', category: 'workspace_action', purpose: 'Status einer eigenen Aufgabe nach ausdrücklicher Bestätigung ändern' },
  { method: 'GET', template: '/api/v1/access-approvals/mine', auth: 'bearer', category: 'read_context', purpose: 'Status eigener Zugriffsanträge nach bewusstem Gesamtabruf lesen' },
  { method: 'POST', template: '/api/v1/documents', auth: 'bearer', category: 'workspace_action', purpose: 'Von Gremia.SBV erzeugtes PDF in den ausgewählten SBV-Arbeitsbereich übertragen' },
  { method: 'POST', template: '/api/v1/documents/{documentId}/shares', auth: 'bearer', category: 'workspace_action', purpose: 'Von der SBV bewusst ausgelöste Dokumentfreigabe an BR oder anderes Gremium' },
  { method: 'POST', template: '/api/v1/documents/{documentId}/links', auth: 'bearer', category: 'workspace_action', purpose: 'Übertragenes PDF fachlich mit dem SBV-Gremium verknüpfen' },
  { method: 'POST', template: '/api/v1/documents/shares/{shareId}/revocation', auth: 'bearer', category: 'workspace_action', purpose: 'Von der SBV ausgelöste Freigabe widerrufen' },
  { method: 'POST', template: '/api/v1/meetings/{meetingId}/agenda', auth: 'bearer', category: 'workspace_action', purpose: 'SBV-Thema als bewusste Agenda-Anforderung an eine Gremia.BR-Sitzung übergeben' },
  { method: 'POST', template: '/api/v1/procedures/{procedureId}/information-requests', auth: 'bearer', category: 'workspace_action', purpose: 'Fehlende Informationen zu einem Gremia.BR-Verfahren anfordern' },
  { method: 'POST', template: '/api/v1/procedures/information-requests/{requestId}/resolve', auth: 'bearer', category: 'workspace_action', purpose: 'Informationsanforderung nach ausdrücklicher Bestätigung abschließen' },
  { method: 'POST', template: '/api/v1/procedures/{procedureId}/tasks', auth: 'bearer', category: 'workspace_action', purpose: 'Eigene Aufgabe im ausdrücklich verknüpften Verfahren anlegen' },
] as const;

export const GREMIA_BR_READ_API_CATALOG = GREMIA_BR_API_CATALOG
  .filter((endpoint) => endpoint.category !== 'workspace_action');

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
  return GREMIA_BR_API_CATALOG.find((definition) => {
    return definition.method === normalizedMethod && templateToRegex(definition.template).test(normalizedPath);
  });
}

export function toGremiaBrEndpointLabel(method: string, path: string): string {
  const definition = findGremiaBrEndpointDefinition(method, path);
  return `${method.trim().toUpperCase()} ${definition?.template ?? normalizePath(path.trim())}`;
}
