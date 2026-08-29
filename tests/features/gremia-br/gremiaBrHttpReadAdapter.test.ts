import { describe, expect, it } from 'vitest';
import { GremiaBrAuthService } from '../../../services/gremiaBr/gremiaBrAuthService';
import { GremiaBrHttpClient } from '../../../services/gremiaBr/gremiaBrHttpClient';
import { GremiaBrHttpReadAdapter } from '../../../services/gremiaBr/gremiaBrHttpReadAdapter';
import type { GremiaBrFetch } from '../../../services/gremiaBr/gremiaBrHttpClient';
import type { GremiaBrProfileSnapshot, GremiaBrServiceSettings, GremiaBrSettingsStore } from '../../../services/gremiaBr/gremiaBrTypes';

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

  append(input: { action: string; subjectType: string; subjectId?: string; purpose: string; metadata?: Record<string, unknown> }): void {
    this.entries.push(input);
  }
}

function configuredSettings(): GremiaBrServiceSettings {
  return {
    enabled: true,
    serverUrl: 'https://br.example.invalid/api',
    username: 'sbv@example.invalid',
    password: 'streng-geheim',
    apiMode: 'legacy_read_bridge',
  };
}

function configuredV2Settings(): GremiaBrServiceSettings {
  return {
    enabled: true,
    serverUrl: 'https://br.example.invalid',
    username: 'sbv@example.invalid',
    password: 'streng-geheim',
    apiMode: 'gremia_br_v2',
    selectedBodyId: 'sbv-body',
    selectedBodyName: 'SBV Testbetrieb',
    selectedOrganizationId: 'org-1',
    selectedSecurityDomain: 'sd-sbv',
  };
}

describe('Gremia.BR HTTP-ReadAdapter 0.9.2-B', () => {
  it('meldet sich an, prüft das Profil und gibt keine Zugangsdaten im Ergebnis zurück', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/auth/login': { access_token: 'jwt-token' },
      'GET /api/auth/me': { id: 'u1', email: 'sbv@example.invalid' },
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
    const callSignatures = calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`);
    expect(callSignatures[0]).toBe('POST /api/auth/login');
    expect(callSignatures).toContain('GET /api/auth/profile');
    expect(callSignatures.every((signature) => ['POST /api/auth/login', 'GET /api/auth/me', 'GET /api/auth/profile'].includes(signature))).toBe(true);
    const authenticatedCalls = calls.slice(1);
    expect(authenticatedCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of authenticatedCalls) {
      expect(call.init?.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
    }
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

  it('nutzt im Gremia.BR-2.0-Modus den ausgewählten SBV-Arbeitsbereich statt Legacy-Endpunkte', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'v2-token' },
      'GET /api/v1/bodies/sbv-body/meetings': [
        { id: 'm1', bodyId: 'sbv-body', plannedStart: '2099-01-08T09:00:00.000Z', status: 'INVITED' },
        { id: 'm2', bodyId: 'sbv-body', plannedStart: '2099-01-15T09:00:00.000Z', status: 'MINUTES_DRAFT' },
      ],
      'GET /api/v1/meetings/m1/agenda': { id: 'agenda-1', items: [{ id: 'a1', title: 'BEM-Unterrichtung' }] },
      'GET /api/v1/meetings/m1/minutes': { id: 'minutes-1', meetingId: 'm1', contentComplete: true },
      'GET /api/v1/meetings/m1/decisions': [{ id: 'd1', meetingId: 'm1', text: 'BEM-Beschluss' }],
      'GET /api/v1/meetings/m2/decisions': [{ id: 'd2', meetingId: 'm2', text: 'Arbeitsplatzgestaltung' }],
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredV2Settings()), fetch));

    await expect(adapter.getNextMeeting()).resolves.toMatchObject({ id: 'm1' });
    await expect(adapter.getMeetingAgenda('m1')).resolves.toEqual([{ id: 'a1', title: 'BEM-Unterrichtung' }]);
    await expect(adapter.getProtocolByMeeting('m1')).resolves.toMatchObject({ id: 'minutes-1' });
    await expect(adapter.listRelevantDecisions()).resolves.toHaveLength(2);
    await expect(adapter.searchDecisions('Arbeitsplatz')).resolves.toEqual([{ id: 'd2', meetingId: 'm2', text: 'Arbeitsplatzgestaltung' }]);

    const callSignatures = calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`);
    expect(callSignatures).toContain('GET /api/v1/bodies/sbv-body/meetings');
    expect(callSignatures).toContain('GET /api/v1/meetings/m1/agenda');
    expect(callSignatures).toContain('GET /api/v1/meetings/m1/minutes');
    expect(callSignatures).toContain('GET /api/v1/meetings/m1/decisions');
    expect(callSignatures).not.toContain('GET /api/sitzungen/kommende');
    expect(callSignatures).not.toContain('GET /api/protokolle/beschluesse');
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

  it('überträgt FormData für explizite Gremia.BR-Arbeitsbereichsaktionen ohne JSON-Content-Type und auditiert als Export', async () => {
    const audit = new MemoryAuditLog();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch: GremiaBrFetch = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ id: 'remote-document-1', latestVersionId: 'version-1' });
    };
    const formData = new FormData();
    formData.append('title', 'Fallzusammenfassung');
    formData.append('file', new Blob([new Uint8Array([37, 80, 68, 70])], { type: 'application/pdf' }), 'fall.pdf');
    const client = new GremiaBrHttpClient('https://br.example.invalid', fetch, audit);

    const result = await client.request<{ id: string }>('POST', '/api/v1/documents', 'jwt-token', {
      query: { securityDomain: 'sd-sbv', organizationId: 'org-1' },
      formData,
    });

    expect(result).toMatchObject({ id: 'remote-document-1' });
    expect(calls).toHaveLength(1);
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-token');
    expect(headers['Content-Type']).toBeUndefined();
    expect(calls[0]?.init?.body).toBe(formData);
    expect(new URL(calls[0]!.url).searchParams.get('securityDomain')).toBe('sd-sbv');
    expect(audit.entries[0]).toMatchObject({
      action: 'export',
      subjectType: 'gremia_br_http_request',
      subjectId: 'POST /api/v1/documents',
    });
    expect(JSON.stringify(audit.entries[0])).not.toContain('Fallzusammenfassung');
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
