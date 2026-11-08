import { list, section, type PdfBlock } from './pdfDocumentDefinition.js';

const DOCUMENT_LABELS: Record<string, string> = {
  regular: 'Regelwahl', extraordinary_no_sbv: 'Außerordentliche Wahl – keine SBV',
  extraordinary_office_end: 'Außerordentliche Wahl – Amtsende',
  extraordinary_successful_challenge: 'Außerordentliche Wahl – erfolgreiche Anfechtung',
  deputy_by_election: 'Nachwahl Stellvertretung',
  formal: 'förmliches Verfahren', simplified: 'vereinfachtes Verfahren',
  draft: 'Entwurf', procedure_confirmed: 'Verfahren bestätigt', preparation: 'Vorbereitung',
  nominations: 'Wahlvorschläge', ballots_ready: 'Stimmzettel bereit', voting: 'Stimmabgabe',
  counting: 'Auszählung', acceptance_pending: 'Annahme offen', result_final: 'Ergebnis festgestellt',
  announced: 'Ergebnis bekannt gemacht', closed: 'abgeschlossen', cancelled: 'abgebrochen',
  representative: 'Vertrauensperson', deputy: 'Stellvertretung',
  chair: 'Vorsitz', member: 'Mitglied', substitute: 'Ersatzmitglied', election_leader: 'Wahlleitung', assistant: 'Wahlhilfe',
  severely_disabled_confirmed: 'Schwerbehinderung bestätigt', equalized_confirmed: 'Gleichstellung bestätigt',
  pending_equalization_not_eligible: 'Gleichstellung noch offen', not_eligible_other: 'nicht wahlberechtigt',
  eligible: 'wahlberechtigt', not_eligible: 'nicht wahlberechtigt',
  pending: 'Annahme offen', accepted_by_silence: 'durch Fristablauf angenommen',
  accepted_explicit: 'ausdrücklich angenommen', rejected: 'abgelehnt', replaced: 'nachgerückt/ersetzt',
};

export function electionDocumentLabel(value: string | null | undefined): string {
  return value ? DOCUMENT_LABELS[value] ?? value : 'nicht erfasst';
}

const ARCHIVE_SECTIONS = new Set([
  'GESAMTWAHLAKTE', 'WAHLORGAN', 'WÄHLERLISTE-SNAPSHOT', 'KANDIDATUREN – VERTRAUENSPERSON',
  'KANDIDATUREN – STELLVERTRETUNG', 'BRIEFWAHLNACHWEISE – OHNE STIMMINHALT',
  'AUSZÄHLUNG', 'ERGEBNIS UND ANNAHME', 'DIGITALE NACHWEISE / PRÜFSUMMEN',
  'PHYSISCHE ORIGINALUNTERLAGEN',
]);

export function electionArchiveBlocks(lines: readonly string[]): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  let title = 'Wahlstand';
  let entries: string[] = [];
  const flush = () => {
    if (entries.length) blocks.push(section(title, [list(entries)]));
    entries = [];
  };
  for (const line of lines) {
    if (!line) continue;
    if (ARCHIVE_SECTIONS.has(line)) {
      flush();
      if (line === 'GESAMTWAHLAKTE') blocks.push(section(line, []));
      title = line;
    } else entries.push(line);
  }
  flush();
  return blocks;
}
