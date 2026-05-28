import type { GremiaBrConnectionTestResult } from '../../src/app/core/models/gremia-br.model.js';
import { GremiaBrHttpClient, type GremiaBrAuditSink, type GremiaBrFetch } from './gremiaBrHttpClient.js';
import type { GremiaBrProfileSnapshot, GremiaBrRequestOptions, GremiaBrSettingsStore } from './gremiaBrTypes.js';

function nowIso(): string {
  return new Date().toISOString();
}

function extractToken(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  for (const key of ['access_token', 'accessToken', 'token', 'jwt', 'bearerToken']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function textValue(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function nestedRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function profileRecordFromPayload(payload: unknown): Record<string, unknown> | undefined {
  const record = nestedRecord(payload);
  if (!record) return undefined;
  return nestedRecord(record.profile) ?? nestedRecord(record.user) ?? nestedRecord(record.data) ?? record;
}

function profileFromPayload(payload: unknown, fallbackEmail: string): GremiaBrProfileSnapshot {
  const record = profileRecordFromPayload(payload);
  if (!record) return { email: fallbackEmail };
  const displayName = textValue(
    record.displayName,
    record.name,
    record.fullName,
    record.vollName,
    record.vorname && record.nachname ? `${record.vorname} ${record.nachname}` : undefined,
  );
  const role = textValue(record.role, record.rolle);
  const email = textValue(record.email, record.username, record.userName, record.login) ?? fallbackEmail;
  return { displayName, role, email };
}

function mergeProfileSnapshots(primary: GremiaBrProfileSnapshot, fallback: GremiaBrProfileSnapshot): GremiaBrProfileSnapshot {
  return {
    displayName: primary.displayName ?? fallback.displayName,
    role: primary.role ?? fallback.role,
    email: primary.email ?? fallback.email,
  };
}

export class GremiaBrAuthService {
  private token = '';

  constructor(
    private readonly settingsStore: GremiaBrSettingsStore,
    private readonly fetchImpl?: GremiaBrFetch,
    private readonly auditLogFactory?: () => GremiaBrAuditSink,
  ) {}

  clearToken(): void {
    this.token = '';
  }

  async testConnection(): Promise<GremiaBrConnectionTestResult> {
    const settings = this.settingsStore.getServiceSettings();
    const checkedAt = nowIso();
    if (!settings.enabled) return { status: 'disabled', checkedAt, message: 'Die Gremia.BR-Anbindung ist deaktiviert.' };
    if (!settings.serverUrl || !settings.username || !settings.password) {
      this.settingsStore.markConnectionFailure(checkedAt);
      return { status: 'not_configured', checkedAt, message: 'Serveradresse, Benutzerkonto oder Passwort fehlen.' };
    }

    try {
      const profile = await this.loginAndFetchProfile();
      this.settingsStore.markSuccessfulConnection(checkedAt, profile);
      return {
        status: 'ok',
        checkedAt,
        message: 'Verbindung zu Gremia.BR erfolgreich geprüft.',
        profileDisplayName: profile.displayName,
        profileRole: profile.role,
      };
    } catch (error) {
      this.clearToken();
      this.settingsStore.markConnectionFailure(checkedAt);
      return {
        status: 'failed',
        checkedAt,
        message: error instanceof Error ? error.message : 'Die Verbindung zu Gremia.BR ist fehlgeschlagen.',
      };
    }
  }

  async get<T>(path: string, options: GremiaBrRequestOptions = {}): Promise<T> {
    const token = await this.ensureToken();
    const client = this.client();
    try {
      return await client.request<T>('GET', path, token, options);
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 401) {
        this.clearToken();
        return await client.request<T>('GET', path, await this.ensureToken(), options);
      }
      throw error;
    }
  }

  private async loginAndFetchProfile(): Promise<GremiaBrProfileSnapshot> {
    await this.login();
    const settings = this.settingsStore.getServiceSettings();
    const client = this.client();
    const sessionPayload = await client.request<unknown>('GET', '/auth/me', this.token);
    const profilePayload = await client.request<unknown>('GET', '/auth/profile', this.token);
    return mergeProfileSnapshots(
      profileFromPayload(profilePayload, settings.username),
      profileFromPayload(sessionPayload, settings.username),
    );
  }

  private async ensureToken(): Promise<string> {
    if (!this.token) await this.login();
    return this.token;
  }

  private async login(): Promise<void> {
    const settings = this.settingsStore.getServiceSettings();
    if (!settings.enabled) throw new Error('Die Gremia.BR-Anbindung ist deaktiviert.');
    if (!settings.serverUrl || !settings.username || !settings.password) {
      throw new Error('Serveradresse, Benutzerkonto oder Passwort fehlen.');
    }
    const payload = await this.client().request<unknown>('POST', '/auth/login', undefined, {
      body: { email: settings.username, password: settings.password },
    });
    const token = extractToken(payload);
    if (!token) throw new Error('Gremia.BR hat kein gültiges Zugriffstoken zurückgegeben.');
    this.token = token;
  }

  private client(): GremiaBrHttpClient {
    return new GremiaBrHttpClient(this.settingsStore.getServiceSettings().serverUrl, this.fetchImpl, this.auditLogFactory?.());
  }
}
