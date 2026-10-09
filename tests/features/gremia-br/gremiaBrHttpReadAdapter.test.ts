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

const auditFactory = () => new MemoryAuditLog();

function configuredSettings(): GremiaBrServiceSettings {
  return {
    enabled: true,
    serverUrl: 'https://br.example.invalid',
    username: 'sbv@example.invalid',
    password: 'streng-geheim',
    apiMode: 'gremia_br_v2',
    selectedBodyId: 'sbv-body',
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
  it('liest nur berechtigte Sachverhalte und minimiert die Daten für die Verfahrensauswahl', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/cases': { items: [{
        id: 'case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung',
        procedureIds: ['procedure-1'], description: 'Vertraulicher Volltext',
      }], total: 1 },
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    const cases = await adapter.listAccessibleCases();

    expect(cases).toEqual([{ id: 'case-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }]);
    expect(calls.some((call) => new URL(call.url).pathname === '/api/v1/cases')).toBe(true);
    expect(JSON.stringify(cases)).not.toContain('Vertraulicher Volltext');
  });

  it('liest Aufgabendetails erst auf expliziten Aufruf und übernimmt nur fachlich nötige Felder', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/tasks/task-1': {
        id: 'task-1', title: 'Stellungnahme prüfen', status: 'OPEN', version: 3,
        description: 'Vertraulicher Aufgabentext', subjectType: 'PROCEDURE',
        securityDomain: 'SBV', assignments: [{ reference: 'person-1' }],
      },
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    expect(calls).toHaveLength(0);
    expect(await adapter.getOwnTaskDetail('task-1')).toEqual({
      id: 'task-1', title: 'Stellungnahme prüfen', status: 'OPEN', version: 3,
      description: 'Vertraulicher Aufgabentext', subjectType: 'PROCEDURE',
    });
    expect(calls.some((call) => new URL(call.url).pathname === '/api/v1/tasks/task-1')).toBe(true);
  });

  it('verwirft einen unbekannten Aufgabenstatus statt einen technischen Status anzuzeigen', async () => {
    const { fetch } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/tasks': { items: [{ id: 'task-1', title: 'Prüfung', status: 'SERVER_INTERNAL' }], total: 1 },
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    await expect(adapter.listOwnTasks()).rejects.toThrow('nicht unterstützte Aufgabe');
  });

  it('liest den Status aller eigenen Zugriffsanträge ohne weitere Antragsdetails', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/access-approvals/mine': [
        { id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING', requestedAt: '2026-10-01T10:00:00.000Z', purpose: 'Vertrauliche Begründung', requestedBy: 'person-1' },
        { id: 'approval-2', resourceType: 'DOCUMENT', status: 'APPROVED', requestedAt: '2026-09-30T10:00:00.000Z' },
      ],
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    const approvals = await adapter.listOwnAccessApprovals();

    expect(approvals).toEqual([
      { id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING', requestedAt: '2026-10-01T10:00:00.000Z' },
      { id: 'approval-2', resourceType: 'DOCUMENT', status: 'APPROVED', requestedAt: '2026-09-30T10:00:00.000Z' },
    ]);
    expect(calls.some((call) => new URL(call.url).pathname === '/api/v1/access-approvals/mine')).toBe(true);
    expect(JSON.stringify(approvals)).not.toContain('Vertrauliche Begründung');
  });

  it('verwirft unbekannte Zugriffsantragsstatus vor dem Ersetzen des Arbeitsstands', async () => {
    const { fetch } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/access-approvals/mine': [
        { id: 'approval-1', resourceType: 'DOCUMENT', status: 'SERVER_INTERNAL', requestedAt: '2026-10-01T10:00:00.000Z' },
      ],
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    await expect(adapter.listOwnAccessApprovals()).rejects.toThrow('nicht unterstützten Zugriffsantragsstatus');
  });

  it('liest nur eigene offene V2-Aufgaben und übernimmt keine Beschreibungen in den Arbeitsstand', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'token' },
      'GET /api/v1/tasks': {
        items: [{
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Stellungnahme prüfen',
          description: 'Vertraulicher Volltext',
          status: 'OPEN',
          dueAt: '2026-10-01T10:00:00.000Z',
          subjectType: 'PROCEDURE',
          subjectId: '22222222-2222-4222-8222-222222222222',
          assignments: [{ kind: 'PERSON', reference: 'person-1', role: 'RESPONSIBLE' }],
        }],
        total: 1,
      },
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    const tasks = await adapter.listOwnTasks();

    expect(tasks).toEqual([{
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Stellungnahme prüfen',
      status: 'OPEN',
      dueAt: '2026-10-01T10:00:00.000Z',
      subjectType: 'PROCEDURE',
      subjectId: '22222222-2222-4222-8222-222222222222',
    }]);
    const taskCall = calls.find((call) => new URL(call.url).pathname === '/api/v1/tasks');
    expect(taskCall).toBeDefined();
    expect(new URL(taskCall!.url).searchParams.get('mine')).toBe('true');
    expect(new URL(taskCall!.url).searchParams.getAll('status')).toEqual(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_EXTERNAL', 'QUESTION']);
    expect(JSON.stringify(tasks)).not.toContain('Vertraulicher Volltext');
  });

  it('liest weitere Aufgabenseiten auch dann vollständig, wenn der Server eine kleinere Seite liefert', async () => {
    const offsets: string[] = [];
    const fetch: GremiaBrFetch = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/api/v1/auth/login') return jsonResponse({ access_token: 'token' });
      const offset = parsed.searchParams.get('offset') ?? '0';
      offsets.push(offset);
      const id = offset === '0' ? 'task-1' : 'task-2';
      return jsonResponse({ items: [{ id, title: id, status: 'OPEN' }], total: 2 });
    };
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(
      new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory,
    ));

    expect((await adapter.listOwnTasks()).map((task) => task.id)).toEqual(['task-1', 'task-2']);
    expect(offsets).toEqual(['0', '1']);
  });

  it('meldet sich an, prüft das Profil und gibt keine Zugangsdaten im Ergebnis zurück', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'jwt-token' },
      'GET /api/v1/auth/session': { displayName: 'SBV Nutzerin', roles: ['sbv'], email: 'sbv@example.invalid' },
    });
    const settings = new MemoryGremiaBrSettings(configuredSettings());
    const auth = new GremiaBrAuthService(settings, fetch, auditFactory);

    const result = await auth.testConnection();

    expect(result.status).toBe('ok');
    expect(result.profileDisplayName).toBe('SBV Nutzerin');
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
    expect(JSON.stringify(result)).not.toContain('jwt-token');
    expect(settings.success?.profile.role).toBe('sbv');
    const callSignatures = calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`);
    expect(callSignatures).toEqual(['POST /api/v1/auth/login', 'GET /api/v1/auth/session']);
    const authenticatedCalls = calls.slice(1);
    expect(authenticatedCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of authenticatedCalls) {
      expect(call.init?.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
    }
  });

  it('nutzt ausschließlich freigegebene lesende Endpunkte für Sitzungen, Beschlüsse und Suche', async () => {
    const { fetch, calls } = createFetch({
      'POST /api/v1/auth/login': { access_token: 'jwt-token' },
      'GET /api/v1/bodies/sbv-body/meetings': [{ id: 's1', plannedStart: '2099-01-08T09:00:00.000Z', status: 'INVITED' }],
      'GET /api/v1/meetings/s1/agenda': [{ id: 'a1', title: 'BEM' }],
      'GET /api/v1/meetings/s1/decisions': [{ id: 'b1', text: 'BEM-Beschluss' }],
    });
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredSettings()), fetch, auditFactory));

    expect(await adapter.getNextMeeting()).toMatchObject({ id: 's1' });
    expect(await adapter.getUpcomingMeetings()).toHaveLength(1);
    expect(await adapter.getMeetingAgenda('s1')).toHaveLength(1);
    expect(await adapter.listRelevantDecisions()).toHaveLength(1);
    expect(await adapter.getDueDecisions()).toHaveLength(0);
    expect(await adapter.getOverdueDecisions()).toHaveLength(0);
    expect(await adapter.searchDecisions('BEM')).toHaveLength(1);
    expect(await adapter.suggestForInlineCommand('BE')).toHaveLength(1);

    expect(calls.map((call) => `${call.init?.method} ${new URL(call.url).pathname}`)).toContain('GET /api/v1/meetings/s1/decisions');
    expect(calls.every((call) => {
      const method = String(call.init?.method ?? 'GET');
      return method === 'GET' || new URL(call.url).pathname === '/api/v1/auth/login';
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
    const adapter = new GremiaBrHttpReadAdapter(new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredV2Settings()), fetch, auditFactory));

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
      'GET /api/v1/bodies/sbv-body/meetings': [{ id: 's1', title: 'BR-Sitzung' }],
    });
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid', fetch, audit);

    await client.request('GET', '/api/v1/bodies/sbv-body/meetings', 'jwt-token', { query: { q: 'BEM', limit: 5 } });

    expect(audit.entries).toHaveLength(2);
    expect(audit.entries[0].metadata).toMatchObject({ outcome: 'started' });
    expect(audit.entries[0].metadata?.correlationId).toEqual(expect.any(String));
    expect(audit.entries[1].metadata?.correlationId).toBe(audit.entries[0].metadata?.correlationId);
    expect(audit.entries[1].metadata?.durationMs).toEqual(expect.any(Number));
    expect(audit.entries[1]).toMatchObject({
      action: 'read',
      subjectType: 'gremia_br_http_request',
      subjectId: 'GET /api/v1/bodies/{bodyId}/meetings',
    });
    expect(audit.entries[1].metadata).toMatchObject({ endpoint: 'GET /api/v1/bodies/{bodyId}/meetings', outcome: 'ok', status: 200 });
    expect(JSON.stringify(audit.entries[0])).not.toContain('BEM');
    expect(JSON.stringify(audit.entries[0])).not.toContain('jwt-token');
  });

  it('verbindet mehrere bewusst ausgelöste Requests über dieselbe Korrelations-ID im Header und Audit', async () => {
    const { fetch, calls } = createFetch({
      'GET /api/v1/documents/owned-doc': { id: 'owned-doc' },
      'GET /api/v1/documents/owned-doc/shares': [],
    });
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid', fetch, audit);
    const correlationId = '2fab14d5-a36c-434a-b7f3-0d47f21b3e00';

    await client.request('GET', '/api/v1/documents/owned-doc', 'jwt-token', { correlationId });
    await client.request('GET', '/api/v1/documents/owned-doc/shares', 'jwt-token', { correlationId });

    expect(calls).toHaveLength(2);
    expect(calls.map((call) => new Headers(call.init?.headers).get('x-correlation-id'))).toEqual([correlationId, correlationId]);
    expect(audit.entries.map((entry) => entry.metadata?.correlationId)).toEqual([correlationId, correlationId, correlationId, correlationId]);
  });

  it('auditiert den Remote-Zugangsabruf ohne Sitzungskennung oder Zugangsdaten', async () => {
    const secret = 'Einwahl: vertraulich, PIN: 123456';
    const { fetch } = createFetch({ 'GET /api/v1/meetings/meeting-1/remote-access': { access: secret } });
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid', fetch, audit);

    expect(await client.request('GET', '/api/v1/meetings/meeting-1/remote-access', 'jwt-token')).toEqual({ access: secret });
    expect(audit.entries).toHaveLength(2);
    expect(audit.entries[1].metadata).toMatchObject({ endpoint: 'GET /api/v1/meetings/{meetingId}/remote-access', outcome: 'ok' });
    expect(JSON.stringify(audit.entries)).not.toContain(secret);
    expect(JSON.stringify(audit.entries)).not.toContain('meeting-1');
    expect(JSON.stringify(audit.entries)).not.toContain('jwt-token');
  });

  it('startet keinen Gremia.BR-Request, wenn der Audit-Eintrag nicht geschrieben werden kann', async () => {
    let networkCalls = 0;
    const client = new GremiaBrHttpClient('https://br.example.invalid', async () => {
      networkCalls += 1;
      return jsonResponse({});
    }, { append: () => { throw new Error('Audit nicht verfügbar'); } });

    await expect(client.request('GET', '/api/v1/me/bodies')).rejects.toThrow('Audit nicht verfügbar');
    expect(networkCalls).toBe(0);
  });

  it.each([
    [401, /Sitzung.*abgelaufen/i],
    [403, /Zugriff.*verweigert/i],
    [409, /Gremia\.BR aktualisieren/i],
    [503, /nicht erreichbar/i],
  ])('meldet HTTP %i handlungsorientiert und auditiert ohne Antwortinhalt', async (status, expectedMessage) => {
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid', async () => new Response(
      JSON.stringify({ detail: 'vertraulicher Servertext' }),
      { status, headers: { 'content-type': 'application/json' } },
    ), audit);

    await expect(client.request('GET', '/api/v1/me/bodies', 'jwt-token')).rejects.toThrow(expectedMessage);
    expect(audit.entries).toHaveLength(2);
    expect(audit.entries[1].metadata).toMatchObject({ outcome: 'http_error', status });
    expect(JSON.stringify(audit.entries)).not.toContain('vertraulicher Servertext');
  });

  it('meldet einen Verbindungsabbruch ohne technischen Fehlertext und auditiert ihn', async () => {
    const audit = new MemoryAuditLog();
    const client = new GremiaBrHttpClient('https://br.example.invalid', async () => {
      throw new TypeError('failed to fetch: vertrauliche Netzwerkdiagnose');
    }, audit);

    await expect(client.request('GET', '/api/v1/me/bodies', 'jwt-token'))
      .rejects.toThrow(/Verbindung zu Gremia\.BR konnte nicht hergestellt werden/i);
    expect(audit.entries).toHaveLength(2);
    expect(audit.entries[1].metadata).toMatchObject({ outcome: 'request_error' });
    expect(JSON.stringify(audit.entries)).not.toContain('vertrauliche Netzwerkdiagnose');
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
    expect(audit.entries[1]).toMatchObject({
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
    const client = new GremiaBrHttpClient('https://br.example.invalid/api', fetch, new MemoryAuditLog());

    await expect(client.request('GET', '/admin/health', 'jwt-token')).rejects.toThrow(/gesperrt|freigegeben/);
    await expect(client.request('POST', '/protokolle/beschluesse', 'jwt-token', { body: {} })).rejects.toThrow(/freigegeben/);
    await expect(client.request('GET', '/api/v1/bodies/%2e%2e', 'jwt-token')).rejects.toThrow(/kanonische/);
    expect(calls).toHaveLength(0);
  });

  it('meldet fehlende oder falsche Gremia.BR-Anmeldung ohne Secret-Leakage', async () => {
    const { fetch } = createFetch({
      'POST /api/v1/auth/login': { message: 'ok aber ohne Sitzung' },
    });
    const auth = new GremiaBrAuthService(new MemoryGremiaBrSettings(configuredSettings()), fetch, auditFactory);

    const result = await auth.testConnection();

    expect(result.status).toBe('failed');
    expect(result.message).toMatch(/Sitzung/i);
    expect(JSON.stringify(result)).not.toContain('streng-geheim');
  });
});
