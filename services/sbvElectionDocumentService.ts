import type { DatabaseAdapter } from './databaseService.js';
import {
  SbvOfficeWorkflowDocumentAdapter,
  type SbvOfficeDocumentRecord,
} from './sbvOfficeWorkflowDocumentAdapter.js';
import { ElectionPreparationRepository } from './electionPreparationRepository.js';
import { createAccessibleTextPdf } from './documents/pdfDocumentRenderer.js';
import type {
  ElectionNoticeDetails,
  ElectionRecord,
  GenerateElectionPreparationDocumentInput,
} from '../src/domain/models/election-workflow.model.js';

const TEMPLATE_VERSION = '0.9.7-C.1';

const DOCUMENT_TITLES: Record<GenerateElectionPreparationDocumentInput['kind'], string> = {
  setup_summary: 'Wahl-Setup',
  board_appointment: 'Bestellung Wahlvorstand',
  board_minutes: 'Niederschrift Wahlvorstand',
  voter_list: 'Wählerliste',
  election_notice: 'Wahlausschreiben',
  proposal_correction_notice: 'Aufforderung zur Korrektur',
  proposal_grace_notice: 'Nachfrist Wahlvorschläge',
  candidate_announcement: 'Bekanntmachung Kandidaturen',
  simplified_invitation: 'Einladung Wahlversammlung',
  election_leadership_minutes: 'Niederschrift Wahlleitung',
};

function noticeFields(notice: ElectionNoticeDetails): Array<[string, string]> {
  return [
    ['Erlassdatum', notice.issueDate],
    ['Beginn Stimmabgabe', notice.votingStartsAt],
    ['Ende Stimmabgabe', notice.votingEndsAt],
    ['Wahlort', notice.votingPlace],
    ['Auszählung', notice.countingPlaceAndTime],
    ['Einsicht Wählerliste', notice.voterListInspectionPlace],
    ['Einsichtzeiten', notice.voterListInspectionTimes],
    ['Einspruchsfrist', notice.objectionDeadline],
    ['Vorschlagsfrist', notice.proposalDeadline],
    ['Einreichungsort', notice.proposalSubmissionPlace],
    ['Vertrauensperson', notice.representativeElectionStatement],
    ['Stellvertretungen', notice.deputyElectionStatement],
    ['Stützunterschriften', notice.requiredSupportSignatures],
    ['Briefwahl', notice.mailBallotStatement],
    ['Vorsitz Wahlvorstand', notice.boardChairName],
    ['Weiteres Mitglied', notice.secondBoardMemberName],
  ];
}

export function validateElectionNoticeDetails(
  notice: ElectionNoticeDetails | undefined,
): ElectionNoticeDetails {
  if (!notice) throw new Error('Wahlausschreiben benötigt die 16 Pflichtangaben.');
  const missing = noticeFields(notice)
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  if (missing.length) {
    throw new Error(`Wahlausschreiben unvollständig: ${missing.join(', ')}.`);
  }
  return notice;
}

export class SbvElectionDocumentService {
  private readonly repo: ElectionPreparationRepository;

  constructor(
    db: DatabaseAdapter,
    private readonly documents: SbvOfficeWorkflowDocumentAdapter,
  ) {
    this.repo = new ElectionPreparationRepository(db);
  }

  async generate(
    electionId: string,
    input: GenerateElectionPreparationDocumentInput,
  ): Promise<SbvOfficeDocumentRecord> {
    const election = this.repo.getElection(electionId);
    if (!election) throw new Error('Wahlvorgang wurde nicht gefunden.');
    const title = input.titleOverride?.trim() || DOCUMENT_TITLES[input.kind];
    const plain = await createAccessibleTextPdf(title, this.lines(input, election));
    const record = await this.documents.store({
      owner: { type: 'election', id: electionId },
      title,
      filename: `${input.kind}-${electionId.slice(0, 8)}.pdf`,
      mimeType: 'application/pdf',
      purpose: input.kind,
      documentClass: 'generated_document',
      templateVersion: TEMPLATE_VERSION,
      legalRuleVersion: election.legalRuleVersion,
      plain,
    });
    if (input.kind === 'board_minutes' && input.boardSessionId) {
      this.repo.setSessionDocument(input.boardSessionId, record.id);
    }
    return record;
  }

