import type { DatabaseAdapter } from './databaseService.js';
import { ELECTION_LEGAL_RULE_VERSION } from '../src/domain/models/election.model.js';
import { daysFromNow, run } from './demoSeedSupport.js';

function dateFromNow(days: number): string {
  return daysFromNow(days).slice(0, 10);
}

function seedElection(db: DatabaseAdapter, timestamp: string): void {
  const electionId = 'demo-election-01';
  const electionDate = dateFromNow(60);

  run(
    db,
    `INSERT INTO sbv_elections (
      id, kind, procedure, procedure_confirmed_at, procedure_decision_note,
      legal_rule_version, status, election_date, incumbent_term_end,
      office_term_start, office_term_end, calculated_next_regular_election_period,
      eligibility_check_date, eligible_disabled_employee_count,
      minimum_threshold_met, eligibility_check_basis, spatially_separated,
      eligible_count_snapshot, deputy_count, deputy_count_locked_at,
      retention_until, legal_hold_status, created_at, updated_at
    ) VALUES (?, 'regular', 'formal', ?, ?, ?, 'ballots_ready', ?, ?, ?, ?, ?, ?, 8, 1, ?, 0, 8, 1, ?, ?, 'none', ?, ?)`,
    electionId,
    dateFromNow(-45),
    'Demo-Wahl: Förmliches Verfahren bei räumlich zusammenhängendem Betrieb.',
    ELECTION_LEGAL_RULE_VERSION,
    electionDate,
    dateFromNow(65),
    dateFromNow(61),
    dateFromNow(1_521),
    `${new Date().getUTCFullYear() + 4}: nächster regelmäßiger Wahlzeitraum`,
    dateFromNow(-50),
    JSON.stringify({
      confirmedSeverelyDisabledCount: 6,
      confirmedEqualizedCount: 2,
      pendingEqualizationCount: 1,
      demoData: true,
    }),
    dateFromNow(-20),
    dateFromNow(1_521),
    timestamp,
    timestamp,
  );

  seedElectionVoters(db, timestamp, electionId);
  seedElectionCandidates(db, timestamp, electionId);
  seedElectionBoard(db, timestamp, electionId);

  run(
    db,
    `INSERT INTO sbv_election_mail_ballots (
      id, election_id, voter_id, requested_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    'demo-election-mail-ballot-01',
    electionId,
    'demo-election-voter-01',
    dateFromNow(-1),
    timestamp,
    timestamp,
  );
}

function seedElectionVoters(db: DatabaseAdapter, timestamp: string, electionId: string): void {
  const voters = [
    ['Müller', 'Jörg', 'IT-Betrieb', 'severely_disabled_confirmed'],
    ['Özdemir', 'Aylin', 'Service Desk', 'equalized_confirmed'],
    ['Krüger', 'Nora', 'Entwicklung', 'severely_disabled_confirmed'],
    ['Nguyen', 'Minh', 'Personal', 'severely_disabled_confirmed'],
    ['Schäfer', 'René', 'Finanzen', 'equalized_confirmed'],
    ['Groß', 'Leonie', 'IT-Betrieb', 'severely_disabled_confirmed'],
    ['Kaya', 'Yasin', 'Service Desk', 'severely_disabled_confirmed'],
    ['Weiß', 'Sofia', 'Entwicklung', 'severely_disabled_confirmed'],
  ] as const;

  voters.forEach(([lastName, firstName, orgUnit, eligibilityBasis], index) => {
    run(
      db,
      `INSERT INTO sbv_election_voters (
        id, election_id, last_name, first_name, org_unit, eligibility_basis,
        eligibility_verified_at, list_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'eligible', ?, ?)`,
      `demo-election-voter-${String(index + 1).padStart(2, '0')}`,
      electionId,
      lastName,
      firstName,
      orgUnit,
      eligibilityBasis,
      dateFromNow(-50),
      timestamp,
      timestamp,
    );
  });
}

function seedElectionCandidates(db: DatabaseAdapter, timestamp: string, electionId: string): void {
  [
    ['demo-election-candidate-representative-01', 'representative', 'Müller, Anna'],
    ['demo-election-candidate-representative-02', 'representative', 'Özdemir, Cem'],
    ['demo-election-candidate-deputy-01', 'deputy', 'Krüger, Nora'],
    ['demo-election-candidate-deputy-02', 'deputy', 'Nguyen, Minh'],
  ].forEach(([candidateId, officeType, personSnapshot], index) => {
    run(
      db,
      `INSERT INTO sbv_election_candidates (
        id, election_id, office_type, person_snapshot, birth_date, occupation,
        consent_at, eligibility_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'policy_eligible', ?, ?)`,
      candidateId,
      electionId,
      officeType,
      personSnapshot,
      `${1980 + index}-0${index + 1}-15`,
      ['Systemadministration', 'Personalreferat', 'Entwicklung', 'Service Desk'][index],
      dateFromNow(-25 + index),
      timestamp,
      timestamp,
    );
  });
}

function seedElectionBoard(db: DatabaseAdapter, timestamp: string, electionId: string): void {
  [
    ['chair', 'Mara Sommer'],
    ['member', 'Jonas Neumann'],
    ['member', 'Samira Schuster'],
  ].forEach(([role, name], index) => {
    run(
      db,
      `INSERT INTO sbv_election_board_members (
        id, election_id, role, name, employed_confirmed, adult_confirmed,
        appointed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      `demo-election-board-${String(index + 1).padStart(2, '0')}`,
      electionId,
      role,
      name,
      dateFromNow(-45),
      timestamp,
      timestamp,
    );
  });
}

