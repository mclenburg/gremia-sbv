import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from '../services/gremiaBr/gremiaBrPolicy';
import { GremiaBrHttpClient, type GremiaBrFetch } from '../services/gremiaBr/gremiaBrHttpClient';

describe('Gremia.BR Lesebrücke Security-Härtung 0.9.2-F', () => {
  it('erlaubt nur explizit freigegebene Leseendpunkte und blockiert Verwaltungs- oder Schreibzugriffe vor dem Netzwerk', async () => {
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/kommende').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/aktuelle').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/wiedervorlagen?datum=2026-05-27').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/s1').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/s1/protokoll-status').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/p1').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/sitzung/s1').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/p1/beschluesse').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/beschluesse/faellig').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/beschluesse/statistik').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/beschluesse/statistik-extended').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/search/suggest?q=BEM').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/auth/login').allowed).toBe(true);

    for (const [method, path] of [
      ['GET', '/admin/health'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/ausschuesse'],
      ['GET', '/dokumente'],
      ['GET', '/files/unterlage.pdf'],
      ['POST', '/auth/refresh'],
      ['POST', '/protokolle/beschluesse'],
      ['PATCH', '/sitzungen/s1'],
      ['DELETE', '/files/unterlage.pdf'],
    ] as const) {
      expect(checkGremiaBrEndpoint(method, path).allowed, `${method} ${path}`).toBe(false);
    }

    let networkCalls = 0;
    const fetchImpl: GremiaBrFetch = async () => {
      networkCalls += 1;
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const client = new GremiaBrHttpClient('https://br.example.local', fetchImpl);

    await expect(client.request('GET', '/admin/health')).rejects.toThrow(/gesperrt|nicht freigegeben/i);
    expect(networkCalls).toBe(0);
  });

  it('normalisiert Serveradressen ohne Credentials und akzeptiert HTTP nur für lokale Testserver', () => {
    expect(validateGremiaBrBaseUrl('https://user:secret@br.example.local/app?token=abc#frag')).toBe('https://br.example.local/app');
    expect(validateGremiaBrBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(validateGremiaBrBaseUrl('http://127.0.0.1:3000/')).toBe('http://127.0.0.1:3000');

    expect(() => validateGremiaBrBaseUrl('http://br.example.local')).toThrow(/HTTPS/i);
    expect(() => validateGremiaBrBaseUrl('file:///etc/passwd')).toThrow(/HTTPS|URL/i);
    expect(() => validateGremiaBrBaseUrl('javascript:alert(1)')).toThrow(/HTTPS|URL/i);
  });

  it('bricht HTTP-Redirects ab und folgt keiner umgeleiteten Zieladresse', async () => {
    const fetchImpl: GremiaBrFetch = async () => new Response('', {
      status: 302,
      headers: { location: 'https://evil.example.test/collect' },
    });
    const client = new GremiaBrHttpClient('https://br.example.local', fetchImpl);

    await expect(client.request('GET', '/search', 'token', { query: { q: 'BEM' } })).rejects.toThrow(/umgeleitet/i);
  });

  it('leert den lokalen BR-Lesecache bei Deaktivierung oder Credential-Clear der Anbindung', () => {
    const ipc = readFileSync('electron/ipc/gremiaBrIpc.ts', 'utf8');

    expect(ipc).toContain('if (!saved.enabled) cache.clear();');
    expect(ipc).toContain('const next = settings.clearCredentials();');
    expect(ipc).toContain('cache.clear();');
  });


  it('dokumentiert die 30-Tage-TTL des lokalen BR-Lesecaches als Datenschutzgrenze', () => {
    const dsfa = readFileSync('docs/gremia-br/DSFA_TOM_VVT.md', 'utf8');
    const readme = readFileSync('docs/gremia-br/README.md', 'utf8');
    const privacy = readFileSync('docs/PRIVACY_AND_SECURITY.md', 'utf8');

    expect(dsfa).toContain('30 Tage');
    expect(readme).toContain('30 Tage');
    expect(privacy).toContain('30-Tage-TTL');
    expect(dsfa).toContain('Leeren des Lesecaches bei deaktivierter Gremia.BR-Anbindung');
  });

});
