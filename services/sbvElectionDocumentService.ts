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
import {
  appendOperationContext,
  documentDefaultsForDatabase,
  operationContextLine,
} from './documents/documentIdentityPolicy.js';
import type {
  ElectionNoticeDetails,
  ElectionRecord,
  GenerateElectionPreparationDocumentInput,
} from '../src/domain/models/election-workflow.model.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';

const TEMPLATE_VERSION = '0.9.7-C.1';

function displayDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new ApplicationError('VALIDATION_FAILED', 'Das gespeicherte Fristdatum ist ungültig.');
  return new Intl.DateTimeFormat('de-DE').format(date);
}

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validDateTime(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && validDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60);
}

function displayDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) throw new ApplicationError('VALIDATION_FAILED', 'Datum und Uhrzeit der Stimmabgabe sind ungültig.');
  return `${displayDate(match[0])}, ${match[4]}:${match[5]} Uhr`;
}

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
    ['Einsicht Wahlordnung', notice.ordinanceInspectionPlace],
    ['Einspruchsfrist', notice.objectionDeadline],
    ['Vorschlagsfrist', notice.proposalDeadline],
    ['Einreichungsort', notice.proposalSubmissionPlace],
    ['Bekanntmachungsort Wahlvorschläge', notice.proposalDisplayPlace],
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
  if (!notice) throw new ApplicationError('VALIDATION_FAILED', 'Angaben für das Wahlausschreiben fehlen.');
  const missing = noticeFields(notice)
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);
  if (missing.length) {
    throw new ApplicationError('VALIDATION_FAILED', `Wahlausschreiben unvollständig: ${missing.join(', ')}.`);
  }
  for (const [label, value] of [
    ['Erlassdatum', notice.issueDate], ['Einspruchsfrist', notice.objectionDeadline],
    ['Vorschlagsfrist', notice.proposalDeadline],
  ]) {
    if (!validDate(value)) throw new ApplicationError('VALIDATION_FAILED', `${label} hat kein gültiges Datum.`);
  }
  for (const [label, value] of [
    ['Beginn Stimmabgabe', notice.votingStartsAt], ['Ende Stimmabgabe', notice.votingEndsAt],
  ]) {
    if (!validDateTime(value)) throw new ApplicationError('VALIDATION_FAILED', `${label} benötigt ein gültiges Datum mit Uhrzeit.`);
  }
  return notice;
}

export class SbvElectionDocumentService {
  private readonly repo: ElectionPreparationRepository;
  private readonly pdfDocuments = new PdfDocumentGenerationService();

