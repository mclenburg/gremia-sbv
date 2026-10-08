import type { GremiaBrPolicyCheckResult } from '../../src/domain/models/gremia-br.model.js';
import { GREMIA_BR_API_CATALOG, findGremiaBrEndpointDefinition } from './gremiaBrApiCatalog.js';

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

function canonicalApiPath(method: string, rawPath: string): string | null {
  if (rawPath !== rawPath.trim() || !rawPath.startsWith('/') || rawPath.startsWith('//')
    || rawPath.includes('\\') || rawPath.includes('#')) return null;
  const path = rawPath.split('?')[0];
  if (path.includes('//') || /%(?:2e|2f|5c|25|3f|23)/i.test(path)) return null;
  if (GREMIA_BR_API_CATALOG.some((entry) => entry.method === method.trim().toUpperCase() && entry.template === path)) return path;
  try {
    return new URL(path, 'https://gremia.invalid').pathname === path ? path : null;
  } catch {
    return null;
  }
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

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
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
  const normalizedPath = canonicalApiPath(method, path);
  if (!normalizedPath) return { allowed: false, reason: 'Nur kanonische absolute API-Pfade sind zulässig.' };
  if (BLOCKED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return { allowed: false, reason: 'Dieser Gremia.BR-Endpunkt ist für Gremia.SBV gesperrt.' };
  }
  const endpoint = findGremiaBrEndpointDefinition(method, normalizedPath);
  if (endpoint) return { allowed: true };
  return { allowed: false, reason: 'Der Endpunkt ist nicht für die Gremia.SBV-Gremia.BR-Anbindung freigegeben.' };
}

export function isGremiaBrReadOnlyEndpoint(method: string, path: string): boolean {
  const normalizedPath = canonicalApiPath(method, path);
  const endpoint = normalizedPath ? findGremiaBrEndpointDefinition(method, normalizedPath) : undefined;
  return endpoint?.category === 'auth' || endpoint?.category === 'read_context';
}

export function isGremiaBrWorkspaceActionEndpoint(method: string, path: string): boolean {
  const normalizedPath = canonicalApiPath(method, path);
  return normalizedPath ? findGremiaBrEndpointDefinition(method, normalizedPath)?.category === 'workspace_action' : false;
}
