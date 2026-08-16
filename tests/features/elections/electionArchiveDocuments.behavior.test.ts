import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionArchiveService } from '../../../services/electionArchiveService';
import { ElectionExecutionService } from '../../../services/electionExecutionService';
import { SbvElectionService } from '../../../services/sbvElectionService';
import { SbvOfficeWorkflowDocumentAdapter } from '../../../services/sbvOfficeWorkflowDocumentAdapter';

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

function setup() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = new SqliteAdapter(raw);
  const elections = new SbvElectionService(db);
  const election = elections.create({ kind: 'deputy_by_election', triggerReason: 'Nachwahl', electionDate: '2026-09-20', incumbentTermEnd: '2028-04-26' });
  elections.configureSetup(election.id, {
    eligibilityCheckDate: '2026-08-16', confirmedSeverelyDisabledCount: 5, confirmedEqualizedCount: 0,
    pendingEqualizationCount: 0, spatiallySeparated: false, electionDate: '2026-09-20',
    procedure: 'simplified', deputyCount: 1,
  });
  const candidate = elections.saveCandidate(election.id, {
    officeType: 'deputy', personSnapshot: 'Müller, Anna', consentAt: '2026-08-18', ageOnElectionDay: 30,
    monthsInOperation: 12, operationAgeMonths: 24, excludedFromRepresentativeBodyByLaw: false,
    notTemporaryEmployment: true,
  });
  const execution = new ElectionExecutionService(db);
  execution.recordTotals(election.id, {
    officeType: 'deputy', validBallots: 1, invalidBallots: 0, publicCountConfirmed: true,
    candidateVotes: [{ candidateId: candidate.id, votes: 1 }],
  });
  const result = execution.overview(election.id).results[0];
  execution.recordAcceptance(election.id, {
    resultId: result.id, notifiedAt: '2026-09-20', responseAt: '2026-09-20', status: 'accepted_explicit',
  });
  execution.savePhysicalRecord(election.id, {
    recordType: 'stimmzettel', description: 'Papieroriginal', quantity: 1,
    storageLocation: 'Schrank A', sealedStatus: 'versiegelt', originalRequired: true,
  });
  return { raw, db, election, candidate };
}

describe('ElectionArchiveService 0.9.7-D human-readable records', () => {
  it('generates separate ballots and a standalone PDF archive with state, checksums and physical-original warning', async () => {
    const env = setup();
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-election-archive-'));
    try {
      const documents = new SbvOfficeWorkflowDocumentAdapter(env.db, root);
      const archive = new ElectionArchiveService(env.db, documents);
      const ballot = await archive.generate(env.election.id, { kind: 'ballot_deputy' });
      const ballotPdf = (await documents.read(ballot.id)).toString('ascii');
      expect(ballotPdf).toContain('Mueller, Anna');
      expect(ballotPdf).toContain('Keine Unterschrift auf dem Stimmzettel');

      const archiveRecord = await archive.exportPdfArchive(env.election.id);
      const archivePdf = (await documents.read(archiveRecord.id)).toString('ascii');
      expect(archivePdf).toContain('MENSCHENLESBARE GESAMT-WAHLAKTE');
      expect(archivePdf).toContain('AUSZAEHLUNG');
      expect(archivePdf).toContain('PHYSISCHE ORIGINALUNTERLAGEN');
      expect(archivePdf).toContain('ersetzt gesetzlich oder organisatorisch aufzubewahrende');
      expect(archivePdf).toContain('physische Originale, insbesondere Stimmzettel, nicht.');
      expect(archivePdf).toContain('SHA-256');
      expect(env.raw.prepare("SELECT COUNT(*) AS count FROM sbv_election_archive_exports WHERE election_id=? AND export_type='pdf_bundle'").get(env.election.id)).toMatchObject({ count: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
