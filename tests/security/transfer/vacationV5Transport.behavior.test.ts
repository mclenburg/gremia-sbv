import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { sealVacationV5Transport, openVacationV5Transport } from '../../../services/vacationV5Transport';
import { sealVacationV5ReturnTransport, openVacationV5ReturnTransport } from '../../../services/vacationV5ReturnTransport';

function identity() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const database = { prepare<T = unknown>(sql: string) { const statement = raw.prepare(sql); return {
    get: (...args: unknown[]) => statement.get(...args as []) as T | undefined, all: (...args: unknown[]) => statement.all(...args as []) as T[],
    run: (...args: unknown[]) => statement.run(...args as []),
  }; }, exec: (sql: string) => raw.exec(sql), pragma: (sql: string) => raw.exec(`PRAGMA ${sql}`), close: () => raw.close() } satisfies DatabaseAdapter;
  return { raw, privateIdentity: new TransferInstanceIdentityService(database).getPrivateIdentity() };
}

describe('Format-5-Transport', () => {
  it('bindet eine Rückgabe an Ausgangspaket, Ziel und Herkunftsnachweis', () => {
    const sender = identity(); const target = identity();
    try {
      const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
        features: ['manual_capability_exchange', 'return_scope_v5'], buildVersion: '0.9.9', revision: 1,
        issuedAt: '2026-11-11T10:00:00.000Z' };
      const changes = [{ ref: 'meeting_1', kind: 'meeting', operation: 'upsert',
        deputyBaselineSha256: 'a'.repeat(64), deputyCurrentSha256: 'b'.repeat(64),
        data: { meeting_type: 'other', title: 'Geändert', starts_at: '2099-11-20', status: 'draft' } }];
      const envelope = sealVacationV5ReturnTransport({ packageId: 'handover_return_v5',
        sourcePackageId: 'handover_source_v5', expiresAt: '2099-11-30', changes,
        capabilities, passphrase: 'lange Transport-Passphrase', sender: sender.privateIdentity,
        target: target.privateIdentity });
      const opened = openVacationV5ReturnTransport(envelope, 'lange Transport-Passphrase',
        target.privateIdentity, sender.privateIdentity);
      expect(opened.sourcePackageId).toBe('handover_source_v5');
      expect(opened.changes).toEqual(changes);
      expect(JSON.stringify(envelope)).not.toContain('Geändert');
      expect(() => openVacationV5ReturnTransport({ ...envelope, senderProof: {
        ...envelope.senderProof, packageType: 'vacation_handover' } }, 'lange Transport-Passphrase',
      target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => sealVacationV5ReturnTransport({ packageId: 'handover_return_other',
        sourcePackageId: 'handover_source_v5', expiresAt: '2099-11-30', changes,
        capabilities: { ...capabilities, features: ['manual_capability_exchange'] },
        passphrase: 'lange Transport-Passphrase', sender: sender.privateIdentity,
        target: target.privateIdentity })).toThrow();
    } finally { sender.raw.close(); target.raw.close(); }
  });

  it('verschlüsselt und authentisiert Fall- und fallfreie Abschnitte gemeinsam', () => {
    const sender = identity(); const target = identity();
    try {
      const sections = [
        { type: 'case', schemaVersion: 1, count: 1, items: [{ ref: 'case_1', links: {}, data: {
          case_number: 'SBV-1', display_name: 'Anfrage', category: 'sonstiges', status: 'offen', opened_at: '2026-11-11',
        } }] },
        { type: 'meeting', schemaVersion: 1, count: 1, items: [{ ref: 'meeting_1', data: {
          meeting_type: 'other', title: 'Sitzung', starts_at: '2099-11-20', status: 'draft',
        } }] },
      ];
      const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
        features: ['manual_capability_exchange', 'vacation_scope_v5'], buildVersion: '0.9.9', revision: 1,
        issuedAt: '2026-11-11T10:00:00.000Z' };
      const envelope = sealVacationV5Transport({ packageId: 'handover_v5_mixed', expiresAt: '2099-11-30',
        sections, capabilities, passphrase: 'lange Transport-Passphrase', sender: sender.privateIdentity, target: target.privateIdentity });
      expect(openVacationV5Transport(envelope, 'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity).sections)
        .toEqual(sections);
      expect(JSON.stringify(envelope)).not.toContain('Anfrage');
      expect(() => openVacationV5Transport({ ...envelope, senderProof: { ...envelope.senderProof, manifestSha256: 'a'.repeat(64) } },
        'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity)).toThrow();
    } finally { sender.raw.close(); target.raw.close(); }
  });

  it('öffnet nur ein unverändertes, zielgebundenes und bekanntes Paket mit geprüftem Manifest', () => {
    const sender = identity(); const target = identity(); const stranger = identity();
    try {
      const capabilities = { protocolVersion: 1 as const, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
        features: ['manual_capability_exchange', 'vacation_scope_v5'], buildVersion: '0.9.9', revision: 1, issuedAt: '2026-11-11T10:00:00.000Z' };
      const sections = [{ type: 'meeting', schemaVersion: 1, count: 1, items: [{ ref: 'meeting_1', data: {
        meeting_type: 'other', title: 'Sitzung', starts_at: '2099-11-20', status: 'draft',
      } }] }];
      const envelope = sealVacationV5Transport({ packageId: 'handover_v5_roundtrip', expiresAt: '2099-11-30T00:00:00.000Z',
        sections, capabilities, passphrase: 'lange Transport-Passphrase', sender: sender.privateIdentity, target: target.privateIdentity });
      expect(openVacationV5Transport(envelope, 'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity).sections).toEqual(sections);
      expect(() => openVacationV5Transport(envelope, 'falsch', target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => openVacationV5Transport(envelope, 'lange Transport-Passphrase', stranger.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => openVacationV5Transport(envelope, 'lange Transport-Passphrase', target.privateIdentity, stranger.privateIdentity)).toThrow();
      expect(() => openVacationV5Transport({ ...envelope, senderProof: { ...envelope.senderProof, manifestSha256: 'f'.repeat(64) } }, 'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => openVacationV5Transport({ ...envelope, unexpected: 'data' }, 'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(() => openVacationV5Transport({ ...envelope, crypto: { ...envelope.crypto, kdfParams: { ...envelope.crypto.kdfParams, extra: 1 } } },
        'lange Transport-Passphrase', target.privateIdentity, sender.privateIdentity)).toThrow();
      expect(JSON.stringify(envelope)).not.toContain('PRIVATE KEY');
      expect(JSON.stringify(envelope)).not.toContain('Sitzung');
    } finally { sender.raw.close(); target.raw.close(); stranger.raw.close(); }
  });
});
