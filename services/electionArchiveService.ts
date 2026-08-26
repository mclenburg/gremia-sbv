import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import type { DatabaseAdapter } from './databaseService.js';
import {
  SbvOfficeWorkflowDocumentAdapter,
  type SbvOfficeDocumentRecord,
} from './sbvOfficeWorkflowDocumentAdapter.js';
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
import type { GenerateElectionExecutionDocumentInput } from '../src/domain/models/election-execution.model.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';
import { ElectionMailBallotPackageDefinition } from './electionMailBallotPackageDefinition.js';

const TEMPLATE_VERSION = '0.9.7-D.1';

interface ElectionRow {
  id: string;
  kind: string;
  procedure: string | null;
  election_date: string | null;
  office_term_start: string | null;
  office_term_end: string | null;
  legal_rule_version: string;
  status: string;
  retention_until: string | null;
  legal_hold_status: string;
}
interface CandidateRow { id: string; office_type: string; person_snapshot: string }
interface ResultRow { id: string; office_type: string; candidate_id: string; elected_rank: number | null; acceptance_status: string; lot_required: number; lot_decided_at: string | null }
interface TotalRow { office_type: string; candidate_id: string; votes: number; rank: number | null }
interface PhysicalRow { record_type: string; description: string | null; quantity: number; storage_location: string | null; sealed_status: string | null; original_required: number }

