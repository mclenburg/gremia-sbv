import { createHash } from 'node:crypto';

/** Canonicalizes database rows independently of SQLite's column enumeration order. */
export function caseHandoverBaselineHash(data: Record<string, unknown>, contentBase64?: string): string {
  const canonicalEntries = Object.keys(data).sort().map((key) => [key, data[key]]);
  const hash = createHash('sha256').update(JSON.stringify(canonicalEntries));
  if (contentBase64 !== undefined) hash.update('document-content-base64:').update(contentBase64);
  return hash.digest('hex');
}