  private lines(
    input: GenerateElectionPreparationDocumentInput,
    election: ElectionRecord,
  ): string[] {
    const id = election.id;
    const head = [
      `Wahl-ID: ${id}`,
      `Verfahren: ${election.procedure ?? 'noch nicht bestätigt'}`,
      `Rechtsregel: ${election.legalRuleVersion}`,
    ];
    const voters = this.repo.listVoters(id);
    const members = this.repo.listBoardMembers(id);
    const candidates = this.repo.listCandidates(id);

    switch (input.kind) {
      case 'setup_summary':
        return [
          ...head,
          `Wahlart: ${election.kind}`,
          `Wahlberechtigte Snapshot: ${election.eligibleCountSnapshot}`,
          `Mindestschwelle: ${election.minimumThresholdMet ? 'erfüllt' : 'nicht erfüllt'}`,
          `Räumlich getrennte Betriebsteile: ${election.spatiallySeparated ? 'ja' : 'nein'}`,
        ];
      case 'board_appointment':
        return [
          ...head,
          ...members.map((member) => (
            `${member.role}: ${member.name} | volljährig ${member.adultConfirmed ? 'ja' : 'nein'} | `
            + `beschäftigt ${member.employedConfirmed ? 'ja' : 'nein'}`
          )),
        ];
      case 'board_minutes': {
        const session = input.boardSessionId
          ? this.repo.listSessions(id).find((item) => item.id === input.boardSessionId)
          : undefined;
        if (!session) throw new Error('Niederschrift benötigt eine Wahlvorstandssitzung.');
        return [
          ...head,
          `Sitzung: ${session.startsAt}`,
          `Teilnehmende: ${session.participants.join(', ')}`,
          `Beschlüsse: ${session.decisionsText ?? '-'}`,
        ];
      }
      case 'voter_list':
        return [
          ...head,
          'Alphabetische Wählerliste',
          ...voters.filter((voter) => voter.listStatus === 'eligible').map((voter) => (
            `${voter.lastName}, ${voter.firstName}`
            + `${voter.birthDate ? ` | ${voter.birthDate}` : ''}`
            + `${voter.orgUnit ? ` | ${voter.orgUnit}` : ''}`
          )),
          'Keine GdB-Werte oder Statusbegründungen enthalten.',
        ];
      case 'election_notice': {
        if (election.procedure !== 'formal') {
          throw new Error('Wahlausschreiben gehört zum förmlichen Verfahren.');
        }
        const notice = validateElectionNoticeDetails(input.notice);
        return [
          ...head,
          ...noticeFields(notice).map(([label, value], index) => `${index + 1}. ${label}: ${value}`),
        ];
      }
      case 'candidate_announcement':
        return [
          ...head,
          'Vertrauensperson',
          ...candidates.filter((item) => item.officeType === 'representative')
            .map((item) => item.personSnapshot).sort((a, b) => a.localeCompare(b, 'de')),
          'Stellvertretung',
          ...candidates.filter((item) => item.officeType === 'deputy')
            .map((item) => item.personSnapshot).sort((a, b) => a.localeCompare(b, 'de')),
        ];
      case 'simplified_invitation':
        if (election.procedure !== 'simplified') {
          throw new Error('Einladung zur Wahlversammlung gehört zum vereinfachten Verfahren.');
        }
        return [
          ...head,
          'Einladung zur Wahlversammlung',
          'Wahlzweck: Wahl der Schwerbehindertenvertretung',
          `Termin: ${election.electionDate ?? 'noch einzutragen'}`,
        ];
      case 'election_leadership_minutes':
        return [
          ...head,
          ...members.filter((member) => ['election_leader', 'assistant'].includes(member.role))
            .map((member) => `${member.role}: ${member.name}`),
          'Es werden nur Ergebnisse der Wahlleitung dokumentiert, keine Einzelstimmen.',
        ];
      case 'proposal_correction_notice':
        return [
          ...head,
          'Klärungs-/Korrekturaufforderung',
          'Frist: drei Arbeitstage gemäß gespeicherter zentraler Frist.',
        ];
      case 'proposal_grace_notice':
        return [
          ...head,
          'Nachfrist für Wahlvorschläge',
          'Frist: eine Woche gemäß gespeicherter zentraler Frist.',
        ];
    }
  }
}
