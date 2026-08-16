import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionExecutionService } from '../../../services/electionExecutionService';
import { SbvElectionService } from '../../../services/sbvElectionService';
import { ElectionTransferService } from '../../../services/electionTransferService';
import { ElectionTransferCryptoAdapter } from '../../../services/electionTransferCryptoAdapter';
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

function database() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  return { raw, db: new SqliteAdapter(raw) };
}

function seedClosedElection(db: DatabaseAdapter) {
  const elections = new SbvElectionService(db);
  const election = elections.create({
    kind: 'regular', electionDate: '2026-10-20', incumbentTermEnd: '2028-04-26',
  });
  elections.configureSetup(election.id, {
    eligibilityCheckDate: '2026-08-16', confirmedSeverelyDisabledCount: 50,
    confirmedEqualizedCount: 0, pendingEqualizationCount: 0, spatiallySeparated: false,
    electionDate: '2026-10-20', procedure: 'formal', deputyCount: 1,
  });
  const voter = elections.saveVoter(election.id, {
    lastName: 'Transfer', firstName: 'Wähler', eligibilityBasis: 'severely_disabled_confirmed',
  });
  const representative = elections.saveCandidate(election.id, {
    officeType: 'representative', personSnapshot: 'Repr Person', consentAt: '2026-08-18',
    ageOnElectionDay: 40, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  const deputy = elections.saveCandidate(election.id, {
    officeType: 'deputy', personSnapshot: 'Deputy Person', consentAt: '2026-08-18',
    ageOnElectionDay: 41, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  const execution = new ElectionExecutionService(db);
  execution.saveMailBallot(election.id, {
    voterId: voter.id, requestedAt: '2026-09-01', sentAt: '2026-09-02',
    receivedAt: '2026-10-19', declarationValid: true, transferredToUrnAt: '2026-10-20',
  });
  execution.recordTotals(election.id, {
    officeType: 'representative', validBallots: 1, invalidBallots: 0, publicCountConfirmed: true,
    candidateVotes: [{ candidateId: representative.id, votes: 1 }],
  });
  execution.recordTotals(election.id, {
    officeType: 'deputy', validBallots: 1, invalidBallots: 0, publicCountConfirmed: true,
    candidateVotes: [{ candidateId: deputy.id, votes: 1 }],
  });
  for (const result of execution.overview(election.id).results) {
    execution.recordAcceptance(election.id, {
      resultId: result.id, notifiedAt: '2026-10-20', responseAt: '2026-10-20', status: 'accepted_explicit',
    });
  }
  execution.savePhysicalRecord(election.id, {
    recordType: 'stimmzettel', description: 'Original-Stimmzettel', quantity: 2,
    storageLocation: 'versiegelter Umschlag', sealedStatus: 'versiegelt', originalRequired: true,
  });
  execution.close(election.id, {
    announcementStartedAt: '2026-10-22', announcementEndedAt: '2026-11-05',
    employerNotifiedAt: '2026-10-22', councilNotifiedAt: '2026-10-22',
    retentionUntil: '2028-04-26', challengePending: true,
  });
  return { election, voter, representative, deputy };
}

describe('ElectionTransferService 0.9.7-D protected archive transfer', () => {
  it('roundtrips the fachliche election state into an independent instance with ID remapping and local audit separation', () => {
    const source = database();
    const seeded = seedClosedElection(source.db);
    const sourceAuditCount = Number((source.raw.prepare('SELECT COUNT(*) AS count FROM personal_data_audit_log').get() as { count: number }).count);
    const sourceTransfer = new ElectionTransferService(source.db);
    const passphrase = 'eine ausreichend lange Wahlakten-Passphrase';
    const envelope = sourceTransfer.export(seeded.election.id, 'source-vault-id', passphrase);
    expect(sourceTransfer.inspect(envelope, passphrase)).toMatchObject({ electionId: seeded.election.id, formatVersion: 1 });

    const target = database();
    // Deliberate local data ensures import cannot assume an empty target namespace.
    const local = new SbvElectionService(target.db).create({ kind: 'extraordinary_no_sbv', triggerReason: 'lokal' });
    const targetTransfer = new ElectionTransferService(target.db);
    const imported = targetTransfer.import(envelope, passphrase);
    expect(imported.electionId).not.toBe(seeded.election.id);
    expect(imported.electionId).not.toBe(local.id);

    const importedElection = target.raw.prepare('SELECT status,retention_until,legal_hold_status FROM sbv_elections WHERE id=?').get(imported.electionId);
    expect(importedElection).toMatchObject({ status: 'closed', retention_until: '2028-04-26', legal_hold_status: 'active' });
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_election_candidates WHERE election_id=?').get(imported.electionId)).toMatchObject({ count: 2 });
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_election_vote_totals WHERE election_id=?').get(imported.electionId)).toMatchObject({ count: 2 });
    expect(target.raw.prepare("SELECT COUNT(*) AS count FROM sbv_retention_legal_holds WHERE owner_type='election' AND owner_id=? AND released_at IS NULL").get(imported.electionId)).toMatchObject({ count: 1 });

    const brokenRefs = target.raw.prepare(`
      SELECT COUNT(*) AS count
      FROM sbv_election_vote_totals totals
      LEFT JOIN sbv_election_candidates candidate ON candidate.id=totals.candidate_id
      WHERE totals.election_id=? AND (candidate.id IS NULL OR candidate.election_id<>?)
    `).get(imported.electionId, imported.electionId) as { count: number };
    expect(brokenRefs.count).toBe(0);

    const acceptanceDeadlines = target.raw.prepare(`
      SELECT source_event FROM deadlines
      WHERE process_type='election' AND process_id=? AND rule_key='result.acceptance'
    `).all(imported.electionId) as Array<{ source_event: string }>;
    const targetResultIds = new Set((target.raw.prepare('SELECT id FROM sbv_election_results WHERE election_id=?').all(imported.electionId) as Array<{ id: string }>).map((row) => row.id));
    expect(acceptanceDeadlines.every((deadline) => targetResultIds.has(deadline.source_event.split(':').at(-1)!))).toBe(true);

    const targetAuditRows = target.raw.prepare('SELECT subject_type FROM personal_data_audit_log ORDER BY sequence').all() as Array<{ subject_type: string }>;
    expect(targetAuditRows).toEqual(expect.arrayContaining([{ subject_type: 'election_transfer' }]));
    expect(targetAuditRows.length).toBeLessThan(sourceAuditCount);

    const reExport = targetTransfer.export(imported.electionId, 'target-vault-id', passphrase);
    expect(targetTransfer.inspect(reExport, passphrase)).toMatchObject({ electionId: imported.electionId, formatVersion: 1 });
  });

  it('rolls back all target rows when a protected package contains a broken internal reference', () => {
    const source = database();
    const seeded = seedClosedElection(source.db);
    const transfer = new ElectionTransferService(source.db);
    const crypto = new ElectionTransferCryptoAdapter();
    const passphrase = 'eine ausreichend lange Wahlakten-Passphrase';
    const validEnvelope = transfer.export(seeded.election.id, 'source-vault-id', passphrase);
    const payload = crypto.decrypt(validEnvelope, passphrase);
    payload.data.sbv_election_proposal_candidates = [{
      id: 'broken-link', proposal_id: 'missing-proposal', candidate_id: seeded.representative.id,
      office_type: 'representative', created_at: '2026-08-20T00:00:00.000Z',
    }];
    const item = payload.manifest.items.find((entry) => entry.ref === 'sbv_election_proposal_candidates')!;
    item.sha256 = sha256Canonical(payload.data.sbv_election_proposal_candidates);
    const malformedEnvelope = crypto.encrypt(payload, passphrase);

    const target = database();
    const targetTransfer = new ElectionTransferService(target.db);
    expect(() => targetTransfer.import(malformedEnvelope, passphrase)).toThrow(/Wahlvorschlag-Referenz/);
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_elections').get()).toMatchObject({ count: 0 });
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM sbv_election_transfer_imports').get()).toMatchObject({ count: 0 });
    expect(target.raw.prepare('SELECT COUNT(*) AS count FROM personal_data_audit_log').get()).toMatchObject({ count: 0 });
  });
});
