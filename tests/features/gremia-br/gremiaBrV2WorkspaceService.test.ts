import { describe, expect, it } from 'vitest';
import { GremiaBrAuthService } from '../../../services/gremiaBr/gremiaBrAuthService';
import { GremiaBrV2WorkspaceService } from '../../../services/gremiaBr/gremiaBrV2WorkspaceService';
import type { GremiaBrFetch } from '../../../services/gremiaBr/gremiaBrHttpClient';
import type { GremiaBrProfileSnapshot, GremiaBrServiceSettings, GremiaBrSettingsStore } from '../../../services/gremiaBr/gremiaBrTypes';

class MemorySettings implements GremiaBrSettingsStore {
  getServiceSettings(): GremiaBrServiceSettings {
    return {
      enabled: true,
      serverUrl: 'https://br.example.invalid',
      username: 'sbv@example.invalid',
      password: 'streng-geheim',
      apiMode: 'gremia_br_v2',
    };
  }

  markConnectionFailure(): void {}
  markSuccessfulConnection(_checkedAt: string, _profile: GremiaBrProfileSnapshot): void {}
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Gremia.BR 2.0 SBV-Arbeitsbereich', () => {
  it('listet nur berechtigte SBV-Gremien als fachliche Arbeitsbereiche und reichert die Sicherheitsdomäne an', async () => {
    const calls: string[] = [];
    const fetch: GremiaBrFetch = async (url, init) => {
      const parsed = new URL(url);
      calls.push(`${init?.method ?? 'GET'} ${parsed.pathname}`);
      if (parsed.pathname === '/api/v1/auth/login') {
        return new Response(JSON.stringify({ status: 'AUTHENTICATED' }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'sid=session-token; HttpOnly; Secure' },
        });
      }
      if (parsed.pathname === '/api/v1/me/bodies') {
        return jsonResponse([
          { bodyId: 'sbv-body', bodyName: 'Schwerbehindertenvertretung Werk Rostock', bodyType: 'SEVERELY_DISABLED_REPRESENTATION', organizationId: 'org-1', holdsSeat: true },
          { bodyId: 'br-body', bodyName: 'Betriebsrat Werk Rostock', bodyType: 'WORKS_COUNCIL', organizationId: 'org-1', holdsSeat: true },
          { bodyId: 'sbv-queue', bodyName: 'SBV Ersatzliste', bodyType: 'SEVERELY_DISABLED_REPRESENTATION', organizationId: 'org-1', holdsSeat: false },
        ]);
      }
      if (parsed.pathname === '/api/v1/bodies/sbv-body') {
        return jsonResponse({ id: 'sbv-body', securityDomain: 'sbv-werk-rostock', contentProtectionClass: 'HIGH' });
      }
      return jsonResponse({ message: 'not found' }, 404);
    };

    const bodies = await new GremiaBrV2WorkspaceService(new GremiaBrAuthService(new MemorySettings(), fetch)).listSbvWorkspaceBodies();

    expect(bodies).toEqual([{
      bodyId: 'sbv-body',
      bodyName: 'Schwerbehindertenvertretung Werk Rostock',
      bodyType: 'SEVERELY_DISABLED_REPRESENTATION',
      organizationId: 'org-1',
      securityDomain: 'sbv-werk-rostock',
      contentProtectionClass: 'HIGH',
      termValidUntil: undefined,
    }]);
    expect(calls).toEqual(['POST /api/v1/auth/login', 'GET /api/v1/me/bodies', 'GET /api/v1/bodies/sbv-body']);
  });
});
