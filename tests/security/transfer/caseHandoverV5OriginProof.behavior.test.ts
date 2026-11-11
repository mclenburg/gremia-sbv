import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { createCaseHandoverV5OriginProof, verifyCaseHandoverV5OriginProof } from '../../../services/caseHandoverV5OriginProof';

function identity() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const database = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined, all: (...args: unknown[]) => statement.all(...args as []) as T[],
    run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, value: new TransferInstanceIdentityService(database).getPrivateIdentity() };
}

describe('Format-5-Herkunftsnachweis', () => {
  it('bindet Ciphertext, Manifest, Pakettyp und beide bekannten Schlüssel zweckgebunden', () => {
    const sender = identity(); const target = identity(); const stranger = identity();
    try {
      const envelope = { format: 'gremia-sbv-case-handover', version: 5, packageId: 'handover_test', createdAt: '2026-11-11T10:00:00.000Z',
        recipientBinding: { targetInstanceId: target.value.instanceId, targetKeyFingerprint: target.value.keyFingerprint },
        integrity: { aadSha256: 'a'.repeat(64), ciphertextSha256: 'b'.repeat(64) }, crypto: { tag: 'AAAAAAAAAAAAAAAAAAAAAA==' } };
      const context = { packageType: 'vacation_handover' as const, manifestSha256: 'c'.repeat(64) };
      const proof = createCaseHandoverV5OriginProof(envelope, context, sender.value, target.value);
      expect(() => verifyCaseHandoverV5OriginProof(envelope, context, proof, target.value, sender.value)).not.toThrow();
      expect(() => verifyCaseHandoverV5OriginProof(envelope, context, proof, stranger.value, sender.value)).toThrow();
      expect(() => verifyCaseHandoverV5OriginProof(envelope, context, proof, target.value, stranger.value)).toThrow();
      expect(() => verifyCaseHandoverV5OriginProof(envelope, { ...context, manifestSha256: 'd'.repeat(64) }, proof, target.value, sender.value)).toThrow();
      expect(() => verifyCaseHandoverV5OriginProof(envelope, { ...context, packageType: 'return_delta' }, proof, target.value, sender.value)).toThrow();
      expect(() => verifyCaseHandoverV5OriginProof({ ...envelope, createdAt: '2026-11-12T10:00:00.000Z' }, context, proof, target.value, sender.value)).toThrow();
      expect(() => verifyCaseHandoverV5OriginProof({ ...envelope, integrity: { ...envelope.integrity, ciphertextSha256: 'd'.repeat(64) } }, context, proof, target.value, sender.value)).toThrow();
      expect(JSON.stringify(proof)).not.toContain('PRIVATE KEY');
    } finally { sender.raw.close(); target.raw.close(); stranger.raw.close(); }
  });
});
