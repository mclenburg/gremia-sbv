import type { DatabaseAdapter } from './databaseService.js';
import {
  legalRecordDocument,
  list,
  pageBreak,
  paragraph,
  section,
  type PdfDocumentDefinition,
} from './documents/pdfDocumentDefinition.js';
import type { GenerateElectionExecutionDocumentInput } from '../src/domain/models/election-execution.model.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';

interface MailBallotElection {
  id: string;
  kind: string;
  election_date: string | null;
}

interface CandidateRow {
  office_type: string;
  person_snapshot: string;
}

interface VoterRow {
  first_name: string;
  last_name: string;
  list_status: string;
}

export class ElectionMailBallotPackageDefinition {
  constructor(private readonly db: DatabaseAdapter) {}

  build(
    election: MailBallotElection,
    input: GenerateElectionExecutionDocumentInput,
  ): PdfDocumentDefinition {
    const packageInput = this.validatedInput(election.id, input);
    const voter = this.voter(election.id, packageInput.voterId);
    const candidates = this.candidates(election.id);
    const deputyCount = this.db.prepare<{ deputy_count: number }>(
      'SELECT deputy_count FROM sbv_elections WHERE id=?',
    ).get(election.id)?.deputy_count ?? 1;
    const representativeCandidates = candidates.filter((candidate) => candidate.office_type === 'representative');
    const deputyCandidates = candidates.filter((candidate) => candidate.office_type === 'deputy');
    const voterName = `${voter.first_name} ${voter.last_name}`;
    const electionLabel = `Wahl der Schwerbehindertenvertretung${election.election_date ? ` am ${this.formatDate(election.election_date)}` : ''}`;
    const ballotBlocks = election.kind === 'deputy_by_election'
      ? this.ballotPage('Stimmzettel Stellvertretung', electionLabel, this.deputyBallotInstruction(deputyCount), deputyCandidates)
      : [
          ...this.ballotPage('Stimmzettel Vertrauensperson', electionLabel, 'Bitte genau eine Person kennzeichnen.', representativeCandidates),
          pageBreak(),
          ...this.ballotPage('Stimmzettel Stellvertretung', electionLabel, this.deputyBallotInstruction(deputyCount), deputyCandidates),
        ];

    const definition = legalRecordDocument(
      'Briefwahlpaket und Merkblatt',
      electionLabel,
      'Unterlagen zur schriftlichen Stimmabgabe nach § 11 SchwbVWO',
      [
        section('Merkblatt zur schriftlichen Stimmabgabe', [
          paragraph(`Für: ${voterName}`),
          paragraph(`Die Unterlagen müssen dem Wahlvorstand spätestens bis ${this.formatDateTime(packageInput.votingEndsAt)} vorliegen.`),
          list([
            'Kennzeichnen Sie den Stimmzettel unbeobachtet und persönlich. Legen Sie nur den gekennzeichneten Stimmzettel in den Wahlumschlag und verschließen Sie ihn.',
            'Unterschreiben Sie die persönliche Erklärung unter Angabe von Ort und Datum.',
            'Legen Sie den verschlossenen Wahlumschlag und die unterschriebene persönliche Erklärung in den größeren Rückumschlag.',
            'Senden oder übergeben Sie den verschlossenen Rückumschlag so rechtzeitig, dass er vor dem Ende der Stimmabgabe beim Wahlvorstand vorliegt.',
            'Wenn Sie wegen Ihrer Behinderung oder weil Sie nicht lesen können Hilfe benötigen, dürfen Sie eine Person bestimmen und dies dem Wahlvorstand mitteilen. Kandidierende, Mitglieder des Wahlvorstands sowie Wahlhelferinnen und Wahlhelfer dürfen diese Hilfe nicht leisten. Die Hilfe muss sich auf die Erfüllung Ihrer Wahlentscheidung beschränken; die Hilfsperson ist zur Geheimhaltung verpflichtet.',
          ]),
          paragraph('Zum realen Paket gehören außerdem das gültige Wahlausschreiben, ein Wahlumschlag und ein ausreichend frankierter größerer Rückumschlag.'),
        ]),
        pageBreak(),
        ...ballotBlocks,
        pageBreak(),
        section('Persönliche Erklärung', [
          paragraph(electionLabel),
          paragraph(`Ich, ${voterName}, versichere gegenüber dem Wahlvorstand, dass ich den beigefügten Stimmzettel persönlich gekennzeichnet habe oder ihn unter den Voraussetzungen des § 10 Abs. 4 SchwbVWO durch eine andere Person habe kennzeichnen lassen.`),
          paragraph('Ort: __________________________________________'),
          paragraph('Datum: ________________________________________'),
          paragraph('Unterschrift der wahlberechtigten Person: ________________________________'),
        ]),
        pageBreak(),
        section('Beschriftung des Wahlumschlags', [
          paragraph('WAHLUMSCHLAG'),
          paragraph('Nur den gekennzeichneten Stimmzettel einlegen. Keine persönliche Erklärung und keine Absenderangaben in diesen Umschlag legen.'),
        ]),
        section('Beschriftung des größeren Rückumschlags', [
          paragraph('SCHRIFTLICHE STIMMABGABE'),
          paragraph(`An den Wahlvorstand:\n${packageInput.electionBoardPostalAddress}`),
          paragraph(`Absender:\n${voterName}\n${packageInput.voterPostalAddress}`),
          paragraph('Inhalt: verschlossener Wahlumschlag und unterschriebene persönliche Erklärung.'),
        ]),
      ],
    );
    return { ...definition, footer: '' };
  }

