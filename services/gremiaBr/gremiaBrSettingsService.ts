import type { DatabaseAdapter } from '../databaseService.js';
import type {
  GremiaBrConnectionTestResult,
  GremiaBrPublicSettings,
  GremiaBrSettingsInput,
  GremiaBrRelevanceSettings,
} from '../../src/app/core/models/gremia-br.model.js';
import type { GremiaBrProfileSnapshot, GremiaBrServiceSettings, GremiaBrSettingsStore } from './gremiaBrTypes.js';
import { validateGremiaBrBaseUrl } from './gremiaBrPolicy.js';
import { DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS, parseGremiaBrRelevanceSettings, serializeGremiaBrRelevanceSettings } from './gremiaBrRelevanceService.js';

interface SettingsRow {
  enabled: number;
  server_url: string;
  username: string;
  password_secret: string | null;
  last_connection_test_at: string | null;
  last_successful_login_at: string | null;
  profile_json: string | null;
  relevance_keywords_json: string | null;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseProfile(profileJson?: string | null): { displayName?: string; role?: string } {
  if (!profileJson) return {};
  try {
    const parsed = JSON.parse(profileJson) as Record<string, unknown>;
    return {
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
    };
  } catch {
    return {};
  }
}

function toPublicSettings(row?: SettingsRow | null): GremiaBrPublicSettings {
  const profile = parseProfile(row?.profile_json);
  return {
    enabled: Boolean(row?.enabled ?? 0),
    serverUrl: row?.server_url ?? '',
    username: row?.username ?? '',
    hasStoredCredentials: Boolean(row?.password_secret),
    lastConnectionTestAt: row?.last_connection_test_at ?? undefined,
    lastSuccessfulLoginAt: row?.last_successful_login_at ?? undefined,
    profileDisplayName: profile.displayName,
    profileRole: profile.role,
    relevanceSettings: parseGremiaBrRelevanceSettings(row?.relevance_keywords_json),
    updatedAt: row?.updated_at ?? undefined,
  };
}

const GREMIA_BR_SECRET_PREFIX = 'b64:v1:';
const LEGACY_GREMIA_BR_SECRET_PREFIX = 'vault:v1:';

function encodeSecret(value: string): string {
  return value ? `${GREMIA_BR_SECRET_PREFIX}${Buffer.from(value, 'utf8').toString('base64')}` : '';
}

export function decodeGremiaBrSecret(secret?: string | null): string {
  if (!secret) return '';
  const prefix = secret.startsWith(GREMIA_BR_SECRET_PREFIX)
    ? GREMIA_BR_SECRET_PREFIX
    : secret.startsWith(LEGACY_GREMIA_BR_SECRET_PREFIX)
      ? LEGACY_GREMIA_BR_SECRET_PREFIX
      : '';
  if (!prefix) return '';
  try {
    return Buffer.from(secret.slice(prefix.length), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export class GremiaBrSettingsService implements GremiaBrSettingsStore {
  constructor(private readonly getDb: () => DatabaseAdapter) {}

  private db(): DatabaseAdapter {
    return this.getDb();
  }

  private readRow(): SettingsRow | undefined {
    return this.db().prepare<SettingsRow>(`
      SELECT enabled, server_url, username, password_secret, last_connection_test_at, last_successful_login_at, profile_json, relevance_keywords_json, updated_at
      FROM gremia_br_settings
      WHERE id = 'default'
    `).get();
  }

  getPublicSettings(): GremiaBrPublicSettings {
    return toPublicSettings(this.readRow());
  }

  getPasswordForServiceUse(): string {
    return decodeGremiaBrSecret(this.readRow()?.password_secret);
  }

  getServiceSettings(): GremiaBrServiceSettings {
    const row = this.readRow();
    return {
      enabled: Boolean(row?.enabled ?? 0),
      serverUrl: row?.server_url ?? '',
      username: row?.username ?? '',
      password: decodeGremiaBrSecret(row?.password_secret),
    };
  }

  saveSettings(input: GremiaBrSettingsInput): GremiaBrPublicSettings {
    const normalizedUrl = validateGremiaBrBaseUrl(input.serverUrl);
    const username = normalizeUsername(input.username);
    if (input.enabled && !normalizedUrl) {
      throw new Error('Für die aktivierte Gremia.BR-Anbindung muss eine Serveradresse hinterlegt sein.');
    }
    if (input.enabled && !username) {
      throw new Error('Für die aktivierte Gremia.BR-Anbindung muss ein Benutzerkonto hinterlegt sein.');
    }

    const existing = this.readRow();
    const timestamp = nowIso();
    const passwordSecret = typeof input.password === 'string' && input.password.length > 0
      ? encodeSecret(input.password)
      : existing?.password_secret ?? '';
    const relevanceJson = serializeGremiaBrRelevanceSettings(input.relevanceSettings ?? parseGremiaBrRelevanceSettings(existing?.relevance_keywords_json));

    this.db().prepare(`
      INSERT INTO gremia_br_settings (
        id, enabled, server_url, username, password_secret,
        last_connection_test_at, last_successful_login_at, profile_json, relevance_keywords_json,
        created_at, updated_at
      ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = excluded.enabled,
        server_url = excluded.server_url,
        username = excluded.username,
        password_secret = excluded.password_secret,
        relevance_keywords_json = excluded.relevance_keywords_json,
        updated_at = excluded.updated_at
    `).run(
      input.enabled ? 1 : 0,
      normalizedUrl,
      username,
      passwordSecret,
      existing?.last_connection_test_at ?? null,
      existing?.last_successful_login_at ?? null,
      existing?.profile_json ?? null,
      relevanceJson,
      existing ? existing.updated_at : timestamp,
      timestamp,
    );
    return this.getPublicSettings();
  }

  clearCredentials(): GremiaBrPublicSettings {
    const timestamp = nowIso();
    this.db().prepare(`
      INSERT INTO gremia_br_settings (id, enabled, server_url, username, password_secret, relevance_keywords_json, created_at, updated_at)
      VALUES ('default', 0, '', '', '', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = 0,
        password_secret = '',
        last_successful_login_at = NULL,
        profile_json = NULL,
        updated_at = excluded.updated_at
    `).run(serializeGremiaBrRelevanceSettings(parseGremiaBrRelevanceSettings(this.readRow()?.relevance_keywords_json)), timestamp, timestamp);
    return this.getPublicSettings();
  }

  getRelevanceSettings(): GremiaBrRelevanceSettings {
    return parseGremiaBrRelevanceSettings(this.readRow()?.relevance_keywords_json);
  }

  saveRelevanceSettings(settings: GremiaBrRelevanceSettings): GremiaBrPublicSettings {
    const timestamp = nowIso();
    const relevanceJson = serializeGremiaBrRelevanceSettings(settings ?? DEFAULT_GREMIA_BR_RELEVANCE_SETTINGS);
    this.db().prepare(`
      INSERT INTO gremia_br_settings (id, enabled, server_url, username, password_secret, relevance_keywords_json, created_at, updated_at)
      VALUES ('default', 0, '', '', '', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        relevance_keywords_json = excluded.relevance_keywords_json,
        updated_at = excluded.updated_at
    `).run(relevanceJson, timestamp, timestamp);
    return this.getPublicSettings();
  }

  testStoredConfiguration(): GremiaBrConnectionTestResult {
    const row = this.readRow();
    const checkedAt = nowIso();
    if (!row?.enabled) {
      return { status: 'disabled', checkedAt, message: 'Die Gremia.BR-Anbindung ist deaktiviert.' };
    }
    if (!row.server_url || !row.username || !row.password_secret) {
      this.markConnectionTest(checkedAt, null);
      return { status: 'not_configured', checkedAt, message: 'Serveradresse, Benutzerkonto oder Passwort fehlen.' };
    }
    this.markConnectionTest(checkedAt, null);
    return {
      status: 'ok',
      checkedAt,
      message: 'Die Gremia.BR-Konfiguration ist vollständig. Der Verbindungstest nutzt die freigegebene Lesebrücke.',
    };
  }

  markConnectionFailure(checkedAt: string): void {
    this.markConnectionTest(checkedAt, null, false);
  }

  markSuccessfulConnection(checkedAt: string, profile: GremiaBrProfileSnapshot): void {
    this.markConnectionTest(checkedAt, JSON.stringify(profile), true);
  }

  private markConnectionTest(checkedAt: string, profileJson: string | null, successful = false): void {
    this.db().prepare(`
      UPDATE gremia_br_settings
      SET
        last_connection_test_at = ?,
        last_successful_login_at = CASE WHEN ? = 1 THEN ? ELSE last_successful_login_at END,
        profile_json = COALESCE(?, profile_json),
        updated_at = ?
      WHERE id = 'default'
    `).run(checkedAt, successful ? 1 : 0, checkedAt, profileJson, checkedAt);
  }
}
