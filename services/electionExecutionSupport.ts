import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DeadlineService } from './deadlineService.js';
import { ElectionDeadlinePolicy } from './electionDeadlinePolicy.js';
import type { OfficeType } from '../src/app/core/models/election.model.js';
import type {
  ElectionExecutionOverview,
  ElectionMailBallotRecord,
  ElectionPhysicalRecord,
  ElectionResultRecord,
  ElectionVoteTotalRecord,
} from '../src/app/core/models/election-execution.model.js';

export const electionNow = () => new Date().toISOString();
export const cleanElectionText = (value?: string) => value?.trim() || null;
const noon = (date: string) => `${date.slice(0, 10)}T12:00:00.000Z`;

type AcceptanceStatus = ElectionResultRecord['acceptanceStatus'];

interface MailRow {
  id: string; election_id: string; voter_id: string; requested_at: string | null; sent_at: string | null;
  received_at: string | null; declaration_valid: number | null; transferred_to_urn_at: string | null;
  late_received_at: string | null; destroy_due_at: string | null; destroyed_at: string | null;
  created_at: string; updated_at: string;
}
interface TotalRow {
  id: string; election_id: string; office_type: OfficeType; candidate_id: string; votes: number;
  rank: number | null; created_at: string; updated_at: string;
}
interface ResultRow {
  id: string; election_id: string; office_type: OfficeType; candidate_id: string; elected_rank: number | null;
  lot_required: number; lot_decided_at: string | null; notified_at: string | null; response_due_at: string | null;
  acceptance_status: AcceptanceStatus; created_at: string; updated_at: string;
}
interface PhysicalRow {
  id: string; election_id: string; record_type: string; description: string | null; quantity: number;
  storage_location: string | null; sealed_status: string | null; original_required: number; handed_over_at: string | null;
  handed_over_to: string | null; notes_minimal: string | null; created_at: string; updated_at: string;
}

