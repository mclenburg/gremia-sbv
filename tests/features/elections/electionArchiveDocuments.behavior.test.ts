import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ElectionArchiveService } from '../../../services/electionArchiveService';
import { ElectionExecutionService } from '../../../services/electionExecutionService';
import { SbvElectionDocumentService } from '../../../services/sbvElectionDocumentService';
import { SbvElectionService } from '../../../services/sbvElectionService';
import { SbvOfficeWorkflowDocumentAdapter } from '../../../services/sbvOfficeWorkflowDocumentAdapter';
import { inspectPdf } from '../../helpers/pdf';

const PDF_ARCHIVE_INTEGRATION_TIMEOUT_MS = 40_000;

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
    eligibilityCheckDate: '2026-08-16', confirmedSeverelyDisabledCount: 50, confirmedEqualizedCount: 0,
    pendingEqualizationCount: 0, spatiallySeparated: false, electionDate: '2026-09-20',
    procedure: 'formal', deputyCount: 1,
  });
  const voter = elections.saveVoter(election.id, {
    lastName: 'Müller', firstName: 'Jörg', eligibilityBasis: 'severely_disabled_confirmed',
  });
  const secondVoter = elections.saveVoter(election.id, {
    lastName: 'Schulz', firstName: 'Kim', eligibilityBasis: 'severely_disabled_confirmed',
  });
  const thirdVoter = elections.saveVoter(election.id, {
    lastName: 'Weber', firstName: 'Robin', eligibilityBasis: 'severely_disabled_confirmed',
  });
  const candidate = elections.saveCandidate(election.id, {
    officeType: 'deputy', personSnapshot: 'Müller, Anna', consentAt: '2026-08-18', ageOnElectionDay: 30,
    monthsInOperation: 12, operationAgeMonths: 24, excludedFromRepresentativeBodyByLaw: false,
    notTemporaryEmployment: true,
  });
  elections.saveProposal(election.id, {
    receivedAt: '2026-08-18', validityStatus: 'valid', candidateIds: [candidate.id],
    supporterVoterIds: [voter.id, secondVoter.id, thirdVoter.id],
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
  it('erzeugt Korrekturaufforderung und Nachfrist mit konkreten Empfängern und Fristdaten', async () => {
    const env = setup();
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-election-notice-'));
    try {
      const elections = new SbvElectionService(env.db);
      const proposal = elections.saveProposal(env.election.id, {
        receivedAt: '2026-08-20', validityStatus: 'correction_required',
        correctionDueAt: '2026-08-25', invalidReason: 'Doppelte Stützunterschrift',
      });
      const documents = new SbvOfficeWorkflowDocumentAdapter(env.db, root);
      const preparation = new SbvElectionDocumentService(env.db, documents);
      await expect(preparation.generate(env.election.id, { kind: 'proposal_correction_notice' }))
        .rejects.toThrow(/Empfänger/);
      const correction = await preparation.generate(env.election.id, {
        kind: 'proposal_correction_notice', proposalId: proposal.id, recipientLabel: 'Frau Beispiel',
      });
      const correctionText = (await inspectPdf(await documents.read(correction.id))).textByPage.join(' ');
      expect(correctionText).toContain('Frau Beispiel');
      expect(correctionText).toContain('25.8.2026');
      expect(correctionText).toContain('Doppelte Stützunterschrift');
      expect(correctionText).not.toContain('gemäß gespeicherter zentraler Frist');

      const grace = elections.startGracePeriod(env.election.id, '2026-08-26');
      const announcement = await preparation.generate(env.election.id, { kind: 'proposal_grace_notice', proposalId: grace.id, graceOffice: 'deputy' });
      const announcementText = (await inspectPdf(await documents.read(announcement.id))).textByPage.join(' ');
      expect(announcementText).toContain('2.9.2026');
      expect(announcementText).not.toContain('gemäß gespeicherter zentraler Frist');
    } finally {
      env.raw.close();
      rmSync(root, { recursive: true, force: true });
    }
  }, PDF_ARCHIVE_INTEGRATION_TIMEOUT_MS);

  it('generates separate ballots and a standalone PDF archive with state, checksums and physical-original warning', async () => {
    const env = setup();
    const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-election-archive-'));
    try {
      const documents = new SbvOfficeWorkflowDocumentAdapter(env.db, root);
      const preparation = new SbvElectionDocumentService(env.db, documents);
      const voterList = await preparation.generate(env.election.id, { kind: 'voter_list' });
      const voterListText = (await inspectPdf(await documents.read(voterList.id))).textByPage.join(' ');
      expect(voterListText).toContain('Alphabetische Wählerliste');
      expect(voterListText).toContain('Müller, Jörg');
      expect(voterListText).not.toContain('Statusbegründungen');

      const electionNotice = await preparation.generate(env.election.id, {
        kind: 'election_notice',
        notice: {
          issueDate: '2026-08-18', votingStartsAt: '2026-09-20 08:00', votingEndsAt: '2026-09-20 16:00',
          votingPlace: 'Raum A', countingPlaceAndTime: 'Raum A, 16:05', voterListInspectionPlace: 'SBV-Büro',
          voterListInspectionTimes: 'Mo-Fr 9-12', ordinanceInspectionPlace: 'SBV-Büro', objectionDeadline: '2026-09-01', proposalDeadline: '2026-09-01',
          proposalSubmissionPlace: 'Wahlvorstand', proposalDisplayPlace: 'Aushang Foyer', representativeElectionStatement: 'Vertrauensperson wird gewählt',
          deputyElectionStatement: 'Eine Stellvertretung wird gewählt', requiredSupportSignatures: '3',
          mailBallotStatement: 'Schriftliche Stimmabgabe auf Verlangen', boardChairName: 'A. Vorsitz',
          secondBoardMemberName: 'B. Mitglied',
        },
      });
      const noticeText = (await inspectPdf(await documents.read(electionNotice.id))).textByPage.join(' ');
      expect(noticeText).toContain('Auszählung');
      expect(noticeText).toContain('Die Wählerliste liegt bei SBV-Büro');
      expect(noticeText).toContain('20.9.2026, 08:00 Uhr');
      expect(noticeText).toContain('Stützunterschriften');
      expect(noticeText).toContain('Aushang Foyer');
      expect(noticeText).toContain('Wahlordnung');
      expect(noticeText).not.toContain('Dokumentinhalt');
      const electionsForNotice = new SbvElectionService(env.db);
      electionsForNotice.saveCandidate(env.election.id, {
        officeType: 'deputy', personSnapshot: 'Nicht im Wahlvorschlag', consentAt: '2026-08-18', ageOnElectionDay: 30,
        monthsInOperation: 12, operationAgeMonths: 24, excludedFromRepresentativeBodyByLaw: false,
        notTemporaryEmployment: true,
      });
      const candidatesNotice = await preparation.generate(env.election.id, { kind: 'candidate_announcement' });
      const candidatesText = (await inspectPdf(await documents.read(candidatesNotice.id))).textByPage.join(' ');
      expect(candidatesText).toContain('Stellvertretung');
      expect(candidatesText).toContain('Müller, Anna');
      expect(candidatesText).not.toContain('Nicht im Wahlvorschlag');
      expect(candidatesText).not.toContain('Dokumentinhalt');

      const simplifiedService = new SbvElectionService(env.db);
      const simplified = simplifiedService.create({ kind: 'regular', electionDate: '2026-10-12' });
      env.db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
        'template.defaults.v1',
        JSON.stringify({
          'sbv.name': 'SBV Team Standort Nord',
          'sbv.signatur': 'Mit kollegialen Grüßen\nSBV Team Standort Nord',
          'unternehmen.name': 'Musterbetrieb',
          'standort.name': 'Standort Nord',
        }),
        '2026-08-26T10:00:00.000Z',
      );
      simplifiedService.configureSetup(simplified.id, {
        eligibilityCheckDate: '2026-08-20', confirmedSeverelyDisabledCount: 12, confirmedEqualizedCount: 2,
        pendingEqualizationCount: 0, spatiallySeparated: false, electionDate: '2026-10-12',
        procedure: 'simplified', deputyCount: 1,
      });
      const invitation = await preparation.generate(simplified.id, {
        kind: 'simplified_invitation',
        invitation: {
          meetingStartsAt: '2026-10-12T10:00:00.000Z',
          meetingPlace: 'Barrierefreier Konferenzraum A',
          accessibilityNote: 'Gebärdensprachdolmetschung kann bei der Wahlleitung angefordert werden.',
        },
      });
      const invitationText = (await inspectPdf(await documents.read(invitation.id))).textByPage.join(' ');
      expect(invitationText).toContain('Sehr geehrte Kolleginnen und Kollegen');
      expect(invitationText).toContain('Barrierefreier Konferenzraum A');
      expect(invitationText).toContain('Gebärdensprachdolmetschung');
      expect(invitationText).toContain('Musterbetrieb · Standort Nord');
      expect(invitationText).toContain('Die Wahlleitung');
      expect(invitationText).not.toContain('Mit kollegialen Grüßen');
      expect(invitationText).not.toContain('Wahl-ID');
      expect(invitationText).not.toContain('Rechtsregel');
      expect(invitationText).not.toContain('Prüfstatus');

      const archive = new ElectionArchiveService(env.db, documents);
      const electedResult = env.raw.prepare('SELECT id FROM sbv_election_results WHERE election_id=?').get(env.election.id) as { id: string };
      const notification = await archive.generate(env.election.id, { kind: 'elected_notification', resultId: electedResult.id });
      const notificationText = (await inspectPdf(await documents.read(notification.id))).textByPage.join(' ');
      expect(notificationText).toContain('Müller, Anna');
      expect(notificationText).toContain('Die Annahme der Wahl ist bereits dokumentiert');
      expect(notificationText).toContain('Empfangsbestätigung');
      expect(notificationText).not.toContain('Dokumentinhalt');
      expect(notificationText).not.toContain('Bitte Empfang bestätigen');
      const resultNotice = await archive.generate(env.election.id, { kind: 'result_announcement' });
      const resultText = (await inspectPdf(await documents.read(resultNotice.id))).textByPage.join(' ');
      expect(resultText).toContain('Stellvertretung');
      expect(resultText).toContain('Müller, Anna');
      expect(resultText).not.toContain('deputy');
      expect(resultText).not.toContain('Dokumentinhalt');
      const ballot = await archive.generate(env.election.id, { kind: 'ballot_deputy' });
      const ballotPdf = await inspectPdf(await documents.read(ballot.id));
      expect(ballotPdf.textByPage.join(' ')).toContain('Müller, Anna');
      expect(ballotPdf.textByPage.join(' ')).toContain('Keine Unterschrift auf dem Stimmzettel');

      const voter = env.raw.prepare("SELECT id FROM sbv_election_voters WHERE election_id=?").get(env.election.id) as { id: string };
      const mailBallotPackage = await archive.generate(env.election.id, {
        kind: 'mail_ballot_package',
        mailBallotPackage: {
          voterId: voter.id,
          voterPostalAddress: 'Musterstraße 12\n12345 Musterstadt',
          electionBoardPostalAddress: 'Wahlvorstand SBV\nBetrieb GmbH\nWahlweg 1\n12345 Musterstadt',
          votingEndsAt: '2026-09-20T16:00',
        },
      });
      const mailBallotPdf = await inspectPdf(await documents.read(mailBallotPackage.id));
      const mailBallotText = mailBallotPdf.textByPage.join(' ');
      expect(mailBallotPdf.textByPage.length).toBeGreaterThanOrEqual(4);
      expect(mailBallotText).toContain('Merkblatt zur schriftlichen Stimmabgabe');
      expect(mailBallotText).toContain('Jörg Müller');
      expect(mailBallotText).toContain('Müller, Anna');
      expect(mailBallotText).toContain('Persönliche Erklärung');
      expect(mailBallotText).toContain('SCHRIFTLICHE STIMMABGABE');
      expect(mailBallotText).toContain('Musterstraße 12');
      expect(mailBallotText).toContain('Wahlvorstand SBV');
      expect(mailBallotText).not.toContain('Wahl-ID');
      expect(mailBallotText).not.toContain('Rechtsregel');
      expect(mailBallotText).not.toContain('Gremia.SBV');
      expect(mailBallotPdf.hasStructureTree).toBe(true);

      const archiveRecord = await archive.exportPdfArchive(env.election.id);
      const archivePdf = await inspectPdf(await documents.read(archiveRecord.id));
      const archiveText = archivePdf.textByPage.join(' ');
      expect(archiveText).toContain('GESAMTWAHLAKTE');
      expect(archiveText).toContain('AUSZÄHLUNG');
      expect(archiveText).toContain('PHYSISCHE ORIGINALUNTERLAGEN');
      expect(archiveText).toContain('Physische Originale, insbesondere Stimmzettel, werden getrennt aufbewahrt.');
      expect(archiveText).toContain('SHA-256');
      expect(archiveText).toContain('Nachwahl Stellvertretung');
      expect(archiveText).toContain('ausdrücklich angenommen');
      expect(archiveText).not.toContain('deputy_by_election');
      expect(archiveText).not.toContain('accepted_explicit');
      expect(archiveText).not.toContain('Wahl-ID');
      expect(archiveText).not.toContain('Vorlagenversion');
      expect(archiveText).not.toContain('ohne Gremia.SBV lesbar');
      expect(archivePdf.hasStructureTree).toBe(true);
      expect(env.raw.prepare("SELECT COUNT(*) AS count FROM sbv_election_archive_exports WHERE election_id=? AND export_type='pdf_bundle'").get(env.election.id)).toMatchObject({ count: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, PDF_ARCHIVE_INTEGRATION_TIMEOUT_MS);
});
