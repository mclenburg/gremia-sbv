import crypto from 'node:crypto';

export interface AuditEventInput {
  action: string;
  entityType: string;
  entityId?: string;
  caseId?: string;
  details?: string;
  previousHash?: string;
}

export function createAuditHash(event: AuditEventInput, timestamp: string): string {
  const payload = JSON.stringify({ ...event, timestamp });
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