  private ballotPage(title: string, electionLabel: string, instruction: string, candidates: CandidateRow[]) {
    if (!candidates.length) {
      throw new ApplicationError('VALIDATION_FAILED', `${title} kann nicht erzeugt werden, weil keine zugelassene Kandidatur vorhanden ist.`);
    }
    return [section(title, [
      paragraph(electionLabel),
      paragraph(instruction),
      ...candidates.map((candidate) => paragraph(`☐ ${candidate.person_snapshot}`)),
      paragraph('Keine Unterschrift und keine sonstigen Kennzeichen auf dem Stimmzettel anbringen.'),
    ])];
  }

  private deputyBallotInstruction(deputyCount: number): string {
    return deputyCount === 1
      ? 'Bitte höchstens eine Person kennzeichnen.'
      : `Bitte höchstens ${deputyCount} Personen kennzeichnen.`;
  }

  private validatedInput(
    electionId: string,
    input: GenerateElectionExecutionDocumentInput,
  ): NonNullable<GenerateElectionExecutionDocumentInput['mailBallotPackage']> {
    const packageInput = input.mailBallotPackage;
    if (!packageInput) {
      throw new ApplicationError('VALIDATION_FAILED', 'Für das Briefwahlpaket müssen Person, Anschriften und Ende der Stimmabgabe angegeben werden.');
    }
    const normalized = {
      voterId: packageInput.voterId.trim(),
      voterPostalAddress: packageInput.voterPostalAddress.trim(),
      electionBoardPostalAddress: packageInput.electionBoardPostalAddress.trim(),
      votingEndsAt: packageInput.votingEndsAt.trim(),
    };
    if (!normalized.voterId || !normalized.voterPostalAddress || !normalized.electionBoardPostalAddress || !normalized.votingEndsAt) {
      throw new ApplicationError('VALIDATION_FAILED', 'Für das Briefwahlpaket müssen Person, Anschriften und Ende der Stimmabgabe vollständig angegeben werden.');
    }
    if (this.voter(electionId, normalized.voterId).list_status !== 'eligible') {
      throw new ApplicationError('VALIDATION_FAILED', 'Das Briefwahlpaket darf nur für eine aktuell wahlberechtigte Person erzeugt werden.');
    }
    if (Number.isNaN(new Date(normalized.votingEndsAt).getTime())) {
      throw new ApplicationError('VALIDATION_FAILED', 'Das Ende der Stimmabgabe ist kein gültiger Zeitpunkt.');
    }
    return normalized;
  }

  private voter(electionId: string, voterId: string): VoterRow {
    const voter = this.db.prepare<VoterRow>(`
      SELECT first_name,last_name,list_status FROM sbv_election_voters
      WHERE election_id=? AND id=?
    `).get(electionId, voterId);
    if (!voter) throw new ApplicationError('VALIDATION_FAILED', 'Die gewählte Person gehört nicht zur Wählerliste dieser Wahl.');
    return voter;
  }

  private candidates(electionId: string): CandidateRow[] {
    return this.db.prepare<CandidateRow>(`
      SELECT office_type,person_snapshot FROM sbv_election_candidates
      WHERE election_id=? ORDER BY person_snapshot COLLATE NOCASE
    `).all(electionId);
  }

  private formatDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(date);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeStyle: 'short' }).format(date);
  }
}