export class ElectionArchiveService {
  private readonly pdfDocuments = new PdfDocumentGenerationService();
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly documents: SbvOfficeWorkflowDocumentAdapter,
  ) {}

  async generate(
    electionId: string,
    input: GenerateElectionExecutionDocumentInput,
  ): Promise<SbvOfficeDocumentRecord> {
    const election = this.election(electionId);
    const title = this.title(input.kind);
    const lines = this.documentLines(election, input);
    return this.documents.store({
      owner: { type: 'election', id: electionId },
      title,
      filename: `${input.kind}-${electionId.slice(0, 8)}.pdf`,
      mimeType: 'application/pdf',
      purpose: input.kind,
      documentClass: 'generated_document',
      templateVersion: TEMPLATE_VERSION,
      legalRuleVersion: election.legal_rule_version,
      plain: await this.createElectionPdf(title, election, lines, input),
    });
  }

  async exportDocumentToFile(documentId: string, targetPath: string): Promise<{ exported: true; sizeBytes: number }> {
    const plain = await this.documents.read(documentId);
    await fs.promises.writeFile(targetPath, plain, { mode: 0o600 });
    return { exported: true, sizeBytes: plain.length };
  }

  readDocument(documentId: string): Promise<Buffer> {
    return this.documents.read(documentId);
  }

  async exportPdfArchive(electionId: string): Promise<SbvOfficeDocumentRecord> {
    const election = this.election(electionId);
    const lines = this.archiveLines(election);
    const record = await this.documents.store({
      owner: { type: 'election', id: electionId },
      title: 'PDF-Gesamtwahlakte',
      filename: `wahlakte-${electionId.slice(0, 8)}.pdf`,
      mimeType: 'application/pdf',
      purpose: 'archive_pdf',
      documentClass: 'generated_document',
      templateVersion: TEMPLATE_VERSION,
      legalRuleVersion: election.legal_rule_version,
      plain: await this.createElectionPdf('PDF-Gesamtwahlakte', election, lines, { kind: 'archive_pdf' }),
    });
    const linkedCount = this.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM sbv_workflow_document_links
      WHERE owner_type='election' AND owner_id=?
    `).get(electionId)?.count ?? 0;
    this.database.prepare(`
      INSERT INTO sbv_election_archive_exports(
        id,election_id,export_type,format_version,created_at,manifest_hash,file_count,destination_path_metadata_minimal
      ) VALUES(?,?,?,?,?,?,?,NULL)
    `).run(randomUUID(), electionId, 'pdf_bundle', 1, record.createdAt, record.sha256, linkedCount);
    return record;
  }

  private createElectionPdf(
    title: string,
    election: ElectionRow,
    lines: readonly string[],
    input: GenerateElectionExecutionDocumentInput,
  ): Promise<Buffer> {
    return this.pdfDocuments.generate({
      source: 'election',
      privacyProfile: 'lawful_personal_data',
      definition: this.executionDefinition(title, election, lines, input),
    });
  }

  private executionDefinition(
    title: string,
    election: ElectionRow,
    lines: readonly string[],
    input: GenerateElectionExecutionDocumentInput,
  ): PdfDocumentDefinition {
    if (input.kind === 'mail_ballot_package') {
      return new ElectionMailBallotPackageDefinition(this.database).build(election, input);
    }
    const blocks = [section('Dokumentinhalt', [list(lines)])];
    if (input.kind === 'result_announcement') {
      return publicNoticeDocument(title, 'Wahl der Schwerbehindertenvertretung', blocks);
    }
    if (input.kind === 'elected_notification') {
      const selected = this.results(election.id).find((item) => item.id === input.resultId);
      const recipient = selected
        ? this.candidates(election.id).find((candidate) => candidate.id === selected.candidate_id)?.person_snapshot
        : undefined;
      return externalLetterDocument({
        title,
        sender: ['Wahlvorstand der Schwerbehindertenvertretungswahl'],
        recipient: [recipient || 'An die gewählte Person'],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: 'Benachrichtigung über die Wahl',
        blocks: [paragraph('Sehr geehrte Damen und Herren,'), ...blocks, paragraph('Mit freundlichen Grüßen\nDer Wahlvorstand')],
      });
    }
    return legalRecordDocument(
      title,
      'Wahl der Schwerbehindertenvertretung',
      input.kind.startsWith('ballot_') ? 'Stimmzettel' : 'Rechtlich relevantes Wahldokument',
      blocks,
    );
  }

  private archiveLines(election: ElectionRow): string[] {
    const candidates = this.candidates(election.id);
    const voters = this.database.prepare<{ last_name: string; first_name: string; eligibility_basis: string; list_status: string }>(`
      SELECT last_name,first_name,eligibility_basis,list_status
      FROM sbv_election_voters WHERE election_id=? ORDER BY last_name COLLATE NOCASE,first_name COLLATE NOCASE
    `).all(election.id);
    const board = this.database.prepare<{ role: string; name: string; appointed_at: string | null }>(`
      SELECT role,name,appointed_at FROM sbv_election_board_members WHERE election_id=? ORDER BY role,name
    `).all(election.id);
    const mail = this.database.prepare<{ sent_at: string | null; received_at: string | null; late_received_at: string | null; declaration_valid: number | null; destroy_due_at: string | null }>(`
      SELECT sent_at,received_at,late_received_at,declaration_valid,destroy_due_at
      FROM sbv_election_mail_ballots WHERE election_id=? ORDER BY created_at
    `).all(election.id);
    const totals = this.totals(election.id);
    const results = this.results(election.id);
    const physical = this.physical(election.id);
    const links = this.database.prepare<{ title: string; filename: string | null; purpose: string; sha256: string | null; template_version: string | null; legal_rule_version: string | null }>(`
      SELECT d.title,d.filename,l.purpose,d.sha256,l.template_version,l.legal_rule_version
      FROM sbv_workflow_document_links l JOIN generated_documents d ON d.id=l.document_id
      WHERE l.owner_type='election' AND l.owner_id=? ORDER BY l.created_at
    `).all(election.id);
    const name = (candidateId: string) => candidates.find((candidate) => candidate.id === candidateId)?.person_snapshot ?? candidateId;

    return [
      ...this.header(election),
      'MENSCHENLESBARE GESAMT-WAHLAKTE',
      'Diese Datei ist ohne Gremia.SBV lesbar und fasst den gespeicherten fachlichen Wahlzustand zusammen.',
      '',
      'WAHLORGAN',
      ...board.map((item) => `${item.role}: ${item.name} · bestellt/gewählt ${item.appointed_at ?? '-'}`),
      '',
      'WÄHLERLISTE-SNAPSHOT',
      ...voters.map((item) => `${item.last_name}, ${item.first_name} · ${item.eligibility_basis} · ${item.list_status}`),
      '',
      'KANDIDATUREN – VERTRAUENSPERSON',
      ...candidates.filter((item) => item.office_type === 'representative').map((item) => item.person_snapshot),
      'KANDIDATUREN – STELLVERTRETUNG',
      ...candidates.filter((item) => item.office_type === 'deputy').map((item) => item.person_snapshot),
      '',
      'BRIEFWAHLNACHWEISE – OHNE STIMMINHALT',
      ...mail.map((item, index) => `Briefwahl ${index + 1}: Versand ${item.sent_at ?? '-'} · Eingang ${item.received_at ?? '-'} · verspätet ${item.late_received_at ?? '-'} · Erklärung ${item.declaration_valid === null ? 'offen' : item.declaration_valid ? 'gültig' : 'nicht gültig'} · Vernichtung ${item.destroy_due_at ?? '-'}`),
      '',
      'AUSZÄHLUNG',
      ...totals.map((item) => `${item.office_type}: ${name(item.candidate_id)} · ${item.votes} Stimme(n) · Rang ${item.rank ?? '-'}`),
      '',
      'ERGEBNIS UND ANNAHME',
      ...results.map((item) => `${item.office_type}: ${name(item.candidate_id)} · Rang ${item.elected_rank ?? '-'} · ${item.acceptance_status} · Los ${item.lot_required ? 'erforderlich' : item.lot_decided_at ? `entschieden ${item.lot_decided_at}` : 'nein'}`),
      '',
      'DIGITALE NACHWEISE / PRÜFSUMMEN',
      ...links.map((item, index) => `${index + 1}. ${item.title} | ${item.purpose} | ${item.filename ?? '-'} | Template ${item.template_version ?? '-'} | Regel ${item.legal_rule_version ?? '-'} | SHA-256 ${item.sha256 ?? '-'}`),
      '',
      'PHYSISCHE ORIGINALUNTERLAGEN',
      ...physical.map((item) => `${item.record_type}: ${item.description ?? '-'} | Menge ${item.quantity} | Ort ${item.storage_location ?? '-'} | Status ${item.sealed_status ?? '-'} | Original ${item.original_required ? 'aufzubewahren' : 'nein'}`),
      '',
      'WICHTIG: Dieser PDF-Export ersetzt gesetzlich oder organisatorisch aufzubewahrende physische Originale, insbesondere Stimmzettel, nicht.',
    ];
  }

  private documentLines(election: ElectionRow, input: GenerateElectionExecutionDocumentInput): string[] {
    const candidates = this.candidates(election.id);
    const results = this.results(election.id);
    const totals = this.totals(election.id);
    const name = (candidateId: string) => candidates.find((candidate) => candidate.id === candidateId)?.person_snapshot ?? candidateId;

    switch (input.kind) {
      case 'ballot_representative':
        return [
          ...this.publicHeader(election),
          'Wahlgang Vertrauensperson',
          'Bitte genau eine Person kennzeichnen.',
          ...candidates.filter((candidate) => candidate.office_type === 'representative').map((candidate) => `☐ ${candidate.person_snapshot}`),
          'Keine Unterschrift auf dem Stimmzettel.',
        ];
      case 'ballot_deputy': {
        const deputyCount = this.database.prepare<{ deputy_count: number }>('SELECT deputy_count FROM sbv_elections WHERE id=?').get(election.id)?.deputy_count ?? 1;
        return [
          ...this.publicHeader(election),
          `Wahlgang Stellvertretung · höchstens ${deputyCount} Person(en) kennzeichnen.`,
          ...candidates.filter((candidate) => candidate.office_type === 'deputy').map((candidate) => `☐ ${candidate.person_snapshot}`),
          'Keine Unterschrift auf dem Stimmzettel.',
        ];
      }
      case 'mail_ballot_package':
        return [];
      case 'election_day_checklist':
        return [
          ...this.publicHeader(election),
          '☐ unbeobachtete Kennzeichnung gewährleistet',
          '☐ Wahlurne verschlossen',
          '☐ erforderliche Besetzung des Wahlorgans gewährleistet',
          '☐ Hilfspersonregel verfügbar',
          '☐ öffentliche Auszählung vorbereitet',
          'Die Checkliste dokumentiert den Arbeitsstand und blockiert den realen Wahltag nicht.',
        ];
      case 'result_minutes':
        return [
          ...this.publicHeader(election),
          'Ergebnisniederschrift',
          ...totals.map((item) => `${item.office_type}: ${name(item.candidate_id)} – ${item.votes} Stimme(n), Rang ${item.rank ?? '-'}`),
          'Gewählte',
          ...results.filter((item) => item.elected_rank !== null).map((item) => `${item.office_type}: ${name(item.candidate_id)} – Rang ${item.elected_rank} – ${item.acceptance_status}`),
          'Unterschrift Wahlorgan: ____________________',
        ];
      case 'elected_notification': {
        const selected = results.find((item) => item.id === input.resultId);
        if (!selected) throw new ApplicationError('VALIDATION_FAILED', 'Benachrichtigung benötigt ein gewähltes Ergebnis.');
        return [
          ...this.publicHeader(election),
          `Gewählte Person: ${name(selected.candidate_id)}`,
          `Wahlgang: ${selected.office_type}`,
          'Bitte Empfang bestätigen. Ablehnung kann binnen drei Arbeitstagen erklärt werden.',
          'Empfang/Unterschrift: ____________________',
        ];
      }
      case 'result_announcement':
        return [
          ...this.publicHeader(election),
          'Endgültiges Wahlergebnis',
          ...results.filter((item) => item.elected_rank !== null && !['rejected', 'replaced'].includes(item.acceptance_status))
            .map((item) => `${item.office_type}: ${name(item.candidate_id)} · Rang ${item.elected_rank}`),
          'Aushangdauer: zwei Wochen ab dokumentiertem Beginn.',
        ];
      case 'physical_inventory':
        return [
          ...this.publicHeader(election),
          ...this.physical(election.id).map((item) => `${item.record_type}: ${item.description ?? '-'} | ${item.quantity} | ${item.storage_location ?? '-'} | ${item.sealed_status ?? '-'}`),
          'Physische Originale werden durch diesen Nachweis nicht ersetzt.',
        ];
      case 'handover_protocol':
        return [
          ...this.publicHeader(election),
          'Übergabe Wahlakte / Amtsunterlagen',
          'Digitale Wahlakte übergeben: ☐',
          'Physische Originale gemäß Bestandsverzeichnis übergeben: ☐',
          'Übergebende Person: ____________________',
          'Übernehmende Person: ____________________',
          'Datum: ____________________',
          'Physische Originale bleiben eigenständig aufzubewahren.',
        ];
      case 'archive_pdf':
        return this.archiveLines(election);
    }
  }

  private election(id: string): ElectionRow {
    const election = this.database.prepare<ElectionRow>('SELECT * FROM sbv_elections WHERE id=?').get(id);
    if (!election) throw new Error('Wahlvorgang wurde nicht gefunden.');
    return election;
  }

  private candidates(electionId: string): CandidateRow[] {
    return this.database.prepare<CandidateRow>(`
      SELECT id,office_type,person_snapshot FROM sbv_election_candidates
      WHERE election_id=? ORDER BY person_snapshot COLLATE NOCASE
    `).all(electionId);
  }

  private results(electionId: string): ResultRow[] {
    return this.database.prepare<ResultRow>(`
      SELECT id,office_type,candidate_id,elected_rank,acceptance_status,lot_required,lot_decided_at
      FROM sbv_election_results WHERE election_id=? ORDER BY office_type,elected_rank,candidate_id
    `).all(electionId);
  }

  private totals(electionId: string): TotalRow[] {
    return this.database.prepare<TotalRow>(`
      SELECT office_type,candidate_id,votes,rank FROM sbv_election_vote_totals
      WHERE election_id=? ORDER BY office_type,rank,candidate_id
    `).all(electionId);
  }

  private physical(electionId: string): PhysicalRow[] {
    return this.database.prepare<PhysicalRow>(`
      SELECT record_type,description,quantity,storage_location,sealed_status,original_required
      FROM sbv_election_physical_records WHERE election_id=? ORDER BY record_type
    `).all(electionId);
  }

  private header(election: ElectionRow): string[] {
    return [
      `Wahl-ID: ${election.id}`,
      `Wahlart: ${election.kind}`,
      `Verfahren: ${election.procedure ?? '-'}`,
      `Wahltag: ${election.election_date ?? '-'}`,
      `Amtszeit: ${election.office_term_start ?? '-'} bis ${election.office_term_end ?? '-'}`,
      `Status: ${election.status}`,
      `Aufbewahrung bis: ${election.retention_until ?? '-'}`,
      `Legal Hold: ${election.legal_hold_status}`,
      `Rechtsregel: ${election.legal_rule_version}`,
      `Vorlagenversion: ${TEMPLATE_VERSION}`,
    ];
  }

  private publicHeader(election: ElectionRow): string[] {
    return [
      `Wahl der Schwerbehindertenvertretung${election.election_date ? ` · Wahltag ${election.election_date}` : ''}`,
      `Verfahren: ${election.procedure === 'simplified' ? 'vereinfachtes Wahlverfahren' : election.procedure === 'formal' ? 'förmliches Wahlverfahren' : 'noch nicht festgelegt'}`,
    ];
  }

  private title(kind: GenerateElectionExecutionDocumentInput['kind']): string {
    return ({
      ballot_representative: 'Stimmzettel Vertrauensperson',
      ballot_deputy: 'Stimmzettel Stellvertretung',
      mail_ballot_package: 'Briefwahlpaket und Merkblatt',
      election_day_checklist: 'Wahltag-Checkliste',
      result_minutes: 'Ergebnisniederschrift',
      elected_notification: 'Benachrichtigung gewählte Person',
      result_announcement: 'Bekanntmachung Wahlergebnis',
      physical_inventory: 'Bestandsverzeichnis Originalunterlagen',
      handover_protocol: 'Übergabeprotokoll',
      archive_pdf: 'PDF-Gesamtwahlakte',
    } as const)[kind];
  }
}
