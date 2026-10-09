import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readAuditIntegrityAnchor, writeAuditIntegrityAnchor } from '../../services/auditIntegrityAnchor.js';

describe('lokaler Audit-Vertrauensanker', () => {
  it('bindet Kettenkopf und Legacy-Grenze an Tresor und Datenbankschlüssel', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gsbv-audit-anchor-'));
    const filePath = path.join(root, 'audit.anchor');
    const key = randomBytes(32);
    try {
      const value = { vaultId: '1'.repeat(32), sequence: 3, entryHash: 'a'.repeat(64), legacyMaxSequence: 2 };
      writeAuditIntegrityAnchor(filePath, key, value);
      expect(readAuditIntegrityAnchor(filePath, key, '1'.repeat(32))).toEqual(value);
      expect(readFileSync(filePath, 'utf8')).not.toContain(value.entryHash);
      expect(() => readAuditIntegrityAnchor(filePath, randomBytes(32), '1'.repeat(32))).toThrow();
      expect(() => readAuditIntegrityAnchor(filePath, key, '2'.repeat(32))).toThrow();
      const data = JSON.parse(readFileSync(filePath, 'utf8')) as { ciphertext: string };
      data.ciphertext = `${data.ciphertext.slice(0, -2)}AA`;
      writeFileSync(filePath, JSON.stringify(data));
      expect(() => readAuditIntegrityAnchor(filePath, key, '1'.repeat(32))).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
      key.fill(0);
    }
  });
});
