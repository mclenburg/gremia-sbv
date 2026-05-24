import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from './gremiaBrPolicy.js';
import type { GremiaBrRequestOptions } from './gremiaBrTypes.js';
import type { CreatePersonalDataAuditInput } from '../../src/app/core/models/audit.model.js';
import { auditGremiaBrReadRequest } from '../auditEventBuilders.js';

export type GremiaBrFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type GremiaBrAuditSink = { append(input: CreatePersonalDataAuditInput): unknown };

const DEFAULT_TIMEOUT_MS = 8_000;

function appendQuery(url: URL, query?: GremiaBrRequestOptions['query']): void {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) url.searchParams.append(key, String(item));
  }
}

function maskPath(path: string): string {
  return path.replace(/\?.*$/, '');
}

function endpointLabel(method: string, path: string): string {
  return `${method.trim().toUpperCase()} ${maskPath(path)}`;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

export class GremiaBrHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = 'GremiaBrHttpError';
  }
}

export class GremiaBrHttpClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetchImpl: GremiaBrFetch = globalThis.fetch.bind(globalThis),
    private readonly auditLog?: GremiaBrAuditSink,
  ) {
    this.baseUrl = validateGremiaBrBaseUrl(baseUrl);
    if (!this.baseUrl) throw new Error('Für die Gremia.BR-Anfrage fehlt die Serveradresse.');
  }

  async request<T>(method: string, path: string, token?: string, options: GremiaBrRequestOptions = {}): Promise<T> {
    const endpoint = endpointLabel(method, path);
    const policy = checkGremiaBrEndpoint(method, path);
    if (!policy.allowed) {
      this.auditRequest(endpoint, 'blocked_by_policy');
      throw new Error(policy.reason ?? 'Dieser Gremia.BR-Endpunkt ist nicht freigegeben.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    appendQuery(url, options.query);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      let body: string | undefined;
      if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await this.fetchImpl(url.toString(), {
        method: method.trim().toUpperCase(),
        headers,
        body,
        redirect: 'manual',
        signal: controller.signal,
      });
      this.auditRequest(endpoint, response.ok ? 'ok' : 'http_error', response.status);
      if (response.status >= 300 && response.status < 400) {
        throw new GremiaBrHttpError('Gremia.BR hat auf eine andere Adresse umgeleitet. Die Anfrage wurde aus Sicherheitsgründen abgebrochen.', response.status, endpoint);
      }
      if (!response.ok) {
        throw new GremiaBrHttpError(`Gremia.BR-Anfrage fehlgeschlagen (${response.status}).`, response.status, endpoint);
      }
      return await readResponsePayload(response) as T;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.auditRequest(endpoint, 'timeout');
        throw new Error('Die Gremia.BR-Anfrage wurde wegen Zeitüberschreitung abgebrochen.');
      }
      if (!(error instanceof GremiaBrHttpError)) {
        this.auditRequest(endpoint, 'network_error');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private auditRequest(endpoint: string, outcome: string, status?: number): void {
    if (!this.auditLog) return;
    this.auditLog.append(auditGremiaBrReadRequest({
      endpoint,
      outcome,
      ...(typeof status === 'number' ? { status } : {}),
    }));
  }
}