function seedParticipationViolations(db: DatabaseAdapter, timestamp: string): void {
  const records = [
    {
      id: 'demo-violation-general-01',
      stage: 'request',
      status: 'open',
      violationType: 'implementation_without_participation',
      sourceContextType: 'general_employer_practice',
      sourceContextId: 'demo-violation-general-01',
      caseId: null,
      relatedCaseMeasureId: null,
      subject: 'Allgemeine Anordnung zu Arztbesuchen ohne SBV-Beteiligung',
      measureDescription: 'Der Arbeitgeber kündigt eine betriebsweite Einschränkung bezahlter Freistellungen für notwendige Arztbesuche an.',
      wrongBehavior: 'Die SBV wurde vor der allgemeinen arbeitgeberseitigen Maßnahme nicht unterrichtet und nicht angehört.',
      requiredBehavior: 'Die Umsetzung aussetzen, die SBV vollständig unterrichten und vor einer Entscheidung anhören.',
      followUpDueAt: daysFromNow(7),
    },
    {
      id: 'demo-violation-measure-01',
      stage: 'formal_objection',
      status: 'sent',
      violationType: 'incomplete_information',
      sourceContextType: 'case_measure_participation',
      sourceContextId: 'demo-measure-01-sbv_participation',
      caseId: 'demo-case-01',
      relatedCaseMeasureId: 'demo-measure-01-sbv_participation',
      subject: 'Unvollständige Unterrichtung vor geplanter Versetzung',
      measureDescription: 'Geplante Versetzung einer beschäftigten Person in einen anderen Arbeitsbereich.',
      wrongBehavior: 'Belastungsprofil und Auswirkungen auf den behinderungsgerechten Arbeitsplatz fehlen in den Unterlagen.',
      requiredBehavior: 'Fehlende Unterlagen nachreichen und die Entscheidung bis zur vollständigen Beteiligung aussetzen.',
      followUpDueAt: daysFromNow(5),
    },
  ] as const;

  records.forEach((record, index) => {
    run(
      db,
      `INSERT INTO sbv_participation_violations (
        id, stage, status, violation_type, source_context_type, source_context_id,
        case_id, related_case_measure_id, subject, measure_description,
        wrong_behavior, required_behavior, consequence_warning, legal_basis,
        follow_up_due_at, created_at, updated_at, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.stage,
      record.status,
      record.violationType,
      record.sourceContextType,
      record.sourceContextId,
      record.caseId,
      record.relatedCaseMeasureId,
      record.subject,
      record.measureDescription,
      record.wrongBehavior,
      record.requiredBehavior,
      'Bei fortgesetzter Umsetzung sind weitere rechtliche Schritte zu prüfen.',
      '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX',
      record.followUpDueAt,
      timestamp,
      timestamp,
      record.status === 'sent' ? daysFromNow(-1) : null,
    );
    run(
      db,
      `INSERT INTO sbv_participation_violation_events (
        id, violation_id, event_type, to_status, note, created_at
      ) VALUES (?, ?, 'created', ?, ?, ?)`,
      `demo-violation-event-${String(index + 1).padStart(2, '0')}`,
      record.id,
      record.status,
      'Synthetisches Beispiel für Demo, Schulung und Funktionsprüfung.',
      timestamp,
    );
  });
}

export function seedWorkflowExamples(db: DatabaseAdapter, timestamp: string): void {
  seedElection(db, timestamp);
  seedParticipationViolations(db, timestamp);
}
