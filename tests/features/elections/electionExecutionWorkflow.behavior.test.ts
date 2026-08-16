import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionExecutionService } from '../../../services/electionExecutionService';
import { SbvElectionService } from '../../../services/sbvElectionService';

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

function environment(kind: 'regular' | 'deputy_by_election' = 'regular') {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const db = new SqliteAdapter(raw);
  const elections = new SbvElectionService(db);
  const election = elections.create({
    kind,
    triggerReason: kind === 'deputy_by_election' ? 'Nachwahl' : undefined,
    electionDate: '2026-10-20',
    incumbentTermEnd: '2028-04-26',
  });
  elections.configureSetup(election.id, {
    eligibilityCheckDate: '2026-08-16',
    confirmedSeverelyDisabledCount: 50,
    confirmedEqualizedCount: 0,
    pendingEqualizationCount: 0,
    spatiallySeparated: false,
    electionDate: '2026-10-20',
    procedure: 'formal',
    deputyCount: 1,
  });
  const voter = elections.saveVoter(election.id, {
    lastName: 'Wahl', firstName: 'Berechtigt', eligibilityBasis: 'severely_disabled_confirmed',
  });
  const representativeA = elections.saveCandidate(election.id, {
    officeType: 'representative', personSnapshot: 'Alice A', consentAt: '2026-08-18',
    ageOnElectionDay: 30, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  const representativeB = elections.saveCandidate(election.id, {
    officeType: 'representative', personSnapshot: 'Bob B', consentAt: '2026-08-18',
    ageOnElectionDay: 31, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  const deputyA = elections.saveCandidate(election.id, {
    officeType: 'deputy', personSnapshot: 'Dana D', consentAt: '2026-08-18',
    ageOnElectionDay: 32, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  const deputyB = elections.saveCandidate(election.id, {
    officeType: 'deputy', personSnapshot: 'Eva E', consentAt: '2026-08-18',
    ageOnElectionDay: 33, monthsInOperation: 12, operationAgeMonths: 24,
    excludedFromRepresentativeBodyByLaw: false, notTemporaryEmployment: true,
  });
  return {
    raw,
    db,
    elections,
    execution: new ElectionExecutionService(db),
    election,
    voter,
    representativeA,
    representativeB,
    deputyA,
    deputyB,
  };
}

function recordNormalResults(env: ReturnType<typeof environment>) {
  env.execution.recordTotals(env.election.id, {
    officeType: 'representative', validBallots: 10, invalidBallots: 1, publicCountConfirmed: true,
    candidateVotes: [
      { candidateId: env.representativeA.id, votes: 7 },
      { candidateId: env.representativeB.id, votes: 3 },
    ],
  });
  env.execution.recordTotals(env.election.id, {
    officeType: 'deputy', validBallots: 10, invalidBallots: 1, publicCountConfirmed: true,
    candidateVotes: [
      { candidateId: env.deputyA.id, votes: 6 },
      { candidateId: env.deputyB.id, votes: 4 },
    ],
  });
}

describe('SBV election execution and close 0.9.7-D', () => {
  it('tracks late mail ballots without storing any individual vote content', () => {
    const env = environment();
    const saved = env.execution.saveMailBallot(env.election.id, {
      voterId: env.voter.id,
      requestedAt: '2026-09-01',
      sentAt: '2026-09-02',
      lateReceivedAt: '2026-10-21',
      announcementDate: '2026-10-22',
      declarationValid: true,
    });
    expect(saved).toMatchObject({ voterId: env.voter.id, lateReceivedAt: '2026-10-21', destroyDueAt: '2026-11-22' });
    const columns = env.raw.prepare('PRAGMA table_info(sbv_election_mail_ballots)').all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).not.toEqual(expect.arrayContaining(['candidate_id', 'vote', 'ballot_content']));
    expect(env.raw.prepare("SELECT rule_key FROM deadlines WHERE process_id=? AND rule_key='mailballot.late.destroy'").get(env.election.id)).toMatchObject({ rule_key: 'mailballot.late.destroy' });
  });

  it('records election-day checkpoints as status only and does not block on incomplete documentation', () => {
    const env = environment();
    const overview = env.execution.recordElectionDayChecklist(env.election.id, {
      secretMarkingConfirmed: true,
      ballotBoxSecured: true,
      electionBodyStaffingConfirmed: false,
      helperRuleAvailable: true,
      publicCountPrepared: false,
      recordedAt: '2026-10-20',
    });
    expect(overview.events.at(-1)).toMatchObject({
      eventType: 'election_day_checklist',
      metadata: { electionBodyStaffingConfirmed: false, publicCountPrepared: false },
    });
  });

  it('never decides a tie automatically and only records the election body lot decision', () => {
    const env = environment();
    const counted = env.execution.recordTotals(env.election.id, {
      officeType: 'representative', validBallots: 10, invalidBallots: 0, publicCountConfirmed: true,
      candidateVotes: [
        { candidateId: env.representativeA.id, votes: 5 },
        { candidateId: env.representativeB.id, votes: 5 },
      ],
    });
    const tied = counted.results.filter((result) => result.officeType === 'representative');
    expect(tied).toHaveLength(2);
    expect(tied.every((result) => result.lotRequired && result.electedRank === 1)).toBe(true);
    expect(() => env.execution.recordAcceptance(env.election.id, {
      resultId: tied[0].id, notifiedAt: '2026-10-20', responseAt: '2026-10-20', status: 'accepted_explicit',
    })).toThrow(/Losentscheid/);
    const winner = env.execution.recordLotDecision(env.election.id, {
      officeType: 'representative', candidateId: env.representativeB.id, decidedAt: '2026-10-20',
    });
    expect(winner).toMatchObject({ candidateId: env.representativeB.id, electedRank: 1, lotRequired: false });
    expect(env.execution.overview(env.election.id).results.find((result) => result.candidateId === env.representativeA.id)).toMatchObject({ electedRank: undefined, acceptanceStatus: 'replaced' });
  });

  it('promotes the next rank after a documented rejection and closes the old acceptance deadline', () => {
    const env = environment();
    recordNormalResults(env);
    const first = env.execution.overview(env.election.id).results.find((result) => result.candidateId === env.representativeA.id)!;
    const after = env.execution.recordAcceptance(env.election.id, {
      resultId: first.id, notifiedAt: '2026-10-20', responseAt: '2026-10-21', status: 'rejected',
    });
    expect(after.results.find((result) => result.candidateId === env.representativeA.id)).toMatchObject({ acceptanceStatus: 'replaced', electedRank: undefined });
    expect(after.results.find((result) => result.candidateId === env.representativeB.id)).toMatchObject({ acceptanceStatus: 'pending', electedRank: 1 });
    expect(env.raw.prepare("SELECT status FROM deadlines WHERE source_event=?").get(`result.acceptance:${first.id}`)).toMatchObject({ status: 'done' });
  });

  it('requires both election rounds, creates exactly one §163(8) follow-up and applies an explicit legal hold', () => {
    const env = environment();
    recordNormalResults(env);
    for (const result of env.execution.overview(env.election.id).results.filter((item) => item.electedRank !== undefined)) {
      env.execution.recordAcceptance(env.election.id, {
        resultId: result.id, notifiedAt: '2026-10-20', responseAt: '2026-10-20', status: 'accepted_explicit',
      });
    }
    const closeInput = {
      announcementStartedAt: '2026-10-22',
      announcementEndedAt: '2026-11-05',
      employerNotifiedAt: '2026-10-22',
      councilNotifiedAt: '2026-10-22',
      retentionUntil: '2028-04-26',
      challengePending: true,
    } as const;
    env.execution.close(env.election.id, closeInput);
    env.execution.close(env.election.id, closeInput);
    expect(env.raw.prepare('SELECT status,retention_until,legal_hold_status FROM sbv_elections WHERE id=?').get(env.election.id)).toMatchObject({ status: 'closed', retention_until: '2028-04-26', legal_hold_status: 'active' });
    expect(env.raw.prepare("SELECT COUNT(*) AS count FROM sbv_employer_obligation_reviews WHERE obligation_key='sbv_election_result_notification_163_8' AND scope_key=?").get(`election:${env.election.id}`)).toMatchObject({ count: 1 });
    expect(env.raw.prepare("SELECT COUNT(*) AS count FROM sbv_retention_legal_holds WHERE owner_type='election' AND owner_id=? AND released_at IS NULL").get(env.election.id)).toMatchObject({ count: 1 });
    expect(env.raw.prepare("SELECT COUNT(*) AS count FROM deadlines WHERE process_id=? AND rule_key='result.announcement' AND status IN ('open','overdue')").get(env.election.id)).toMatchObject({ count: 0 });
  });

  it('rejects an implausible aggregate count unless the election body documents a correction reason', () => {
    const env = environment();
    expect(() => env.execution.recordTotals(env.election.id, {
      officeType: 'representative', validBallots: 1, invalidBallots: 0, publicCountConfirmed: true,
      candidateVotes: [
        { candidateId: env.representativeA.id, votes: 2 },
        { candidateId: env.representativeB.id, votes: 0 },
      ],
    })).toThrow(/plausiblen Höchstwert/);
    expect(() => env.execution.recordTotals(env.election.id, {
      officeType: 'representative', validBallots: 1, invalidBallots: 0, publicCountConfirmed: true,
      correctionReason: 'Auszählungsniederschrift nach erneuter Prüfung bestätigt.',
      candidateVotes: [
        { candidateId: env.representativeA.id, votes: 2 },
        { candidateId: env.representativeB.id, votes: 0 },
      ],
    })).not.toThrow();
  });
});
