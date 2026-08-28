import type { GremiaBrConnectionTestResult } from '../../src/domain/models/gremia-br.model.js';
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
  const role = textValue(record.role, record.rolle, Array.isArray(record.roles) ? record.roles.join(', ') : undefined);
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

function sessionCookieFromHeaders(headers: Headers): string {
  const headerWithMultipleCookies = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headerWithMultipleCookies.getSetCookie?.() ?? [headers.get('set-cookie') ?? ''];
  return cookies
    .map((cookie) => cookie.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

export class GremiaBrAuthService {
  private token = '';
  private sessionCookie = '';

  constructor(
    private readonly settingsStore: GremiaBrSettingsStore,
    private readonly fetchImpl?: GremiaBrFetch,
    private readonly auditLogFactory?: () => GremiaBrAuditSink,
  ) {}

  clearToken(): void {
    this.token = '';
    this.sessionCookie = '';
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
    const settings = this.settingsStore.getServiceSettings();
    const auth = settings.apiMode === 'gremia_br_v2'
      ? await this.ensureV2Auth()
      : { token: await this.ensureToken(), sessionCookie: undefined };
    const client = this.client();
    try {
      return await client.request<T>('GET', path, auth.token, { ...options, sessionCookie: auth.sessionCookie });
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 401) {
        this.clearToken();
        const retryAuth = settings.apiMode === 'gremia_br_v2'
          ? await this.ensureV2Auth()
          : { token: await this.ensureToken(), sessionCookie: undefined };
        return await client.request<T>('GET', path, retryAuth.token, { ...options, sessionCookie: retryAuth.sessionCookie });
      }
      throw error;
    }
  }

  private async loginAndFetchProfile(): Promise<GremiaBrProfileSnapshot> {
    if (this.settingsStore.getServiceSettings().apiMode === 'gremia_br_v2') {
      await this.login();
      const settings = this.settingsStore.getServiceSettings();
      const auth = await this.ensureV2Auth();
      const sessionPayload = await this.client().request<unknown>('GET', '/api/v1/auth/session', auth.token, {
        sessionCookie: auth.sessionCookie,
      });
      return profileFromPayload(sessionPayload, settings.username);
    }
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

  private async ensureV2Auth(): Promise<{ token?: string; sessionCookie?: string }> {
    if (!this.token && !this.sessionCookie) await this.login();
    return {
      token: this.token || undefined,
      sessionCookie: this.sessionCookie || undefined,
    };
  }

  private async login(): Promise<void> {
    const settings = this.settingsStore.getServiceSettings();
    if (!settings.enabled) throw new Error('Die Gremia.BR-Anbindung ist deaktiviert.');
    if (!settings.serverUrl || !settings.username || !settings.password) {
      throw new Error('Serveradresse, Benutzerkonto oder Passwort fehlen.');
    }
    if (settings.apiMode === 'gremia_br_v2') {
      const response = await this.client().requestDetailed<unknown>('POST', '/api/v1/auth/login', undefined, {
        body: { identifier: settings.username, password: settings.password },
      });
      const token = extractToken(response.payload);
      if (token) {
        this.token = token;
        return;
      }
      const cookie = sessionCookieFromHeaders(response.headers);
      if (!cookie) throw new Error('Gremia.BR hat keine gültige Sitzung zurückgegeben.');
      this.sessionCookie = cookie;
      return;
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
