import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../../services/auditHashChain';
import { PersonalDataAuditLogService } from '../../services/auditLogService';
import { openTestDatabase } from '../helpers/openTestDatabase';

const correlationIds = [
  '78947661-1ab6-4ba8-8345-6b2022ae3c4a',
  'abcdefab-abcd-4abc-8abc-123456789012',
  '12345678-1234-4123-8123-123456789012',
];

describe('audit correlation behavior', () => {
  it.each(['gremia_br_http_request', 'gremia_br_workspace_action'])('preserves valid technical correlations for %s independent of numeric UUID segments', (subjectType) => {
    for (const correlationId of correlationIds) {
      const metadata = JSON.parse(normalizeAuditMetadata({ correlationId }, subjectType));
      expect(metadata).toEqual({ correlationId });
    }
  });

  it.each([
    '12345678', 'Ada Lovelace', 'ada@example.test', 'Person 12345678', `PNR-12345 ${correlationIds[0]}`,
    '12345678-1234-0123-8123-123456789012', '12345678-1234-4123-7123-123456789012',
  ])('rejects personal identifiers and invalid numeric UUIDs in the correlation field: %s', (correlationId) => {
    expect(JSON.parse(normalizeAuditMetadata({ correlationId }, 'gremia_br_http_request'))).toEqual({});
  });

  it('does not extend the UUID exception to free text or events without an allowed correlation field', () => {
    const correlationId = correlationIds[0];
    expect(JSON.parse(normalizeAuditMetadata({ correlationId }, 'case_note'))).toEqual({});
    expect(JSON.parse(normalizeAuditMetadata({ purpose: correlationId }, 'gremia_br_http_request'))).toEqual({});
  });

  it('persists both correlated actions with a verifiable hash chain without retaining personal metadata', async () => {
    const database = await openTestDatabase();
    try {
      database.exec(readFileSync('database/schema.sql', 'utf8'));
      const audit = new PersonalDataAuditLogService(database);
      for (const actionType of ['document_uploaded', 'document_shared']) {
        audit.append({
          action: 'export', subjectType: 'gremia_br_workspace_action', subjectId: actionType,
          purpose: 'document_transfer', metadata: {
            actionType, correlationId: correlationIds[0], targetSecurityDomain: 'BR',
            personName: 'Ada Lovelace', email: 'ada@example.test',
          },
        });
      }
      const records = audit.listForSubject('gremia_br_workspace_action');
      expect(records).toHaveLength(2);
      expect(records.map((record) => JSON.parse(record.metadataJson))).toEqual([
        { actionType: 'document_shared', correlationId: correlationIds[0] },
        { actionType: 'document_uploaded', correlationId: correlationIds[0] },
      ]);
      expect(audit.verifyChain()).toMatchObject({ ok: true, checked: 2, issues: [] });
    } finally {
      database.close();
    }
  });
});
