import type { DatabaseAdapter } from './databaseService.js';
import {
  SbvOfficeWorkflowDocumentAdapter,
  type SbvOfficeDocumentRecord,
} from './sbvOfficeWorkflowDocumentAdapter.js';
import { ElectionPreparationRepository } from './electionPreparationRepository.js';
import {
  externalLetterDocument,
  legalRecordDocument,
  list,
  paragraph,
  publicNoticeDocument,
  section,
  type PdfDocumentDefinition,
} from './documents/pdfDocumentDefinition.js';
import { PdfDocumentGenerationService } from './documents/pdfDocumentGenerationService.js';
import type {
  ElectionNoticeDetails,
  ElectionRecord,
  GenerateElectionPreparationDocumentInput,
} from '../src/domain/models/election-workflow.model.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';

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
  if (!notice) throw new ApplicationError('VALIDATION_FAILED', 'Wahlausschreiben benötigt die 16 Pflichtangaben.');
  const missing = noticeFields(notice)
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  if (missing.length) {
    throw new ApplicationError('VALIDATION_FAILED', `Wahlausschreiben unvollständig: ${missing.join(', ')}.`);
  }
  return notice;
}

export class SbvElectionDocumentService {
  private readonly repo: ElectionPreparationRepository;
  private readonly pdfDocuments = new PdfDocumentGenerationService();

  constructor(
    database: DatabaseAdapter,
    private readonly documents: SbvOfficeWorkflowDocumentAdapter,
  ) {
    this.repo = new ElectionPreparationRepository(database);
  }

  async generate(
    electionId: string,
    input: GenerateElectionPreparationDocumentInput,
  ): Promise<SbvOfficeDocumentRecord> {
    const election = this.repo.getElection(electionId);
    if (!election) throw new Error('Wahlvorgang wurde nicht gefunden.');
    const title = input.titleOverride?.trim() || DOCUMENT_TITLES[input.kind];
    const plain = await this.pdfDocuments.generate({
      source: 'election',
      privacyProfile: 'lawful_personal_data',
      definition: this.definition(title, input, election),
    });
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

  readDocument(documentId: string): Promise<Buffer> {
    return this.documents.read(documentId);
  }

  private lines(
    input: GenerateElectionPreparationDocumentInput,
    election: ElectionRecord,
  ): string[] {
    const id = election.id;
    const procedure = election.procedure === 'simplified' ? 'vereinfachtes Wahlverfahren' : election.procedure === 'formal' ? 'förmliches Wahlverfahren' : 'Wahlverfahren';
    const head = [`Verfahren: ${procedure}`];
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
        if (!session) throw new ApplicationError('VALIDATION_FAILED', 'Niederschrift benötigt eine Wahlvorstandssitzung.');
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
          throw new ApplicationError('VALIDATION_FAILED', 'Wahlausschreiben gehört zum förmlichen Verfahren.');
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
          throw new ApplicationError('VALIDATION_FAILED', 'Einladung zur Wahlversammlung gehört zum vereinfachten Verfahren.');
        }
        return [];
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

  private definition(
    title: string,
    input: GenerateElectionPreparationDocumentInput,
    election: ElectionRecord,
  ): PdfDocumentDefinition {
    if (input.kind === 'simplified_invitation') {
      if (election.procedure !== 'simplified') {
        throw new ApplicationError('VALIDATION_FAILED', 'Einladung zur Wahlversammlung gehört zum vereinfachten Verfahren.');
      }
      const invitation = input.invitation;
      if (!invitation?.meetingStartsAt.trim() || !invitation.meetingPlace.trim()) {
        throw new ApplicationError('VALIDATION_FAILED', 'Die Einladung benötigt Termin, Uhrzeit und Ort der Wahlversammlung.');
      }
      const meeting = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'short' })
        .format(new Date(invitation.meetingStartsAt));
      return externalLetterDocument({
        title,
        sender: ['Wahlleitung der Schwerbehindertenvertretungswahl'],
        recipient: ['An die wahlberechtigten Beschäftigten des Betriebs'],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: 'Einladung zur Wahlversammlung',
        blocks: [
          paragraph('Sehr geehrte Kolleginnen und Kollegen,'),
          paragraph('hiermit laden wir Sie zur Wahlversammlung ein. In der Wahlversammlung wird die Schwerbehindertenvertretung gewählt.'),
          section('Termin und Ort', [paragraph(meeting), paragraph(invitation.meetingPlace)]),
          section('Gegenstand', [paragraph('Wahl der Vertrauensperson der schwerbehinderten Menschen und der stellvertretenden Mitglieder.')]),
          paragraph(invitation.accessibilityNote?.trim() || 'Bitte teilen Sie der Wahlleitung frühzeitig mit, wenn Sie für Ihre Teilnahme Unterstützung oder eine barrierefreie Anpassung benötigen.'),
          paragraph('Mit freundlichen Grüßen\nDie Wahlleitung'),
        ],
      });
    }
    const blocks = [section('Dokumentinhalt', [list(this.lines(input, election))])];
    if (input.kind === 'election_notice' || input.kind === 'candidate_announcement' || input.kind === 'proposal_grace_notice') {
      return publicNoticeDocument(title, 'Wahl der Schwerbehindertenvertretung', blocks);
    }
    if (input.kind === 'proposal_correction_notice') {
      return externalLetterDocument({
        title,
        sender: ['Wahlvorstand der Schwerbehindertenvertretungswahl'],
        recipient: ['An die einreichende Person oder Vorschlagsvertretung'],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: title,
        blocks: [paragraph('Sehr geehrte Damen und Herren,'), ...blocks, paragraph('Mit freundlichen Grüßen\nDer Wahlvorstand')],
      });
    }
    return legalRecordDocument(
      title,
      'Wahl der Schwerbehindertenvertretung',
      input.kind === 'voter_list' ? 'Vertrauliches Wahldokument' : 'Rechtlich relevantes Wahldokument',
      blocks,
    );
  }
}
