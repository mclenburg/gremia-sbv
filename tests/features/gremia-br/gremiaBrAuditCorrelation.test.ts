import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PersonalDataAuditLogService } from '../../../services/auditLogService';
import { MigrationService } from '../../../services/migrationService';
import { GremiaBrHttpClient } from '../../../services/gremiaBr/gremiaBrHttpClient';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Gremia.BR-Auditkorrelation im lokalen Tresor', () => {
  it('speichert dieselbe Kennung und Requestdauer ohne Antwortinhalt für jeden Request', async () => {
    const db = await openTestDatabase();
    try {
      new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
      const fetch = async () => new Response(JSON.stringify({ secret: 'vertraulich' }), { status: 200, headers: { 'content-type': 'application/json' } });
      const client = new GremiaBrHttpClient('https://br.example.invalid', fetch, new PersonalDataAuditLogService(db));
      const correlationId = '7a1ea146-6342-4e53-a2d0-2e995821e39a';

      await client.request('GET', '/api/v1/documents/owned-doc', 'token', { correlationId });
      await client.request('GET', '/api/v1/documents/owned-doc/shares', 'token', { correlationId });

      const rows = db.prepare<{ metadata_json: string }>(`
        SELECT metadata_json FROM personal_data_audit_log
        WHERE subject_type = 'gremia_br_http_request' ORDER BY sequence
      `).all();
      expect(rows).toHaveLength(4);
      const metadata = rows.map((row) => JSON.parse(row.metadata_json) as Record<string, unknown>);
      expect(metadata.map((entry) => entry.correlationId)).toEqual(Array(4).fill(correlationId));
      expect(metadata.filter((entry) => entry.outcome === 'ok').every((entry) => typeof entry.durationMs === 'number')).toBe(true);
      expect(JSON.stringify(metadata)).not.toContain('vertraulich');
    } finally { db.close(); }
  });
});
