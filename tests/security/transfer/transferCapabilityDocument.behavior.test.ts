import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { createTransferCapabilityDocument, verifyTransferCapabilityDocument } from '../../../services/transferCapabilityDocument';

function identity() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const database = {
    prepare<T = unknown>(sql: string) {
      const statement = raw.prepare(sql);
      return {
        all: (...args: unknown[]) => statement.all(...args as []) as T[],
        get: (...args: unknown[]) => statement.get(...args as []) as T | undefined,
        run: (...args: unknown[]) => statement.run(...args as []),
      };
    },
    exec: (sql: string) => raw.exec(sql),
    pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`),
    close: () => raw.close(),
  } satisfies DatabaseAdapter;
  return { raw, privateIdentity: new TransferInstanceIdentityService(database).getPrivateIdentity() };
}

describe('zielgebundene Übergabefähigkeiten', () => {
  it('bestätigt nur unveränderte Angaben der bekannten Gegeninstanz für das richtige Ziel', () => {
    const sender = identity();
    const target = identity();
    const stranger = identity();
    try {
      const capability = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4], writeFormats: [2, 4], features: ['manual_capability_exchange'], buildVersion: '0.9.8', revision: 1, issuedAt: '2026-11-11T10:00:00.000Z' };
      const document = createTransferCapabilityDocument(sender.privateIdentity, target.privateIdentity, capability);
      expect(verifyTransferCapabilityDocument(document, target.privateIdentity, sender.privateIdentity)).toEqual(capability);
      expect(() => verifyTransferCapabilityDocument(document, stranger.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => verifyTransferCapabilityDocument(document, target.privateIdentity, stranger.privateIdentity)).toThrow();
      expect(() => verifyTransferCapabilityDocument({ ...document, capabilities: { ...document.capabilities, writeFormats: [5] } }, target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => verifyTransferCapabilityDocument({ ...document, capabilities: { ...document.capabilities, buildVersion: '9.9.9' } }, target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(JSON.stringify(document)).not.toContain('PRIVATE KEY');
    } finally { sender.raw.close(); target.raw.close(); stranger.raw.close(); }
  });
});
