import { describe, expect, it } from 'vitest';
import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from '../services/gremiaBr/gremiaBrPolicy';
import { GremiaBrHttpClient, type GremiaBrFetch } from '../services/gremiaBr/gremiaBrHttpClient';

describe('Gremia.BR Lesebrücke Security-Härtung 0.9.2-F', () => {
  it('erlaubt nur explizit freigegebene Leseendpunkte und blockiert Verwaltungs- oder Schreibzugriffe vor dem Netzwerk', async () => {
    expect(checkGremiaBrEndpoint('GET', '/sitzungen/kommende').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/protokolle/beschluesse/faellig').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/search/suggest?q=BEM').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/auth/login').allowed).toBe(true);

    for (const [method, path] of [
      ['GET', '/admin/health'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/ausschuesse'],
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
});
