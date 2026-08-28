import { describe, expect, it } from 'vitest';
import { GREMIA_BR_READ_API_CATALOG, findGremiaBrEndpointDefinition, toGremiaBrEndpointLabel } from '../../../services/gremiaBr/gremiaBrApiCatalog';
import { checkGremiaBrEndpoint } from '../../../services/gremiaBr/gremiaBrPolicy';

describe('Gremia.BR API-Katalog 0.9.2-G', () => {
  it('zentralisiert ausschließlich lesende oder technische Auth-Endpunkte', () => {
    expect(GREMIA_BR_READ_API_CATALOG.length).toBeGreaterThan(10);
    for (const endpoint of GREMIA_BR_READ_API_CATALOG) {
      expect(['GET', 'POST']).toContain(endpoint.method);
      if (endpoint.method === 'POST') {
        expect(['/auth/login', '/api/v1/auth/login', '/api/v1/documents/search']).toContain(endpoint.template);
      }
      expect(endpoint.template).not.toMatch(/^\/(admin|dsgvo|mitglieder|abwesenheiten|ausschuesse|files|upload-links|public-upload|agenda)\b/);
      expect(checkGremiaBrEndpoint(endpoint.method, endpoint.template).allowed).toBe(true);
    }
  });

  it('ordnet konkrete Pfade stabil dem Template zu und verhindert Audit-Leakage konkreter IDs', () => {
    expect(findGremiaBrEndpointDefinition('GET', '/sitzungen/abc-123/agenda')?.template).toBe('/sitzungen/{id}/agenda');
    expect(findGremiaBrEndpointDefinition('GET', '/protokolle/sitzung/sitzung-1')?.template).toBe('/protokolle/sitzung/{sitzungId}');
    expect(findGremiaBrEndpointDefinition('GET', '/api/v1/meetings/meeting-1/agenda')?.template).toBe('/api/v1/meetings/{meetingId}/agenda');
    expect(toGremiaBrEndpointLabel('GET', '/protokolle/protokoll-1/beschluesse')).toBe('GET /protokolle/{id}/beschluesse');
    expect(toGremiaBrEndpointLabel('GET', '/api/v1/documents/document-1/versions')).toBe('GET /api/v1/documents/{documentId}/versions');
  });

  it('blockiert Schreib-, Verwaltungs- und personenbezogene Massendatenpfade', () => {
    for (const [method, path] of [
      ['POST', '/auth/refresh'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/admin/health'],
      ['GET', '/dokumente'],
      ['POST', '/api/v1/documents'],
      ['POST', '/api/v1/documents/document-1/shares'],
      ['POST', '/api/v1/documents/shares/share-1/revocation'],
      ['POST', '/api/v1/documents/document-1/transfer'],
      ['POST', '/protokolle/beschluesse'],
      ['PATCH', '/sitzungen/s1/agenda'],
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
});
