import type { GremiaBrPolicyCheckResult } from '../../src/app/core/models/gremia-br.model.js';
import { findGremiaBrEndpointDefinition } from './gremiaBrApiCatalog.js';

const BLOCKED_PREFIXES = [
  '/admin/',
  '/dsgvo/',
  '/abwesenheiten/',
  '/mitglieder/',
  '/ausschuesse/',
  '/files/',
  '/upload-links',
  '/public-upload/',
  '/agenda/',
];

function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\?.*$/, '');
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
  const endpoint = findGremiaBrEndpointDefinition(method, normalizedPath);
  if (endpoint) return { allowed: true };
  return { allowed: false, reason: 'Der Endpunkt ist nicht in der Gremia.SBV-Lesebrücke freigegeben.' };
}

export function isGremiaBrReadOnlyEndpoint(method: string, path: string): boolean {
  return checkGremiaBrEndpoint(method, path).allowed;
}
