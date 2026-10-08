import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PersonalDataAuditLogService, registerAuditIntegrityKey } from '../../services/auditLogService.js';
import { computeAuditEntryHash } from '../../services/auditHashChain.js';
import type { DatabaseAdapter } from '../../services/databaseService.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (file: string) => DatabaseAdapter;

describe('gekettetes Audit mit geheimem Prüfwert', () => {
  it('erkennt eine absichtlich neu berechnete Hash-Kette nach Datenbankänderung', () => {
    const db = new Database(':memory:');
    const key = randomBytes(32);
    try {
      db.exec(readFileSync(path.join(process.cwd(), 'database/migrations/0018_personal_data_audit_log.sql'), 'utf8'));
      db.exec(readFileSync(path.join(process.cwd(), 'database/migrations/0066_audit_keyed_integrity.sql'), 'utf8'));
      registerAuditIntegrityKey(db, key, 0);
      const audit = new PersonalDataAuditLogService(db);
      const created = audit.append({ action: 'create', subjectType: 'case', purpose: 'SBV-Datenschutzereignis' });
      expect(audit.verifyChain().ok).toBe(true);
      const forgedPurpose = 'gefälscht';
      const forgedHash = computeAuditEntryHash({ ...created, purpose: forgedPurpose });
      db.prepare('UPDATE personal_data_audit_log SET purpose = ?, entry_hash = ? WHERE sequence = 1')
        .run(forgedPurpose, forgedHash);
      expect(audit.verifyChain().ok).toBe(false);
      expect(audit.verifyChain().issues.some((issue) => issue.kind === 'entry_mac_mismatch')).toBe(true);
    } finally {
      key.fill(0);
      db.close();
    }
  });
});
