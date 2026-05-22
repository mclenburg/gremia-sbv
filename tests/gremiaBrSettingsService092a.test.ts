import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { GremiaBrSettingsService, decodeGremiaBrSecret } from '../services/gremiaBr/gremiaBrSettingsService';
import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from '../services/gremiaBr/gremiaBrPolicy';

class GremiaBrSettingsDb implements DatabaseAdapter {
  row: Record<string, unknown> | undefined;

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      get(): T | undefined {
        if (/SELECT enabled, server_url, username, password_secret/i.test(sql)) return self.row as T | undefined;
        return undefined;
      },
      all(): T[] { return []; },
      run(...params: unknown[]) {
        if (/INSERT INTO gremia_br_settings/i.test(sql) && /ON CONFLICT\(id\) DO UPDATE SET/i.test(sql)) {
          self.row = {
            enabled: params[0],
            server_url: params[1],
            username: params[2],
            password_secret: params[3],
            last_connection_test_at: params[4] ?? null,
            last_successful_login_at: params[5] ?? null,
            profile_json: params[6] ?? null,
            relevance_keywords_json: params[7] ?? null,
            created_at: params[8],
            updated_at: params[9],
          };
        } else if (/UPDATE gremia_br_settings/i.test(sql)) {
          if (self.row) {
            self.row.last_connection_test_at = params[0];
            self.row.updated_at = params[2];
          }
        }
        return { changes: 1 };
      },
    };
  }

  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

describe('Gremia.BR Einstellungen 0.9.2-A', () => {
  it('speichert Zugangsdaten ausschließlich als Secret und gibt sie nie öffentlich zurück', () => {
    const db = new GremiaBrSettingsDb();
    const service = new GremiaBrSettingsService(() => db);

    const saved = service.saveSettings({
      enabled: true,
      serverUrl: 'https://br.example.invalid/',
      username: ' sbv@example.invalid ',
      password: 'streng-geheim',
    });

    expect(saved.enabled).toBe(true);
    expect(saved.serverUrl).toBe('https://br.example.invalid');
    expect(saved.username).toBe('sbv@example.invalid');
    expect(saved.hasStoredCredentials).toBe(true);
    expect(saved.relevanceSettings.groups.length).toBeGreaterThan(0);
    expect(JSON.stringify(saved)).not.toContain('streng-geheim');
    expect(String(db.row?.password_secret)).not.toBe('streng-geheim');
    expect(decodeGremiaBrSecret(String(db.row?.password_secret))).toBe('streng-geheim');
  });

  it('erzwingt HTTPS außer für localhost und blockiert nicht freigegebene Endpunkte', () => {
    expect(validateGremiaBrBaseUrl('https://br.example.invalid/app/')).toBe('https://br.example.invalid/app');
    expect(validateGremiaBrBaseUrl('http://localhost:4200')).toBe('http://localhost:4200');
    expect(() => validateGremiaBrBaseUrl('http://br.example.invalid')).toThrow(/HTTPS/);

    expect(checkGremiaBrEndpoint('GET', '/search').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('POST', '/auth/login').allowed).toBe(true);
    expect(checkGremiaBrEndpoint('GET', '/admin/health').allowed).toBe(false);
    expect(checkGremiaBrEndpoint('POST', '/protokolle/beschluesse').allowed).toBe(false);
  });

  it('liefert bei deaktivierter Verbindung einen Noop-Verbindungstest', () => {
    const service = new GremiaBrSettingsService(() => new GremiaBrSettingsDb());

    expect(service.testStoredConfiguration().status).toBe('disabled');
  });
});
