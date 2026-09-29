import { describe, expect, it } from 'vitest';
import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from '../../../services/gremiaBr/gremiaBrPolicy';
import { GremiaBrHttpClient, MAX_GREMIA_BR_RESPONSE_BYTES, type GremiaBrFetch } from '../../../services/gremiaBr/gremiaBrHttpClient';

const audit = { append: () => undefined };

describe('Gremia.BR Lesebrücke Security-Härtung 0.9.2-F', () => {
  it('erlaubt nur explizit freigegebene Lese- und Arbeitsbereichsendpunkte und blockiert Verwaltungszugriffe vor dem Netzwerk', async () => {
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
    expect(checkGremiaBrEndpoint('POST', '/api/v1/auth/login').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/api/v1/auth/session').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/api/v1/me/bodies').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/api/v1/bodies/body-1/meetings').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/api/v1/meetings/meeting-1/agenda').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/api/v1/documents/search').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/api/v1/documents').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/api/v1/documents/document-1/shares').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/api/v1/meetings/meeting-1/agenda').allowed).toBe(true);

    for (const [method, path] of [
      ['GET', '/admin/health'],
      ['GET', '/dsgvo/dashboard'],
      ['GET', '/mitglieder'],
      ['GET', '/abwesenheiten'],
      ['GET', '/ausschuesse'],
      ['GET', '/dokumente'],
      ['GET', '/files/unterlage.pdf'],
      ['POST', '/auth/refresh'],
      ['POST', '/api/v1/documents/document-1/transfer'],
      ['POST', '/api/v1/documents/shares/share-1/approval'],
      ['DELETE', '/api/v1/sessions/session-1'],
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
    const client = new GremiaBrHttpClient('https://br.example.local', fetchImpl, audit);

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
    const client = new GremiaBrHttpClient('https://br.example.local', fetchImpl, audit);

    await expect(client.request('GET', '/search', 'token', { query: { q: 'BEM' } })).rejects.toThrow(/umgeleitet/i);
  });


  it('begrenzt Antworten der externen Lesebrücke vor der JSON-Verarbeitung', async () => {
    const oversizedByHeader: GremiaBrFetch = async () => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-length': String(MAX_GREMIA_BR_RESPONSE_BYTES + 1) },
    });
    const client = new GremiaBrHttpClient('https://br.example.local', oversizedByHeader, audit);
    await expect(client.request('GET', '/search', 'token', { query: { q: 'BEM' } })).rejects.toThrow(/zulässige Größe/i);

    const chunk = 'x'.repeat(1024 * 1024);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < 6; index += 1) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    const oversizedStream: GremiaBrFetch = async () => new Response(body, { status: 200, headers: { 'content-type': 'text/plain' } });
    const streamingClient = new GremiaBrHttpClient('https://br.example.local', oversizedStream, audit);
    await expect(streamingClient.request('GET', '/search', 'token', { query: { q: 'BEM' } })).rejects.toThrow(/zulässige Größe/i);
  });

});
