import { randomUUID } from 'node:crypto';
import { checkGremiaBrEndpoint, validateGremiaBrBaseUrl } from './gremiaBrPolicy.js';
import { findGremiaBrEndpointDefinition, toGremiaBrEndpointLabel } from './gremiaBrApiCatalog.js';
import type { GremiaBrRequestOptions } from './gremiaBrTypes.js';
import type { CreatePersonalDataAuditInput } from '../../src/domain/models/audit.model.js';
import { auditGremiaBrReadRequest } from '../auditEventBuilders.js';

export type GremiaBrFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type GremiaBrAuditSink = { append(input: CreatePersonalDataAuditInput): unknown };

const DEFAULT_TIMEOUT_MS = 8_000;
export const MAX_GREMIA_BR_RESPONSE_BYTES = 5 * 1024 * 1024;

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
  return toGremiaBrEndpointLabel(method, maskPath(path));
}

function endpointAuditAction(method: string, path: string): 'read' | 'export' | 'update' | 'delete' {
  const definition = findGremiaBrEndpointDefinition(method, maskPath(path));
  if (definition?.category !== 'workspace_action') return 'read';
  if (definition.template.includes('/revocation')) return 'delete';
  if (definition.template.includes('/agenda') || definition.template.includes('/information-requests') || definition.template.includes('/tasks/')) return 'update';
  return 'export';
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_GREMIA_BR_RESPONSE_BYTES) {
    throw new Error('Gremia.BR-Antwort überschreitet die zulässige Größe.');
  }

  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_GREMIA_BR_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('Gremia.BR-Antwort überschreitet die zulässige Größe.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return text ? JSON.parse(text) : null;
  return text;
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
  private readonly fetchImpl: GremiaBrFetch;

  constructor(
    baseUrl: string,
    fetchImpl: GremiaBrFetch | undefined,
    private readonly auditLog: GremiaBrAuditSink,
  ) {
    this.baseUrl = validateGremiaBrBaseUrl(baseUrl);
    if (!this.baseUrl) throw new Error('Für die Gremia.BR-Anfrage fehlt die Serveradresse.');
    if (!auditLog) throw new Error('Für Gremia.BR-Anfragen ist ein lokales Audit erforderlich.');
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async request<T>(method: string, path: string, token?: string, options: GremiaBrRequestOptions = {}): Promise<T> {
    return (await this.requestDetailed<T>(method, path, token, options)).payload;
  }

  async requestDetailed<T>(method: string, path: string, token?: string, options: GremiaBrRequestOptions = {}): Promise<{ payload: T; headers: Headers }> {
    const endpoint = endpointLabel(method, path);
    const correlationId = randomUUID();
    const policy = checkGremiaBrEndpoint(method, path);
    if (!policy.allowed) {
      this.auditRequest(endpoint, 'blocked_by_policy', undefined, correlationId);
      throw new Error(policy.reason ?? 'Dieser Gremia.BR-Endpunkt ist nicht freigegeben.');
    }

    this.auditRequest(endpoint, 'started', undefined, correlationId);
    const startedAt = performance.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    appendQuery(url, options.query);

    let result: { payload: T; headers: Headers };
    let responseStatus: number | undefined;
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      let body: BodyInit | undefined;
      if (options.formData) {
        body = options.formData;
      } else if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
      if (token) headers.Authorization = `Bearer ${token}`;
      if (options.sessionCookie) headers.Cookie = options.sessionCookie;

      const response = await this.fetchImpl(url.toString(), {
        method: method.trim().toUpperCase(),
        headers,
        body,
        redirect: 'manual',
        signal: controller.signal,
      });
      responseStatus = response.status;
      if (response.status >= 300 && response.status < 400) {
        throw new GremiaBrHttpError('Gremia.BR hat auf eine andere Adresse umgeleitet. Die Anfrage wurde aus Sicherheitsgründen abgebrochen.', response.status, endpoint);
      }
      if (!response.ok) {
        throw new GremiaBrHttpError(`Gremia.BR-Anfrage fehlgeschlagen (${response.status}).`, response.status, endpoint);
      }
      const payload = await readResponsePayload(response) as T;
      result = { payload, headers: response.headers };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.auditRequest(endpoint, 'timeout', undefined, correlationId, performance.now() - startedAt);
        throw new Error('Die Gremia.BR-Anfrage wurde wegen Zeitüberschreitung abgebrochen.');
      }
      this.auditRequest(endpoint, error instanceof GremiaBrHttpError ? 'http_error' : 'request_error', responseStatus, correlationId, performance.now() - startedAt);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    this.auditRequest(endpoint, 'ok', responseStatus, correlationId, performance.now() - startedAt);
    return result;
  }

  private auditRequest(endpoint: string, outcome: string, status?: number, correlationId?: string, durationMs?: number): void {
    const method = endpoint.split(' ')[0] ?? 'GET';
    const path = endpoint.replace(/^[A-Z]+\s+/u, '');
    this.auditLog.append(auditGremiaBrReadRequest({
      action: endpointAuditAction(method, path),
      endpoint,
      outcome,
      ...(typeof status === 'number' ? { status } : {}),
      correlationId,
      durationMs: durationMs === undefined ? undefined : Math.round(durationMs),
    }));
  }
}
