import type { GremiaBrPolicyCheckResult } from '../../src/app/core/models/gremia-br.model.js';

const READ_ONLY_ENDPOINTS = new Set([
  'GET /auth/profile',
  'GET /search',
  'GET /search/suggest',
  'GET /sitzungen/naechste',
  'GET /sitzungen/kommende',
  'GET /sitzungen/{id}/agenda',
  'GET /protokolle/beschluesse',
  'GET /protokolle/beschluesse/faellig',
  'GET /protokolle/beschluesse/ueberfaellig',
]);

const AUTH_ENDPOINTS = new Set(['POST /auth/login']);

const BLOCKED_PREFIXES = [
  '/admin/',
  '/dsgvo/',
  '/abwesenheiten/',
  '/mitglieder/',
  '/ausschuesse/',
];

function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\?.*$/, '');
}

function endpointKey(method: string, path: string): string {
  const upperMethod = method.trim().toUpperCase();
  const normalizedPath = normalizePath(path.trim());
  if (/^\/sitzungen\/[^/]+\/agenda$/.test(normalizedPath)) return `${upperMethod} /sitzungen/{id}/agenda`;
  return `${upperMethod} ${normalizedPath}`;
}

export function validateGremiaBrBaseUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return '';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Die Gremia.BR-Serveradresse ist keine gültige URL.');
  }

  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    throw new Error('Gremia.BR darf nur per HTTPS angebunden werden. HTTP ist nur für localhost-Testumgebungen zulässig.');
  }

  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, '');
}

export function checkGremiaBrEndpoint(method: string, path: string): GremiaBrPolicyCheckResult {
  const normalizedPath = normalizePath(path.trim());
  if (!normalizedPath.startsWith('/')) return { allowed: false, reason: 'Nur absolute API-Pfade sind zulässig.' };
  if (BLOCKED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return { allowed: false, reason: 'Dieser Gremia.BR-Endpunkt ist für Gremia.SBV gesperrt.' };
  }
  const key = endpointKey(method, normalizedPath);
  if (AUTH_ENDPOINTS.has(key)) return { allowed: true };
  if (READ_ONLY_ENDPOINTS.has(key)) return { allowed: true };
  return { allowed: false, reason: 'Der Endpunkt ist nicht in der Gremia.SBV-Lesebrücke freigegeben.' };
}

export function isGremiaBrReadOnlyEndpoint(method: string, path: string): boolean {
  return checkGremiaBrEndpoint(method, path).allowed;
}
