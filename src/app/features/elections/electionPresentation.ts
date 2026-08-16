import type { AcceptanceStatus, ElectionKind, ElectionProcedure, ElectionStatus, OfficeType, ProposalStatus } from '../../core/models/election.model';

export const electionKindLabels: Record<ElectionKind, string> = {
  regular: 'Regelwahl',
  extraordinary_no_sbv: 'Außerordentliche Wahl – keine SBV',
  extraordinary_office_end: 'Außerordentliche Wahl – Amtsende',
  extraordinary_successful_challenge: 'Außerordentliche Wahl – erfolgreiche Anfechtung',
  deputy_by_election: 'Nachwahl Stellvertretung',
};

export const electionProcedureLabels: Record<ElectionProcedure, string> = {
  formal: 'Förmliches Verfahren',
  simplified: 'Vereinfachtes Verfahren',
};

export const electionStatusLabels: Record<ElectionStatus, string> = {
  draft: 'Entwurf',
  procedure_confirmed: 'Verfahren bestätigt',
  preparation: 'Vorbereitung',
  nominations: 'Wahlvorschläge',
  ballots_ready: 'Stimmzettel bereit',
  voting: 'Stimmabgabe',
  counting: 'Auszählung',
  acceptance_pending: 'Annahme offen',
  result_final: 'Ergebnis festgestellt',
  announced: 'Ergebnis bekannt gemacht',
  closed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
};

export const officeTypeLabels: Record<OfficeType, string> = {
  representative: 'Vertrauensperson',
  deputy: 'Stellvertretung',
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  received: 'eingegangen',
  correction_required: 'Korrektur erforderlich',
  valid: 'gültig',
  invalid: 'ungültig',
  grace_period: 'Nachfrist läuft',
};

export const acceptanceStatusLabels: Record<AcceptanceStatus, string> = {
  pending: 'Annahme offen',
  accepted_by_silence: 'durch Fristablauf angenommen',
  accepted_explicit: 'ausdrücklich angenommen',
  rejected: 'abgelehnt',
  replaced: 'nachgerückt/ersetzt',
};

const boardRoleLabels: Record<string, string> = {
  chair: 'Vorsitz',
  member: 'Mitglied',
  substitute: 'Ersatzmitglied',
  election_leader: 'Wahlleitung',
  assistant: 'Wahlhilfe',
};

const voterListStatusLabels: Record<string, string> = {
  eligible: 'wahlberechtigt',
  not_eligible: 'nicht wahlberechtigt',
};

const candidateEligibilityLabels: Record<string, string> = {
  policy_eligible: 'wählbar',
  policy_conflict: 'Prüfkonflikt',
};

export function electionBoardRoleLabel(role: string): string {
  return boardRoleLabels[role] ?? role;
}

export function electionVoterListStatusLabel(status: string): string {
  return voterListStatusLabels[status] ?? status;
}

export function electionCandidateEligibilityLabel(status: string): string {
  return candidateEligibilityLabels[status] ?? status;
}
