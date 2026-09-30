import { describe, expect, it } from 'vitest';
import { GREMIA_BR_API_CATALOG, GREMIA_BR_READ_API_CATALOG, findGremiaBrEndpointDefinition, toGremiaBrEndpointLabel } from '../../../services/gremiaBr/gremiaBrApiCatalog';
import { checkGremiaBrEndpoint, isGremiaBrReadOnlyEndpoint, isGremiaBrWorkspaceActionEndpoint } from '../../../services/gremiaBr/gremiaBrPolicy';

describe('Gremia.BR API-Katalog 0.9.2-G', () => {
  it('zentralisiert lesende oder technische Auth-Endpunkte ohne Arbeitsbereichsaktionen', () => {
    expect(GREMIA_BR_READ_API_CATALOG.length).toBeGreaterThan(10);
    for (const endpoint of GREMIA_BR_READ_API_CATALOG) {
      expect(['GET', 'POST']).toContain(endpoint.method);
      if (endpoint.method === 'POST') {
        expect(['/api/v1/auth/login', '/api/v1/documents/search']).toContain(endpoint.template);
      }
      expect(endpoint.template).not.toMatch(/^\/(admin|dsgvo|mitglieder|abwesenheiten|ausschuesse|files|upload-links|public-upload|agenda)\b/);
      expect(checkGremiaBrEndpoint(endpoint.method, endpoint.template).allowed).toBe(true);
      expect(isGremiaBrReadOnlyEndpoint(endpoint.method, endpoint.template)).toBe(true);
    }
  });

  it('gibt Gremia.BR-2.0-Arbeitsbereichsaktionen nur ausdrücklich und kategorial frei', () => {
    const workspaceActions = GREMIA_BR_API_CATALOG.filter((endpoint) => endpoint.category === 'workspace_action');

    expect(workspaceActions.map((endpoint) => `${endpoint.method} ${endpoint.template}`)).toEqual([
      'POST /api/v1/procedures/tasks/{taskId}/transitions',
      'POST /api/v1/documents',
      'POST /api/v1/documents/{documentId}/shares',
      'POST /api/v1/documents/{documentId}/links',
      'POST /api/v1/documents/shares/{shareId}/revocation',
      'POST /api/v1/meetings/{meetingId}/agenda',
      'POST /api/v1/procedures/{procedureId}/information-requests',
      'POST /api/v1/procedures/information-requests/{requestId}/resolve',
      'POST /api/v1/procedures/{procedureId}/tasks',
    ]);
    for (const endpoint of workspaceActions) {
      expect(checkGremiaBrEndpoint(endpoint.method, endpoint.template).allowed).toBe(true);
      expect(isGremiaBrWorkspaceActionEndpoint(endpoint.method, endpoint.template)).toBe(true);
      expect(isGremiaBrReadOnlyEndpoint(endpoint.method, endpoint.template)).toBe(false);
    }
  });

  it('ordnet konkrete Pfade stabil dem Template zu und verhindert Audit-Leakage konkreter IDs', () => {
    expect(findGremiaBrEndpointDefinition('GET', '/api/v1/meetings/meeting-1/agenda')?.template).toBe('/api/v1/meetings/{meetingId}/agenda');
    expect(toGremiaBrEndpointLabel('GET', '/api/v1/meetings/meeting-1/remote-access')).toBe('GET /api/v1/meetings/{meetingId}/remote-access');
    expect(toGremiaBrEndpointLabel('GET', '/api/v1/documents/document-1/versions')).toBe('GET /api/v1/documents/{documentId}/versions');
    expect(toGremiaBrEndpointLabel('POST', '/api/v1/procedures/tasks/task-1/transitions')).toBe('POST /api/v1/procedures/tasks/{taskId}/transitions');
  });

  it('blockiert Schreib-, Verwaltungs- und personenbezogene Massendatenpfade', () => {
    for (const [method, path] of [
      ['POST', '/auth/refresh'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/admin/health'],
      ['GET', '/dokumente'],
      ['POST', '/api/v1/documents/document-1/transfer'],
      ['POST', '/api/v1/documents/shares/share-1/approval'],
      ['POST', '/protokolle/beschluesse'],
      ['PATCH', '/sitzungen/s1/agenda'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(false);
    }
  });

  it('gibt keine Endpunkte einer unveröffentlichten älteren API frei', () => {
    for (const [method, path] of [
      ['POST', '/auth/login'],
      ['GET', '/auth/me'],
      ['GET', '/sitzungen/kommende'],
      ['GET', '/protokolle/beschluesse'],
      ['GET', '/search/suggest'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(false);
    }
  });

  it('erlaubt in Gremia.BR 2.0 nur technische Anmeldung und lesenden Gremien-/Dokumentenkontext', () => {
    for (const [method, path] of [
      ['POST', '/api/v1/auth/login'],
      ['GET', '/api/v1/auth/session'],
      ['GET', '/api/v1/me/bodies'],
      ['GET', '/api/v1/bodies/body-1/meetings'],
      ['GET', '/api/v1/meetings/meeting-1'],
      ['GET', '/api/v1/meetings/meeting-1/agenda'],
      ['GET', '/api/v1/meetings/meeting-1/decisions'],
      ['GET', '/api/v1/meetings/meeting-1/minutes'],
      ['GET', '/api/v1/documents'],
      ['POST', '/api/v1/documents/search'],
      ['GET', '/api/v1/documents/document-1'],
      ['GET', '/api/v1/documents/document-1/versions'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(true);
    }
  });

  it('erlaubt in Gremia.BR 2.0 bewusst ausgelöste Workspace-Aktionen ohne globale Admin- oder Massendatenpfade', () => {
    for (const [method, path] of [
      ['POST', '/api/v1/documents'],
      ['POST', '/api/v1/documents/document-1/shares'],
      ['POST', '/api/v1/documents/document-1/links'],
      ['POST', '/api/v1/documents/shares/share-1/revocation'],
      ['POST', '/api/v1/meetings/meeting-1/agenda'],
      ['POST', '/api/v1/procedures/procedure-1/information-requests'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(true);
      expect(isGremiaBrWorkspaceActionEndpoint(method, path), `${method} ${path}`).toBe(true);
    }
  });
});