  constructor(
    private readonly database: DatabaseAdapter,
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
        ];
      case 'proposal_correction_notice':
      case 'proposal_grace_notice':
        throw new Error('Wahlvorschlagschreiben werden mit ihrem eigenen Dokumentprofil erstellt.');
    }
  }

  private proposalNoticeLines(
    input: GenerateElectionPreparationDocumentInput,
    electionId: string,
    status: 'correction_required' | 'grace_period',
  ): string[] {
    const proposal = this.repo.listProposals(electionId).find((item) => item.id === input.proposalId);
    if (!proposal || proposal.validityStatus !== status || !proposal.correctionDueAt) {
      throw new ApplicationError('VALIDATION_FAILED', 'Für dieses Schreiben muss ein passender Wahlvorschlag mit dokumentierter Frist ausgewählt sein.');
    }
    const deadline = displayDate(proposal.correctionDueAt);
    if (status === 'correction_required') {
      const reason = proposal.invalidReason?.trim() || input.correctionReason?.trim();
      if (!reason) throw new ApplicationError('VALIDATION_FAILED', 'Der konkrete Klärungsbedarf fehlt.');
      return [
        `Wahlvorschlag vom ${displayDate(proposal.receivedAt)}`,
        `Festgestellter Klärungsbedarf: ${reason}`,
        `Bitte klären oder korrigieren Sie diesen Punkt bis zum ${deadline} gegenüber dem Wahlvorstand.`,
      ];
    }
    const office = input.graceOffice === 'representative' ? 'Vertrauensperson'
      : input.graceOffice === 'deputy' ? 'stellvertretenden Mitglieder' : undefined;
    if (!office) throw new ApplicationError('VALIDATION_FAILED', 'Für die Nachfrist muss der betroffene Wahlgang angegeben werden.');
    return [
      `Für die Wahl der ${office} ist bislang kein ausreichender gültiger Wahlvorschlag eingegangen.`,
      `Wahlvorschläge können bis zum ${deadline} beim Wahlvorstand eingereicht werden.`,
      'Die Wahl in diesem Wahlgang kann nur stattfinden, wenn innerhalb der Nachfrist ein gültiger Wahlvorschlag eingeht.',
    ];
  }

  private electionNoticeDefinition(title: string, subtitle: string, election: ElectionRecord, notice: ElectionNoticeDetails): PdfDocumentDefinition {
    return publicNoticeDocument(title, subtitle, [
      paragraph(`Erlassen am ${displayDate(notice.issueDate)}`),
      section('Wahlvorstand', [
        paragraph(`Vorsitz: ${notice.boardChairName}`),
        paragraph(`Weiteres Mitglied: ${notice.secondBoardMemberName}`),
        paragraph(`Erklärungen und Wahlvorschläge an: ${notice.proposalSubmissionPlace}`),
      ]),
      section('Wählbarkeit', [paragraph('Wählbar sind die nicht nur vorübergehend Beschäftigten, die am Wahltag volljährig sind und dem Betrieb oder der Dienststelle seit sechs Monaten angehören. Besteht der Betrieb oder die Dienststelle weniger als ein Jahr, entfällt die sechsmonatige Zugehörigkeit. Gesetzliche Ausschlussgründe bleiben zu beachten.')]),
      section('Wählerliste und Einsprüche', [
        paragraph(`Die Wählerliste liegt bei ${notice.voterListInspectionPlace} zu folgenden Zeiten aus: ${notice.voterListInspectionTimes}.`),
        paragraph(`Die Wahlordnung liegt bei ${notice.ordinanceInspectionPlace} zur Einsicht aus.`),
        paragraph(`Wählen kann nur, wer in der Wählerliste steht. Einsprüche gegen die Liste können bis zum ${displayDate(notice.objectionDeadline)} schriftlich beim Wahlvorstand eingelegt werden.`),
      ]),
      section('Wahlvorschläge', [
        paragraph(`${notice.representativeElectionStatement} ${notice.deputyElectionStatement} Anzahl der zu wählenden stellvertretenden Mitglieder: ${election.deputyCount}.`),
        paragraph('Die Vertrauensperson und die stellvertretenden Mitglieder werden in getrennten Wahlgängen gewählt. Aus dem Vorschlag muss der jeweilige Wahlgang hervorgehen. Wahlberechtigte dürfen beide Wahlgänge unterstützen; kandidierende Personen dürfen sich für beide Ämter bewerben.'),
        paragraph(`Wahlvorschläge sind bis zum ${displayDate(notice.proposalDeadline)} bei ${notice.proposalSubmissionPlace} einzureichen. Erforderliche Stützunterschriften: ${notice.requiredSupportSignatures}. Nur fristgerecht eingereichte Wahlvorschläge können berücksichtigt werden.`),
        paragraph(`Die Wahlvorschläge werden bis zum Abschluss der Stimmabgabe bei ${notice.proposalDisplayPlace} bekannt gemacht.`),
      ]),
      section('Stimmabgabe und Auszählung', [
        paragraph(`Die Stimmabgabe findet vom ${displayDateTime(notice.votingStartsAt)} bis zum ${displayDateTime(notice.votingEndsAt)} bei ${notice.votingPlace} statt.`),
        paragraph(`Schriftliche Stimmabgabe: ${notice.mailBallotStatement}`),
        paragraph(`Auszählung und abschließende Feststellung: ${notice.countingPlaceAndTime}`),
      ]),
      section('Unterschriften des Wahlvorstands', [
        paragraph(`${notice.boardChairName}: ______________________________`),
        paragraph(`${notice.secondBoardMemberName}: ______________________________`),
      ]),
    ]);
  }

  private definition(
    title: string,
    input: GenerateElectionPreparationDocumentInput,
    election: ElectionRecord,
  ): PdfDocumentDefinition {
    const defaults = documentDefaultsForDatabase(this.database);
    const electionSubtitle = appendOperationContext('Wahl der Schwerbehindertenvertretung', defaults);
    const operationContext = operationContextLine(defaults);
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
          ...(operationContext ? [section('Betrieb / Standort', [paragraph(operationContext)])] : []),
          section('Termin und Ort', [paragraph(meeting), paragraph(invitation.meetingPlace)]),
          section('Gegenstand', [paragraph('Wahl der Vertrauensperson der schwerbehinderten Menschen und der stellvertretenden Mitglieder.')]),
          paragraph(invitation.accessibilityNote?.trim() || 'Bitte teilen Sie der Wahlleitung frühzeitig mit, wenn Sie für Ihre Teilnahme Unterstützung oder eine barrierefreie Anpassung benötigen.'),
          paragraph('Mit freundlichen Grüßen\nDie Wahlleitung'),
        ],
      });
    }
    if (input.kind === 'proposal_correction_notice' && !input.recipientLabel?.trim()) {
      throw new ApplicationError('VALIDATION_FAILED', 'Für die Korrekturaufforderung fehlt der Empfänger.');
    }
    if (input.kind === 'proposal_correction_notice') {
      const content = this.proposalNoticeLines(input, election.id, 'correction_required');
      return externalLetterDocument({
        title,
        sender: ['Wahlvorstand der Schwerbehindertenvertretungswahl'],
        recipient: [input.recipientLabel!.trim()],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: title,
        blocks: [
          paragraph('Sehr geehrte Damen und Herren,'),
          ...content.map(paragraph),
          paragraph('Mit freundlichen Grüßen\nDer Wahlvorstand'),
        ],
      });
    }
    if (input.kind === 'proposal_grace_notice') {
      return publicNoticeDocument(title, electionSubtitle, [
        section('Nachfrist für Wahlvorschläge', this.proposalNoticeLines(input, election.id, 'grace_period').map(paragraph)),
      ]);
    }
    if (input.kind === 'election_notice') {
      if (election.procedure !== 'formal') {
        throw new ApplicationError('VALIDATION_FAILED', 'Wahlausschreiben gehört zum förmlichen Verfahren.');
      }
      const notice = validateElectionNoticeDetails(input.notice);
      return this.electionNoticeDefinition(title, electionSubtitle, election, notice);
    }
    if (input.kind === 'candidate_announcement') {
      const validProposalCandidates = new Set(this.repo.listProposals(election.id)
        .filter((proposal) => proposal.validityStatus === 'valid')
        .flatMap((proposal) => proposal.candidateIds));
      const candidates = this.repo.listCandidates(election.id).filter((candidate) =>
        candidate.eligibilityStatus === 'policy_eligible'
        && (election.procedure !== 'formal' || validProposalCandidates.has(candidate.id)));
      if (!candidates.length) throw new ApplicationError('VALIDATION_FAILED', election.procedure === 'formal'
        ? 'Für die Bekanntmachung liegt noch keine bestätigte Kandidatur aus einem gültigen Wahlvorschlag vor.'
        : 'Für die Bekanntmachung liegt noch keine bestätigte Kandidatur vor.');
      const officeSection = (officeType: 'representative' | 'deputy', label: string) => {
        const names = candidates.filter((candidate) => candidate.officeType === officeType)
          .map((candidate) => candidate.personSnapshot).sort((a, b) => a.localeCompare(b, 'de'));
        return names.length ? section(label, [list(names)]) : undefined;
      };
      return publicNoticeDocument(title, electionSubtitle, [
        officeSection('representative', 'Vertrauensperson'),
        officeSection('deputy', 'Stellvertretung'),
      ].filter((item) => item !== undefined));
    }
    const blocks = [section('Dokumentinhalt', [list(this.lines(input, election))])];
    return legalRecordDocument(
      title,
      electionSubtitle,
      input.kind === 'voter_list' ? 'Vertrauliches Wahldokument' : 'Rechtlich relevantes Wahldokument',
      blocks,
    );
  }
}
