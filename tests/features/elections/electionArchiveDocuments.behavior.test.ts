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
  elections.saveVoter(election.id, {
    lastName: 'Müller', firstName: 'Jörg', eligibilityBasis: 'severely_disabled_confirmed',
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
      const preparation = new SbvElectionDocumentService(env.db, documents);
      const voterList = await preparation.generate(env.election.id, { kind: 'voter_list' });
      const voterListText = (await inspectPdf(await documents.read(voterList.id))).textByPage.join(' ');
      expect(voterListText).toContain('Alphabetische Wählerliste');
      expect(voterListText).toContain('Müller, Jörg');
      expect(voterListText).toContain('Statusbegründungen');

      const electionNotice = await preparation.generate(env.election.id, {
        kind: 'election_notice',
        notice: {
          issueDate: '2026-08-18', votingStartsAt: '2026-09-20 08:00', votingEndsAt: '2026-09-20 16:00',
          votingPlace: 'Raum A', countingPlaceAndTime: 'Raum A, 16:05', voterListInspectionPlace: 'SBV-Büro',
          voterListInspectionTimes: 'Mo-Fr 9-12', objectionDeadline: '2026-09-01', proposalDeadline: '2026-09-01',
          proposalSubmissionPlace: 'Wahlvorstand', representativeElectionStatement: 'Vertrauensperson wird gewählt',
          deputyElectionStatement: 'Eine Stellvertretung wird gewählt', requiredSupportSignatures: '3',
          mailBallotStatement: 'Schriftliche Stimmabgabe auf Verlangen', boardChairName: 'A. Vorsitz',
          secondBoardMemberName: 'B. Mitglied',
        },
      });
      const noticeText = (await inspectPdf(await documents.read(electionNotice.id))).textByPage.join(' ');
      expect(noticeText).toContain('Auszählung');
      expect(noticeText).toContain('Einsicht Wählerliste');
      expect(noticeText).toContain('Stützunterschriften');

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
      expect(archiveText).toContain('MENSCHENLESBARE GESAMT-WAHLAKTE');
      expect(archiveText).toContain('AUSZÄHLUNG');
      expect(archiveText).toContain('PHYSISCHE ORIGINALUNTERLAGEN');
      expect(archiveText).toContain('ersetzt gesetzlich oder organisatorisch aufzubewahrende');
      expect(archiveText).toContain('physische Originale, insbesondere Stimmzettel, nicht.');
      expect(archiveText).toContain('SHA-256');
      expect(archivePdf.hasStructureTree).toBe(true);
      expect(env.raw.prepare("SELECT COUNT(*) AS count FROM sbv_election_archive_exports WHERE election_id=? AND export_type='pdf_bundle'").get(env.election.id)).toMatchObject({ count: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, PDF_ARCHIVE_INTEGRATION_TIMEOUT_MS);
});
