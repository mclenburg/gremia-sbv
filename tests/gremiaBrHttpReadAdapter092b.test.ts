import { describe, expect, it } from 'vitest';
import { GremiaBrAuthService } from '../services/gremiaBr/gremiaBrAuthService';
import { GremiaBrHttpClient } from '../services/gremiaBr/gremiaBrHttpClient';
import { GremiaBrHttpReadAdapter } from '../services/gremiaBr/gremiaBrHttpReadAdapter';
import type { GremiaBrFetch } from '../services/gremiaBr/gremiaBrHttpClient';
import type { GremiaBrProfileSnapshot, GremiaBrServiceSettings, GremiaBrSettingsStore } from '../services/gremiaBr/gremiaBrTypes';

class MemoryGremiaBrSettings implements GremiaBrSettingsStore {
  failures = 0;
  success: { checkedAt: string; profile: GremiaBrProfileSnapshot } | undefined;

  constructor(private readonly settings: GremiaBrServiceSettings) {}

  getServiceSettings(): GremiaBrServiceSettings {
    return this.settings;
  }

  markConnectionFailure(): void {
    this.failures += 1;
  }

  markSuccessfulConnection(checkedAt: string, profile: GremiaBrProfileSnapshot): void {
    this.success = { checkedAt, profile };
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createFetch(routes: Record<string, unknown>): { fetch: GremiaBrFetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetch: GremiaBrFetch = async (url, init) => {
    calls.push({ url, init });
    const parsed = new URL(url);
    const routeKey = `${init?.method ?? 'GET'} ${parsed.pathname}`;
    if (!(routeKey in routes)) return jsonResponse({ message: 'not found' }, 404);
    return jsonResponse(routes[routeKey]);
  };
  return { fetch, calls };
}


class MemoryAuditLog {
  entries: Array<{ action: string; subjectType: string; subjectId?: string; purpose: string; metadata?: Record<string, unknown> }> = [];

  append(input: any): void {
    this.entries.push(input);
  }
}

function configuredSettings(): GremiaBrServiceSettings {
  return {
    enabled: true,
    serverUrl: 'https://br.example.invalid/api',
    username: 'sbv@example.invalid',
    password: 'streng-geheim',
  };
}

describe('Gremia.BR HTTP-ReadAdapter 0.9.2-B', () => {
  it('meldet sich an, prüft das Profil und gibt keine Zugangsdaten im Ergebnis zurück', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/auth/login': { access_token: 'jwt-token' },
      'GET /api/auth/profile': { displayName: 'SBV Nutzerin', role: 'sbv', email: 'sbv@example.invalid' },
    });
    const settings = new MemoryGremiaBrSettings(configuredSettings());
    const auth = new GremiaBrAuthService(settings, fetch);

    const result = await auth.testConnection();

    expect(result.status).toBe('ok');
    expect(result.profileDisplayName).toBe('SBV Nutzerin');
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
    expect(JSON.stringify(result)).not.toContain('jwt-token');
    expect(settings.success?.profile.role).toBe('sbv');
    expect(calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`)).toEqual([
      'POST /api/auth/login',
      'GET /api/auth/profile',
    ]);
    expect(calls[1].init?.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
  });

  it('nutzt ausschließlich freigegebene lesende Endpunkte für Sitzungen, Beschlüsse und Suche', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/auth/login': { token: 'jwt-token' },
      'GET /api/sitzungen/naechste': { id: 's1', titel: 'BR-Sitzung' },
      'GET /api/sitzungen/kommende': [{ id: 's1' }],
      'GET /api/sitzungen/s1/agenda': [{ id: 'a1', titel: 'BEM' }],
      'GET /api/protokolle/beschluesse': [{ id: 'b1', titel: 'BEM-Beschluss' }],
      'GET /api/protokolle/beschluesse/faellig': [{ id: 'b2', titel: 'Fällig' }],
      'GET /api/protokolle/beschluesse/ueberfaellig': [{ id: 'b4', titel: 'Überfällig' }],
      'GET /api/search': { results: [{ id: 'b3', type: 'beschluss', titel: 'Arbeitsplatzgestaltung' }] },
      'GET /api/search/suggest': [{ value: 'BEM', label: 'BEM-Beschluss', type: 'beschluss' }],
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredSettings()), fetch));

    expect(await adapter.getNextMeeting()).toMatchObject({ id: 's1' });
    expect(await adapter.getUpcomingMeetings()).toHaveLength(1);
    expect(await adapter.getMeetingAgenda('s1')).toHaveLength(1);
    expect(await adapter.listRelevantDecisions()).toHaveLength(1);
    expect(await adapter.getDueDecisions()).toHaveLength(1);
    expect(await adapter.getOverdueDecisions()).toHaveLength(1);
    expect(await adapter.searchDecisions('BEM')).toHaveLength(1);
    expect(await adapter.suggestForInlineCommand('BE')).toHaveLength(1);

    expect(calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`)).not.toContain('POST /api/protokolle/beschluesse');
    expect(calls.every((call) => {
      const method = String(call.init?.method ?? 'GET');
      return method === 'GET' || new URL(call.url).pathname === '/api/auth/login';
    })).toBe(true);
  });

  it('protokolliert jede freigegebene HTTP-Leseanfrage im Audit-Log ohne Inhalte', async () => {
    const { fetch } = createFetch({
      'GET /api/sitzungen/kommende': [{ id: 's1', titel: 'BR-Sitzung' }],
    });
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid/api', fetch, audit);

    await client.request('GET', '/sitzungen/kommende', 'jwt-token', { query: { q: 'BEM', limit: 5 } });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'read',
      subjectType: 'gremia_br_http_request',
      subjectId: 'GET /sitzungen/kommende',
    });
    expect(audit.entries[0].metadata).toMatchObject({ endpoint: 'GET /sitzungen/kommende', outcome: 'ok', status: 200 });
    expect(JSON.stringify(audit.entries[0])).not.toContain('BEM');
    expect(JSON.stringify(audit.entries[0])).not.toContain('jwt-token');
  });

  it('blockiert Endpunkte außerhalb der Gremia.SBV-Whitelist vor dem Netzwerkzugriff', async () => {
    const calls: string[] = [];
    const fetch: GremiaBrFetch = async (url, init) => {
      calls.push(`${init?.method} ${url}`);
      return jsonResponse({});
    };
    const client = new GremiaBrHttpClient('https://br.example.invalid/api', fetch);

    await expect(client.request('GET', '/admin/health', 'jwt-token')).rejects.toThrow(/gesperrt|freigegeben/);
    await expect(client.request('POST', '/protokolle/beschluesse', 'jwt-token', { body: {} })).rejects.toThrow(/freigegeben/);
    expect(calls).toHaveLength(0);
  });

  it('meldet fehlende oder falsche Gremia.BR-Anmeldung ohne Secret-Leakage', async () => {
    const { fetch } = createFetch({
      'POST /api/auth/login': { message: 'ok aber ohne token' },
    });
    const auth = new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredSettings()), fetch);

    const result = await auth.testConnection();

    expect(result.status).toBe('failed');
    expect(result.message).toMatch(/Token|Zugriffstoken/i);
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
  });
});
