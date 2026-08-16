import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { cleanElectionText, electionNow } from './electionExecutionSupport.js';
import type { OfficeType } from '../src/app/core/models/election.model.js';
import type { SaveElectionMailBallotInput, SaveElectionPhysicalRecordInput } from '../src/app/core/models/election-execution.model.js';

interface RankedVote {
  candidateId: string;
  officeType: OfficeType;
  votes: number;
  provisionalRank: number;
  lotRequired: boolean;
}

export class ElectionExecutionRepository {
  constructor(private readonly db: DatabaseAdapter) {}

  saveMailBallot(electionId: string, input: SaveElectionMailBallotInput, destroyDue: string | null): string {
    const existing = this.db.prepare<{ id: string }>(
      'SELECT id FROM sbv_election_mail_ballots WHERE election_id=? AND voter_id=?',
    ).get(electionId, input.voterId);
    const id = existing?.id ?? randomUUID();
    const timestamp = electionNow();
    this.db.prepare(`
      INSERT INTO sbv_election_mail_ballots(
        id,election_id,voter_id,requested_at,sent_at,received_at,declaration_valid,
        transferred_to_urn_at,late_received_at,destroy_due_at,destroyed_at,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(election_id,voter_id) DO UPDATE SET
        requested_at=COALESCE(excluded.requested_at,requested_at), sent_at=COALESCE(excluded.sent_at,sent_at),
        received_at=COALESCE(excluded.received_at,received_at), declaration_valid=COALESCE(excluded.declaration_valid,declaration_valid),
        transferred_to_urn_at=COALESCE(excluded.transferred_to_urn_at,transferred_to_urn_at),
        late_received_at=COALESCE(excluded.late_received_at,late_received_at), destroy_due_at=COALESCE(excluded.destroy_due_at,destroy_due_at),
        destroyed_at=COALESCE(excluded.destroyed_at,destroyed_at), updated_at=excluded.updated_at
    `).run(
      id, electionId, input.voterId, cleanElectionText(input.requestedAt), cleanElectionText(input.sentAt),
      cleanElectionText(input.receivedAt), input.declarationValid === undefined ? null : input.declarationValid ? 1 : 0,
      cleanElectionText(input.transferredToUrnAt), cleanElectionText(input.lateReceivedAt), destroyDue,
      cleanElectionText(input.destroyedAt), timestamp, timestamp,
    );
    return id;
  }

  replaceVoteTotals(electionId: string, officeType: OfficeType, rankings: readonly RankedVote[], deputyCount: number): void {
    this.db.prepare('DELETE FROM sbv_election_vote_totals WHERE election_id=? AND office_type=?').run(electionId, officeType);
    this.db.prepare('DELETE FROM sbv_election_results WHERE election_id=? AND office_type=?').run(electionId, officeType);
    const timestamp = electionNow();
    for (const ranking of rankings) {
      this.db.prepare(`INSERT INTO sbv_election_vote_totals(id,election_id,office_type,candidate_id,votes,rank,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`)
        .run(randomUUID(), electionId, ranking.officeType, ranking.candidateId, ranking.votes, ranking.provisionalRank, timestamp, timestamp);
      const elected = officeType === 'representative' ? ranking.provisionalRank === 1 : ranking.provisionalRank <= deputyCount;
      if (elected) this.db.prepare(`
        INSERT INTO sbv_election_results(id,election_id,office_type,candidate_id,elected_rank,lot_required,acceptance_status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,'pending',?,?)
      `).run(randomUUID(), electionId, officeType, ranking.candidateId, ranking.provisionalRank, ranking.lotRequired ? 1 : 0, timestamp, timestamp);
    }
    this.db.prepare("UPDATE sbv_elections SET status='counting',updated_at=? WHERE id=?").run(timestamp, electionId);
  }

  savePhysicalRecord(electionId: string, input: SaveElectionPhysicalRecordInput): string {
    const id = input.id ?? randomUUID();
    const timestamp = electionNow();
    const quantity = input.quantity ?? 1;
    this.db.prepare(`
      INSERT INTO sbv_election_physical_records(
        id,election_id,record_type,description,quantity,storage_location,sealed_status,
        original_required,handed_over_at,handed_over_to,notes_minimal,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        record_type=excluded.record_type, description=excluded.description, quantity=excluded.quantity,
        storage_location=excluded.storage_location, sealed_status=excluded.sealed_status,
        original_required=excluded.original_required, handed_over_at=excluded.handed_over_at,
        handed_over_to=excluded.handed_over_to, notes_minimal=excluded.notes_minimal, updated_at=excluded.updated_at
    `).run(
      id, electionId, input.recordType.trim(), cleanElectionText(input.description), quantity,
      cleanElectionText(input.storageLocation), cleanElectionText(input.sealedStatus), input.originalRequired === false ? 0 : 1,
      cleanElectionText(input.handedOverAt), cleanElectionText(input.handedOverTo), cleanElectionText(input.notesMinimal), timestamp, timestamp,
    );
    return id;
  }

  promoteNext(electionId: string, officeType: OfficeType, rejectedRank: number, resultId: string): void {
    const timestamp = electionNow();
    this.db.prepare("UPDATE sbv_election_results SET elected_rank=NULL, acceptance_status='replaced', updated_at=? WHERE id=?")
      .run(timestamp, resultId);
    const next = this.db.prepare<{ candidate_id: string; rank: number }>(`
      SELECT candidate_id,rank FROM sbv_election_vote_totals WHERE election_id=? AND office_type=? AND rank>? ORDER BY rank,candidate_id LIMIT 1
    `).get(electionId, officeType, rejectedRank);
    if (!next) return;
    const existing = this.db.prepare<{ id: string }>('SELECT id FROM sbv_election_results WHERE election_id=? AND office_type=? AND candidate_id=?')
      .get(electionId, officeType, next.candidate_id);
    if (existing) this.db.prepare(`UPDATE sbv_election_results SET elected_rank=?, acceptance_status='pending', lot_required=0, notified_at=NULL, response_due_at=NULL, updated_at=? WHERE id=?`)
      .run(rejectedRank, timestamp, existing.id);
    else this.db.prepare(`INSERT INTO sbv_election_results(id,election_id,office_type,candidate_id,elected_rank,lot_required,acceptance_status,created_at,updated_at) VALUES(?,?,?,?,?,0,'pending',?,?)`)
      .run(randomUUID(), electionId, officeType, next.candidate_id, rejectedRank, timestamp, timestamp);
  }

  requiredRoundsHaveResults(electionId: string): boolean {
    const kind = this.db.prepare<{ kind: string }>('SELECT kind FROM sbv_elections WHERE id=?').get(electionId)?.kind;
    const required: OfficeType[] = kind === 'deputy_by_election' ? ['deputy'] : ['representative', 'deputy'];
    return required.every((officeType) => {
      const totals = this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM sbv_election_vote_totals WHERE election_id=? AND office_type=?').get(electionId, officeType)?.count ?? 0;
      const results = this.db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM sbv_election_results WHERE election_id=? AND office_type=? AND elected_rank IS NOT NULL').get(electionId, officeType)?.count ?? 0;
      return totals > 0 && results > 0;
    });
  }
}
