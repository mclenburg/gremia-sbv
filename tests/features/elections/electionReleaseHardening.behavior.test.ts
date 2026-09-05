import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionTransferCryptoAdapter } from '../../../services/electionTransferCryptoAdapter';
import { ElectionTransferService } from '../../../services/electionTransferService';
import { TransferInstanceIdentityService } from '../../../services/transferInstanceIdentityService';
import { ElectionExecutionService } from '../../../services/electionExecutionService';
import { RetentionOwnerRegistry } from '../../../services/retentionOwnerRegistry';
import { SbvElectionService } from '../../../services/sbvElectionService';
import { sha256Canonical } from '../../../services/electionTransferPolicy';

class SqliteAdapter implements DatabaseAdapter {
  constructor(private readonly db: DatabaseSync) {}
  prepare<T = unknown>(sql: string) {
    const statement = this.db.prepare(sql);
    return {
      all: (...params: unknown[]) => statement.all(...params as []) as T[],
      get: (...params: unknown[]) => statement.get(...params as []) as T | undefined,
      run: (...params: unknown[]) => statement.run(...params as []),
    };
  }
  exec(sql: string) { this.db.exec(sql); }
  pragma(sql: string) { return this.db.exec(`PRAGMA ${sql}`); }
  close() { this.db.close(); }
}

function environment() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = new SqliteAdapter(raw);
  const election = new SbvElectionService(db).create({ kind: 'extraordinary_no_sbv', triggerReason: 'Hardening' });
  return { raw, db, election, transfer: new ElectionTransferService(db) };
}

function transferIdentity(db: DatabaseAdapter) {
  const service = new TransferInstanceIdentityService(db);
  const publicIdentity = service.getPublicIdentity();
  return { publicIdentity, token: publicIdentity.recipientToken, privateIdentity: service.getPrivateIdentity() };
}

describe('0.9.7-E Wahlakten-Transferhärtung', () => {
  it('rejects unknown or missing manifest areas even when their hashes are internally consistent', () => {
    const env = environment();
    const crypto = new ElectionTransferCryptoAdapter();
    const passphrase = 'release-hardening-passphrase';
    const identity = transferIdentity(env.db);
    const valid = env.transfer.export(env.election.id, 'source-vault', passphrase, identity.token);
    const payload = crypto.decrypt(valid, passphrase, identity.privateIdentity);

    payload.data.unknown_area = [{ injected: true }];
    payload.manifest.items.push({
      ref: 'unknown_area',
      entityType: 'unknown_area',
      sha256: sha256Canonical(payload.data.unknown_area),
    });
    expect(() => crypto.encrypt(payload, passphrase)).toThrow(/unbekannten Datenbereich/);

    const missing = crypto.decrypt(valid, passphrase, identity.privateIdentity);
    missing.manifest.items = missing.manifest.items.filter((item) => item.ref !== 'deadlines');
    delete missing.data.deadlines;
    expect(() => crypto.encrypt(missing, passphrase)).toThrow(/unvollständig/);
  });

  it('rejects a package whose manifest election id differs from the contained election row and rolls back', () => {
    const source = environment();
    const crypto = new ElectionTransferCryptoAdapter();
    const passphrase = 'release-hardening-passphrase';
    const target = environment();
    const targetIdentity = transferIdentity(target.db);
    const valid = source.transfer.export(source.election.id, 'source-vault', passphrase, targetIdentity.token);
    const payload = crypto.decrypt(valid, passphrase, targetIdentity.privateIdentity);
    payload.manifest.electionId = 'different-election-id';
    const malformed = crypto.encrypt(payload, passphrase, targetIdentity.publicIdentity);

    const before = Number((target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_elections').get() as { count: number }).count);
    expect(() => target.transfer.import(malformed, passphrase)).toThrow(/anderen Wahlvorgang/);
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_elections').get()).toMatchObject({ count: before });
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_election_transfer_imports').get()).toMatchObject({ count: 0 });
  });

  it('rejects oversized transfer files before parsing them', async () => {
    const env = environment();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-election-hardening-'));
    const filePath = path.join(directory, 'oversized.gsbvelection');
    try {
      const fd = fs.openSync(filePath, 'w');
      fs.ftruncateSync(fd, 50 * 1024 * 1024 + 1);
      fs.closeSync(fd);
      await expect(env.transfer.inspectFile(filePath, 'release-hardening-passphrase')).rejects.toThrow(/Dateigröße/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  it('exposes a closed challenged election as a managed retention owner with active legal hold', () => {
    const env = environment();
    const execution = new ElectionExecutionService(env.db);
    env.raw.prepare("UPDATE sbv_elections SET status='closed', retention_until='2028-04-26', legal_hold_status='active' WHERE id=?").run(env.election.id);
    env.raw.prepare(`
      INSERT INTO sbv_retention_legal_holds(
        id,owner_type,owner_id,reason_key,legal_reference,starts_at,until_at,released_at,release_reason,created_at,updated_at
      ) VALUES('hold-release-e2e','election',?,'election_challenge','SchwbVWO','2026-09-22T00:00:00.000Z',NULL,NULL,NULL,'2026-09-22T00:00:00.000Z','2026-09-22T00:00:00.000Z')
    `).run(env.election.id);
    expect(execution.overview(env.election.id)).toBeTruthy();
    const snapshot = new RetentionOwnerRegistry().listManagedSnapshots(env.db, new Date('2026-10-01T00:00:00.000Z'))
      .find((owner) => owner.ownerType === 'election' && owner.ownerId === env.election.id);
    expect(snapshot).toMatchObject({
      retentionUntil: '2028-04-26',
      legalHoldActive: true,
      legalHoldReasonKey: 'election_challenge',
    });
  });

});
