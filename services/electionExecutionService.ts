import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import { ElectionLegalPolicy } from './electionLegalPolicy.js';
import { ElectionDeadlinePolicy } from './electionDeadlinePolicy.js';
import { DeadlineService } from './deadlineService.js';
import { RetentionLegalHoldService } from './retentionLegalHoldService.js';
import type { EmployerObligationService } from './employerObligationService.js';
import type { OfficeType } from '../src/domain/models/election.model.js';
import { ElectionExecutionRepository } from './electionExecutionRepository.js';
import {
  ElectionExecutionDeadlineCoordinator,
  assertElectionExists,
  cleanElectionText,
  electionDeputyCount,
  electionNow,
  loadElectionExecutionOverview,
  recordElectionEvent,
} from './electionExecutionSupport.js';
import type {
  ElectionCloseInput,
  ElectionDayChecklistInput,
  ElectionExecutionOverview,
  ElectionMailBallotRecord,
  ElectionPhysicalRecord,
  ElectionResultRecord,
  RecordElectionAcceptanceInput,
  RecordElectionLotInput,
  RecordElectionTotalsInput,
  SaveElectionMailBallotInput,
  SaveElectionPhysicalRecordInput,
} from '../src/domain/models/election-execution.model.js';

export class ElectionExecutionService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly deadlines = new DeadlineService(database),
    private readonly audit?: PersonalDataAuditLogService,
    private readonly legal = new ElectionLegalPolicy(),
    private readonly deadlinePolicy = new ElectionDeadlinePolicy(),
    private readonly holds = new RetentionLegalHoldService(database),
    private readonly obligations?: EmployerObligationService,
  ) {}

  overview(electionId: string): ElectionExecutionOverview {
    return loadElectionExecutionOverview(this.database, electionId);
  }

  saveMailBallot(electionId: string, input: SaveElectionMailBallotInput): ElectionMailBallotRecord {
    assertElectionExists(this.database, electionId);
    if (!this.database.prepare<{ id: string }>(
      'SELECT id FROM sbv_election_voters WHERE id=? AND election_id=?',
    ).get(input.voterId, electionId)) {
      throw new Error('Briefwahl kann nur einer Person der Wählerliste zugeordnet werden.');
    }

    return new DatabaseUnitOfWork(this.database).run(() => {
      let destroyDue: string | null = null;
      if (input.lateReceivedAt && input.announcementDate) {
        const snapshot = this.deadlinePolicy.calculate('mailballot.late.destroy', input.announcementDate);
        destroyDue = snapshot.dueOn;
        this.deadlineCoordinator().ensure(electionId, 'mailballot.late.destroy', input.announcementDate, snapshot.dueOn, snapshot.legalReference, 'Verspäteten Wahlbrief vernichten');
      }
      this.repository().saveMailBallot(electionId, input, destroyDue);
      recordElectionEvent(this.database, electionId, 'mail_ballot_updated', { late: Boolean(input.lateReceivedAt), declarationValid: input.declarationValid ?? null });
      this.auditMutation(electionId, 'mail_ballot', 'updated');
      return this.overview(electionId).mailBallots.find((item) => item.voterId === input.voterId)!;
    });
  }

  recordElectionDayChecklist(electionId: string, input: ElectionDayChecklistInput): ElectionExecutionOverview {
    assertElectionExists(this.database, electionId);
    recordElectionEvent(this.database, electionId, 'election_day_checklist', {
      secretMarkingConfirmed: input.secretMarkingConfirmed,
      ballotBoxSecured: input.ballotBoxSecured,
      electionBodyStaffingConfirmed: input.electionBodyStaffingConfirmed,
      helperRuleAvailable: input.helperRuleAvailable,
      publicCountPrepared: input.publicCountPrepared,
      recordedAt: input.recordedAt,
    });
    this.auditMutation(electionId, 'election_day_checklist', 'recorded');
    return this.overview(electionId);
  }

  recordTotals(electionId: string, input: RecordElectionTotalsInput): ElectionExecutionOverview {
    assertElectionExists(this.database, electionId);
    this.assertBallotCounts(input);
    if (!input.publicCountConfirmed) {
      throw new Error('Öffentliche Auszählung muss als Checkpunkt bestätigt werden.');
    }
    if (!input.candidateVotes.length) throw new Error('Auszählung benötigt Kandidatenstimmen.');

    const voteSum = input.candidateVotes.reduce((sum, item) => sum + item.votes, 0);
    const maxSelections = input.officeType === 'representative' ? 1 : electionDeputyCount(this.database, electionId);
    const plausibleMaximum = input.validBallots * maxSelections;
    if (voteSum > plausibleMaximum && !input.correctionReason?.trim()) {
      throw new Error('Die Stimmenzahl überschreitet den plausiblen Höchstwert. Bitte prüfen oder die manuelle Korrektur begründen.');
    }

    return new DatabaseUnitOfWork(this.database).run(() => {
      const rankings = this.legal.rankVoteTotals(input.candidateVotes.map((vote) => ({
        candidateId: vote.candidateId,
        officeType: input.officeType,
        votes: vote.votes,
      })));
      const candidateIds = new Set(this.database.prepare<{ id: string }>(
        'SELECT id FROM sbv_election_candidates WHERE election_id=? AND office_type=?',
      ).all(electionId, input.officeType).map((row) => row.id));
      if (rankings.some((ranking) => !candidateIds.has(ranking.candidateId))) {
        throw new Error('Auszählung enthält Kandidatur aus einem anderen Wahlgang.');
      }

      this.repository().replaceVoteTotals(electionId, input.officeType, rankings, electionDeputyCount(this.database, electionId));
      recordElectionEvent(this.database, electionId, 'count_recorded', {
        officeType: input.officeType,
        validBallots: input.validBallots,
        invalidBallots: input.invalidBallots,
        publicCountConfirmed: true,
        voteSum,
        correctionReason: input.correctionReason?.trim() || null,
      });
      this.auditMutation(electionId, 'count', input.officeType);
      return this.overview(electionId);
    });
  }

  recordLotDecision(electionId: string, input: RecordElectionLotInput): ElectionResultRecord {
    const tied = this.overview(electionId).results.filter(
      (result) => result.officeType === input.officeType && result.lotRequired,
    );
    const selected = tied.find((result) => result.candidateId === input.candidateId);
    if (!selected) {
      throw new Error('Losentscheid kann nur für eine dokumentierte Stimmengleichheit erfasst werden.');
    }
    const selectedRank = selected.electedRank;
    if (!selectedRank) throw new Error('Der Losentscheid betrifft keinen zu besetzenden Rang.');
    const tiedForRank = tied.filter((result) => result.electedRank === selectedRank);

    return new DatabaseUnitOfWork(this.database).run(() => {
      const timestamp = electionNow();
      for (const candidate of tiedForRank) {
        this.database.prepare(`
          UPDATE sbv_election_results
          SET elected_rank=?, acceptance_status=?, lot_required=0, lot_decided_at=?, updated_at=?
          WHERE id=?
        `).run(
          candidate.candidateId === input.candidateId ? selectedRank : null,
          candidate.candidateId === input.candidateId ? 'pending' : 'replaced',
          input.decidedAt,
          timestamp,
          candidate.id,
        );
      }
      recordElectionEvent(this.database, electionId, 'lot_decision', {
        officeType: input.officeType,
        rank: selectedRank,
        winnerCandidateId: input.candidateId,
      });
      this.auditMutation(electionId, 'lot', 'recorded');
      return this.overview(electionId).results.find((result) => result.candidateId === input.candidateId)!;
    });
  }

  recordAcceptance(electionId: string, input: RecordElectionAcceptanceInput): ElectionExecutionOverview {
    const current = this.overview(electionId).results.find((result) => result.id === input.resultId);
    if (!current) throw new Error('Wahlergebnis wurde nicht gefunden.');
    if (!current.electedRank) throw new Error('Nur eine aktuell gewählte Person kann die Wahl annehmen oder ablehnen.');
    const electedRank = current.electedRank;
    if (current.lotRequired) throw new Error('Vor der Benachrichtigung muss der erforderliche Losentscheid dokumentiert sein.');

    return new DatabaseUnitOfWork(this.database).run(() => {
      let dueDate = current.responseDueAt ?? null;
      if (input.notifiedAt && !dueDate) {
        const snapshot = this.deadlinePolicy.calculate('result.acceptance', input.notifiedAt);
        dueDate = snapshot.dueOn;
        this.deadlineCoordinator().ensure(
          electionId,
          'result.acceptance',
          input.notifiedAt,
          snapshot.dueOn,
          snapshot.legalReference,
          'Annahme der Wahl',
          input.resultId,
        );
      }

      this.database.prepare(`
        UPDATE sbv_election_results
        SET notified_at=COALESCE(?,notified_at), response_due_at=COALESCE(?,response_due_at),
            acceptance_status=?, updated_at=?
        WHERE id=?
      `).run(cleanElectionText(input.notifiedAt), dueDate, input.status, electionNow(), input.resultId);

      this.deadlineCoordinator().complete(electionId, 'result.acceptance', input.resultId, 'Wahlannahme geklärt');
      if (input.status === 'rejected') {
        this.promoteNext(electionId, current.officeType, electedRank, input.resultId);
      }

      const pending = this.database.prepare<{ count: number }>(`
        SELECT COUNT(*) AS count FROM sbv_election_results
        WHERE election_id=? AND elected_rank IS NOT NULL AND acceptance_status='pending'
      `).get(electionId)?.count ?? 0;
      const unresolvedLots = this.database.prepare<{ count: number }>(`
        SELECT COUNT(*) AS count FROM sbv_election_results
        WHERE election_id=? AND elected_rank IS NOT NULL AND lot_required=1
      `).get(electionId)?.count ?? 0;
      const roundsComplete = this.requiredRoundsHaveResults(electionId);
      const nextStatus = !roundsComplete ? 'counting' : pending || unresolvedLots ? 'acceptance_pending' : 'result_final';
      this.database.prepare('UPDATE sbv_elections SET status=?,updated_at=? WHERE id=?')
        .run(nextStatus, electionNow(), electionId);
      recordElectionEvent(this.database, electionId, 'acceptance_updated', {
        officeType: current.officeType,
        status: input.status,
        responseRecorded: Boolean(input.responseAt),
      });
      this.auditMutation(electionId, 'acceptance', input.status);
      return this.overview(electionId);
    });
  }

  savePhysicalRecord(electionId: string, input: SaveElectionPhysicalRecordInput): ElectionPhysicalRecord {
    assertElectionExists(this.database, electionId);
    const quantity = input.quantity ?? 1;
    if (!input.recordType.trim()) throw new Error('Originalunterlage benötigt einen Typ.');
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Menge muss nichtnegative ganze Zahl sein.');
    const id = this.repository().savePhysicalRecord(electionId, input);
    this.auditMutation(electionId, 'physical_record', 'updated');
    return this.overview(electionId).physicalRecords.find((item) => item.id === id)!;
  }

  close(electionId: string, input: ElectionCloseInput): void {
    const elected = this.overview(electionId).results.filter((result) => result.electedRank !== undefined);
    if (!this.requiredRoundsHaveResults(electionId)) {
      throw new Error('Wahl kann erst geschlossen werden, wenn alle erforderlichen Wahlgänge ausgezählt sind.');
    }
    if (!elected.length || elected.some((result) => result.acceptanceStatus === 'pending' || result.acceptanceStatus === 'rejected')) {
      throw new Error('Wahl kann erst mit endgültig angenommenem Ergebnis geschlossen werden.');
    }
    if (elected.some((result) => result.lotRequired)) {
      throw new Error('Ein erforderlicher Losentscheid ist noch nicht dokumentiert.');
    }
    if (!input.announcementStartedAt || !input.announcementEndedAt || !input.employerNotifiedAt || !input.councilNotifiedAt || !input.retentionUntil) {
      throw new Error('Bekanntmachungszeitraum, Mitteilungen und Aufbewahrungsfrist müssen dokumentiert sein.');
    }
    if (input.announcementEndedAt < input.announcementStartedAt) {
      throw new Error('Ende der Bekanntmachung darf nicht vor ihrem Beginn liegen.');
    }

    new DatabaseUnitOfWork(this.database).run(() => {
      const timestamp = electionNow();
      const announcement = this.deadlinePolicy.calculate('result.announcement', input.announcementStartedAt);
      const announcementDeadlineId = this.deadlineCoordinator().ensure(
        electionId,
        'result.announcement',
        input.announcementStartedAt,
        announcement.dueOn,
        announcement.legalReference,
        'Aushang des Wahlergebnisses beenden',
      );
      this.deadlines.complete(announcementDeadlineId, 'Bekanntmachungszeitraum dokumentiert beendet');

      const retention = this.deadlinePolicy.calculate('election.records.retain', input.retentionUntil);
      this.deadlineCoordinator().ensure(
        electionId,
        'election.records.retain',
        input.retentionUntil,
        retention.dueOn,
        retention.legalReference,
        'Wahlunterlagen bis Ende der Wahlperiode aufbewahren',
      );

      this.database.prepare(`
        UPDATE sbv_elections
        SET status='closed', retention_until=?, legal_hold_status=?, legal_hold_reason=?, updated_at=?
        WHERE id=?
      `).run(
        input.retentionUntil,
        input.challengePending ? 'active' : 'none',
        input.challengePending ? 'election.challenge.pending' : null,
        timestamp,
        electionId,
      );

      if (input.challengePending && !this.holds.hasActiveHold({ type: 'election', id: electionId })) {
        this.holds.place({ type: 'election', id: electionId }, 'election.challenge.pending', '§ 16 SchwbVWO');
      }
      this.ensureEmployerNotificationFollowUp(electionId);
      recordElectionEvent(this.database, electionId, 'election_closed', {
        announcementStartedAt: input.announcementStartedAt,
        announcementEndedAt: input.announcementEndedAt,
        employerNotified: true,
        councilNotified: true,
        challengePending: Boolean(input.challengePending),
      });
      this.auditMutation(electionId, 'election', 'closed');
    });
  }


  private requiredRoundsHaveResults(electionId: string): boolean { return this.repository().requiredRoundsHaveResults(electionId); }

  private assertBallotCounts(input: RecordElectionTotalsInput): void {
    for (const value of [input.validBallots, input.invalidBallots, ...input.candidateVotes.map((item) => item.votes)]) {
      if (!Number.isInteger(value) || value < 0) throw new Error('Stimmen- und Stimmzettelzahlen müssen nichtnegative ganze Zahlen sein.');
    }
  }

  private ensureEmployerNotificationFollowUp(electionId: string): void {
    const election = this.database.prepare<{ office_term_end: string | null }>(
      'SELECT office_term_end FROM sbv_elections WHERE id=?',
    ).get(electionId);
    const year = Number((election?.office_term_end ?? electionNow()).slice(0, 4));
    const scopeKey = `election:${electionId}`;
    const existing = this.database.prepare<{ id: string }>(`
      SELECT id FROM sbv_employer_obligation_reviews
      WHERE obligation_key='sbv_election_result_notification_163_8' AND scope_key=?
    `).get(scopeKey);
    if (existing) return;

    if (this.obligations) {
      this.obligations.save({
        obligationKey: 'sbv_election_result_notification_163_8',
        periodYear: year,
        scopeKey,
        status: 'requested',
      });
      return;
    }

    const timestamp = electionNow();
    this.database.prepare(`
      INSERT INTO sbv_employer_obligation_reviews(
        id,obligation_key,period_year,scope_key,status,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?)
    `).run(
      randomUUID(), 'sbv_election_result_notification_163_8', year, scopeKey,
      'requested', timestamp, timestamp,
    );
  }

  private promoteNext(electionId: string, officeType: OfficeType, rejectedRank: number, resultId: string): void {
    this.repository().promoteNext(electionId, officeType, rejectedRank, resultId);
  }

  private repository(): ElectionExecutionRepository { return new ElectionExecutionRepository(this.database); }

  private deadlineCoordinator(): ElectionExecutionDeadlineCoordinator {
    return new ElectionExecutionDeadlineCoordinator(this.database, this.deadlines, this.deadlinePolicy);
  }

  private auditMutation(electionId: string, entityType: string, status: string): void {
    this.audit?.append({
      action: 'update',
      subjectType: 'election',
      subjectId: electionId,
      purpose: 'SBV-Wahldurchführung dokumentiert',
      metadata: { entityType, status },
    });
  }
}
