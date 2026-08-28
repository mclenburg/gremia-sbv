import { describe, expect, it } from 'vitest';
import { GremiaBrAuthService } from '../../../services/gremiaBr/gremiaBrAuthService';
import type { GremiaBrFetch } from '../../../services/gremiaBr/gremiaBrHttpClient';
import type { GremiaBrProfileSnapshot, GremiaBrServiceSettings, GremiaBrSettingsStore } from '../../../services/gremiaBr/gremiaBrTypes';

class MemorySettings implements GremiaBrSettingsStore {
  successfulProfile: GremiaBrProfileSnapshot | undefined;
  failures = 0;

  constructor(private readonly overrides: Partial<GremiaBrServiceSettings> = {}) {}

  getServiceSettings(): GremiaBrServiceSettings {
    return {
      enabled: true,
      serverUrl: 'https://br.example.invalid/api',
      username: 'sbv@example.invalid',
      password: 'streng-geheim',
      apiMode: 'legacy_read_bridge',
      ...this.overrides,
    };
  }

  markConnectionFailure(): void {
    this.failures += 1;
  }

  markSuccessfulConnection(_checkedAt: string, profile: GremiaBrProfileSnapshot): void {
    this.successfulProfile = profile;
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function fetchFor(routes: Record<string, unknown>): { fetch: GremiaBrFetch; calls: string[] } {
  const calls: string[] = [];
  const fetch: GremiaBrFetch = async (url, init) => {
    const parsed = new URL(url);
    const signature = `${init?.method ?? 'GET'} ${parsed.pathname}`;
    calls.push(signature);
    if (!(signature in routes)) return jsonResponse({ message: 'not found' }, 404);
    return jsonResponse(routes[signature]);
  };
  return { fetch, calls };
}

describe('Gremia.BR Auth-Profilvertrag 0.9.2-Q', () => {
  it('nutzt nach dem Sessioncheck das Profil als führende Quelle für Anzeigename und Rolle', async () => {
    const { fetch, calls } = fetchFor({
      'POST /api/auth/login': { access_token: 'jwt-token' },
      'GET /api/auth/me': { id: 'u1', email: 'sbv@example.invalid', displayName: 'Session Name' },
      'GET /api/auth/profile': { displayName: 'SBV Nutzerin', role: 'sbv', email: 'sbv@example.invalid' },
    });
    const settings = new MemorySettings();

    const result = await new GremiaBrAuthService(settings, fetch).testConnection();

    expect(result.status).toBe('ok');
    expect(result.profileDisplayName).toBe('SBV Nutzerin');
    expect(result.profileRole).toBe('sbv');
    expect(settings.successfulProfile).toMatchObject({ displayName: 'SBV Nutzerin', role: 'sbv' });
    expect(calls).toEqual(['POST /api/auth/login', 'GET /api/auth/me', 'GET /api/auth/profile']);
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
    expect(JSON.stringify(result)).not.toContain('jwt-token');
  });

  it('wertet auch gekapselte Profilantworten aus der neuen API-Struktur aus', async () => {
    const { fetch } = fetchFor({
      'POST /api/auth/login': { accessToken: 'jwt-token' },
      'GET /api/auth/me': { user: { email: 'sbv@example.invalid' } },
      'GET /api/auth/profile': { profile: { fullName: 'Vertrauensperson SBV', rolle: 'sbv' } },
    });

    const result = await new GremiaBrAuthService(new MemorySettings(), fetch).testConnection();

    expect(result.status).toBe('ok');
    expect(result.profileDisplayName).toBe('Vertrauensperson SBV');
    expect(result.profileRole).toBe('sbv');
  });

  it('nutzt für Gremia.BR 2.0 Login und Session der v1-API ohne Zugangsdaten im Ergebnis', async () => {
    const calls: Array<{ signature: string; cookie?: string; authorization?: string }> = [];
    const fetch: GremiaBrFetch = async (url, init) => {
      const parsed = new URL(url);
      const headers = init?.headers as Record<string, string> | undefined;
      calls.push({
        signature: `${init?.method ?? 'GET'} ${parsed.pathname}`,
        cookie: headers?.Cookie,
        authorization: headers?.Authorization,
      });
      if (parsed.pathname === '/api/v1/auth/login') {
        return new Response(JSON.stringify({ status: 'AUTHENTICATED' }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'sid=session-token; HttpOnly; Secure; SameSite=Strict' },
        });
      }
      if (parsed.pathname === '/api/v1/auth/session') {
        return jsonResponse({
          userId: 'user-1',
          username: 'sbv@example.invalid',
          displayName: 'SBV Vertrauensperson',
          roles: ['sbv'],
          authenticationLevel: 'PASSWORD',
          authenticatedAt: '2026-08-28T12:00:00.000Z',
          mfaEnrolled: false,
        });
      }
      return jsonResponse({ message: 'not found' }, 404);
    };

    const result = await new GremiaBrAuthService(new MemorySettings({
      apiMode: 'gremia_br_v2',
      serverUrl: 'https://br.example.invalid',
    }), fetch).testConnection();

    expect(result).toMatchObject({
      status: 'ok',
      profileDisplayName: 'SBV Vertrauensperson',
      profileRole: 'sbv',
    });
    expect(calls.map((call) => call.signature)).toEqual(['POST /api/v1/auth/login', 'GET /api/v1/auth/session']);
    expect(calls[1].cookie).toContain('sid=session-token');
    expect(calls.some((call) => call.authorization)).toBe(false);
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
    expect(JSON.stringify(result)).not.toContain('session-token');
  });
});
