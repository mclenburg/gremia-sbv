import { describe, expect, it } from 'vitest';
import { GREMIA_BR_READ_API_CATALOG, findGremiaBrEndpointDefinition, toGremiaBrEndpointLabel } from '../services/gremiaBr/gremiaBrApiCatalog';
import { checkGremiaBrEndpoint } from '../services/gremiaBr/gremiaBrPolicy';

describe('Gremia.BR API-Katalog 0.9.2-G', () => {
  it('zentralisiert ausschließlich lesende oder technische Auth-Endpunkte', () => {
    expect(GREMIA_BR_READ_API_CATALOG.length).toBeGreaterThan(10);
    for (const endpoint of GREMIA_BR_READ_API_CATALOG) {
      expect(['GET', 'POST']).toContain(endpoint.method);
      if (endpoint.method === 'POST') expect(endpoint.template).toBe('/auth/login');
      expect(endpoint.template).not.toMatch(/^\/(admin|dsgvo|mitglieder|abwesenheiten|ausschuesse|files|upload-links|public-upload|agenda)\b/);
      expect(checkGremiaBrEndpoint(endpoint.method, endpoint.template).allowed).toBe(true);
    }
  });

  it('ordnet konkrete Pfade stabil dem Template zu und verhindert Audit-Leakage konkreter IDs', () => {
    expect(findGremiaBrEndpointDefinition('GET', '/sitzungen/abc-123/agenda')?.template).toBe('/sitzungen/{id}/agenda');
    expect(findGremiaBrEndpointDefinition('GET', '/protokolle/sitzung/sitzung-1')?.template).toBe('/protokolle/sitzung/{sitzungId}');
    expect(toGremiaBrEndpointLabel('GET', '/protokolle/protokoll-1/beschluesse')).toBe('GET /protokolle/{id}/beschluesse');
  });

  it('blockiert Schreib-, Verwaltungs- und personenbezogene Massendatenpfade', () => {
    for (const [method, path] of [
      ['POST', '/auth/refresh'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/admin/health'],
      ['GET', '/dokumente'],
      ['POST', '/protokolle/beschluesse'],
      ['PATCH', '/sitzungen/s1/agenda'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(false);
    }
  });
});