function mapMail(row: MailRow): ElectionMailBallotRecord {
  return {
    id: row.id, electionId: row.election_id, voterId: row.voter_id,
    requestedAt: row.requested_at ?? undefined, sentAt: row.sent_at ?? undefined,
    receivedAt: row.received_at ?? undefined,
    declarationValid: row.declaration_valid === null ? undefined : Boolean(row.declaration_valid),
    transferredToUrnAt: row.transferred_to_urn_at ?? undefined, lateReceivedAt: row.late_received_at ?? undefined,
    destroyDueAt: row.destroy_due_at ?? undefined, destroyedAt: row.destroyed_at ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function mapTotal(row: TotalRow): ElectionVoteTotalRecord {
  return {
    id: row.id, electionId: row.election_id, officeType: row.office_type, candidateId: row.candidate_id,
    votes: row.votes, rank: row.rank ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function mapResult(row: ResultRow): ElectionResultRecord {
  return {
    id: row.id, electionId: row.election_id, officeType: row.office_type, candidateId: row.candidate_id,
    electedRank: row.elected_rank ?? undefined, lotRequired: Boolean(row.lot_required),
    lotDecidedAt: row.lot_decided_at ?? undefined, notifiedAt: row.notified_at ?? undefined,
    responseDueAt: row.response_due_at ?? undefined, acceptanceStatus: row.acceptance_status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function mapPhysical(row: PhysicalRow): ElectionPhysicalRecord {
  return {
    id: row.id, electionId: row.election_id, recordType: row.record_type,
    description: row.description ?? undefined, quantity: row.quantity,
    storageLocation: row.storage_location ?? undefined, sealedStatus: row.sealed_status ?? undefined,
    originalRequired: Boolean(row.original_required), handedOverAt: row.handed_over_at ?? undefined,
    handedOverTo: row.handed_over_to ?? undefined, notesMinimal: row.notes_minimal ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function loadElectionExecutionOverview(db: DatabaseAdapter, electionId: string): ElectionExecutionOverview {
  assertElectionExists(db, electionId);
  return {
    mailBallots: db.prepare<MailRow>('SELECT * FROM sbv_election_mail_ballots WHERE election_id=? ORDER BY created_at').all(electionId).map(mapMail),
    voteTotals: db.prepare<TotalRow>('SELECT * FROM sbv_election_vote_totals WHERE election_id=? ORDER BY office_type,rank,candidate_id').all(electionId).map(mapTotal),
    results: db.prepare<ResultRow>('SELECT * FROM sbv_election_results WHERE election_id=? ORDER BY office_type,elected_rank,candidate_id').all(electionId).map(mapResult),
    physicalRecords: db.prepare<PhysicalRow>('SELECT * FROM sbv_election_physical_records WHERE election_id=? ORDER BY record_type,created_at').all(electionId).map(mapPhysical),
    events: db.prepare<{ event_type: string; occurred_at: string; metadata_json_datensparsam: string }>(
      'SELECT event_type,occurred_at,metadata_json_datensparsam FROM sbv_election_events WHERE election_id=? ORDER BY occurred_at',
    ).all(electionId).map((row) => ({
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      metadata: JSON.parse(row.metadata_json_datensparsam) as Record<string, unknown>,
    })),
  };
}

export function assertElectionExists(db: DatabaseAdapter, electionId: string): void {
  if (!db.prepare<{ id: string }>('SELECT id FROM sbv_elections WHERE id=?').get(electionId)) {
    throw new Error('Wahlvorgang wurde nicht gefunden.');
  }
}

export function electionDeputyCount(db: DatabaseAdapter, electionId: string): number {
  return db.prepare<{ deputy_count: number }>('SELECT deputy_count FROM sbv_elections WHERE id=?').get(electionId)?.deputy_count ?? 1;
}

export function recordElectionEvent(
  db: DatabaseAdapter,
  electionId: string,
  eventType: string,
  metadata: Record<string, unknown>,
): void {
  const timestamp = electionNow();
  db.prepare(`
    INSERT INTO sbv_election_events(
      id,election_id,event_type,occurred_at,actor_role,metadata_json_datensparsam,created_at
    ) VALUES(?,?,?,?,?,?,?)
  `).run(randomUUID(), electionId, eventType, timestamp, 'election_body', JSON.stringify(metadata), timestamp);
}

export type ExecutionDeadlineKey =
  | 'result.acceptance'
  | 'result.announcement'
  | 'mailballot.late.destroy'
  | 'election.records.retain';

export class ElectionExecutionDeadlineCoordinator {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly deadlines: DeadlineService,
    private readonly policy: ElectionDeadlinePolicy,
  ) {}

  ensure(
    electionId: string,
    ruleKey: ExecutionDeadlineKey,
    sourceDate: string,
    dueDate: string,
    legalReference: string,
    title: string,
    discriminator?: string,
  ): string {
    const sourceEvent = discriminator ? `${ruleKey}:${discriminator}` : ruleKey;
    const existing = this.db.prepare<{ id: string }>(`
      SELECT id FROM deadlines
      WHERE process_type='election' AND process_id=? AND source_event=? AND due_at=? LIMIT 1
    `).get(electionId, sourceEvent, noon(dueDate));
    if (existing) return existing.id;
    const deadline = this.deadlines.create({
      processId: electionId, processType: 'election', deadlineType: 'legal_deadline', title,
      dueAt: noon(dueDate), legalBasis: legalReference, sourceEvent, severity: 'important',
      calculationMode: 'legal', isLegalDeadline: true,
    });
    this.db.prepare(`
      UPDATE deadlines SET rule_key=?,source_date=?,legal_rule_version=?,original_due_at=? WHERE id=?
    `).run(ruleKey, sourceDate.slice(0, 10), this.policy.legalRuleVersion, noon(dueDate), deadline.id);
    return deadline.id;
  }

  complete(electionId: string, ruleKey: string, discriminator: string, note: string): void {
    const deadline = this.db.prepare<{ id: string }>(`
      SELECT id FROM deadlines
      WHERE process_type='election' AND process_id=? AND source_event=? AND status IN ('open','overdue','suspended')
      ORDER BY created_at DESC LIMIT 1
    `).get(electionId, `${ruleKey}:${discriminator}`);
    if (deadline) this.deadlines.complete(deadline.id, note);
  }
}
