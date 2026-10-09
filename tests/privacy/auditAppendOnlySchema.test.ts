import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (file: string) => {
  exec(sql: string): void;
  prepare(sql: string): { run(...args: unknown[]): unknown };
  close(): void;
};

describe('Append-only-Schutz für das persönliche Audit', () => {
  it('verweigert Update und Delete auch in einem migrierten Altbestand', () => {
    const db = new Database(':memory:');
    try {
      db.exec(readFileSync(path.join(process.cwd(), 'database/migrations/0018_personal_data_audit_log.sql'), 'utf8'));
      db.prepare('INSERT INTO personal_data_audit_log (id, sequence, occurred_at, actor, action, subject_type, purpose, metadata_json, previous_hash, entry_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run('audit-1', 1, '2026-01-01', 'local', 'create', 'case', 'Test', '{}', '0'.repeat(64), '1'.repeat(64));
      db.exec(readFileSync(path.join(process.cwd(), 'database/migrations/0065_audit_append_only.sql'), 'utf8'));
      expect(() => db.exec("UPDATE personal_data_audit_log SET purpose='verändert' WHERE id='audit-1'")).toThrow();
      expect(() => db.exec("DELETE FROM personal_data_audit_log WHERE id='audit-1'")).toThrow();
    } finally {
      db.close();
    }
  });
});
