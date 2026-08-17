import { createHash, randomUUID } from 'node:crypto';
import { ELECTION_LEGAL_RULE_VERSION } from '../src/domain/models/election.model.js';

export const ELECTION_TRANSFER_FORMAT = 'gremia.sbv.election-transfer';
export const ELECTION_TRANSFER_VERSION = 1;

export const ELECTION_TRANSFER_TABLE_REFS = [
  'sbv_elections',
  'sbv_election_board_members',
  'sbv_election_voters',
  'sbv_election_board_sessions',
  'sbv_election_candidates',
  'sbv_election_proposals',
  'sbv_election_proposal_candidates',
  'sbv_election_proposal_supporters',
  'sbv_election_objections',
  'sbv_election_mail_ballots',
  'sbv_election_vote_totals',
  'sbv_election_results',
  'sbv_election_events',
  'sbv_election_physical_records',
] as const;

export const ELECTION_TRANSFER_DATA_REFS = [
  ...ELECTION_TRANSFER_TABLE_REFS,
  'deadlines',
  'sbv_retention_legal_holds',
] as const;


export interface ElectionTransferManifestItem {
  ref: string;
  entityType: string;
  sha256: string;
}

export interface ElectionTransferManifest {
  packageId: string;
  createdAt: string;
  formatVersion: number;
  legalRuleVersion: string;
  electionId: string;
  sourceVaultIdHash: string;
  items: ElectionTransferManifestItem[];
}

export interface ElectionTransferPayload {
  manifest: ElectionTransferManifest;
  data: Record<string, unknown>;
}

export function hashElectionTransferSourceVaultId(vaultId: string): string {
  const normalized = vaultId.trim();
  if (!normalized) throw new Error('Quell-Tresor-ID fehlt.');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} muss eine SHA-256-Prüfsumme sein.`);
}

export function createElectionTransferManifest(
  electionId: string,
  sourceVaultIdHash: string,
  items: ElectionTransferManifestItem[],
  createdAt = new Date().toISOString(),
): ElectionTransferManifest {
  if (!electionId.trim()) throw new Error('Wahlaktenübergabe benötigt eine Wahl-ID.');
  assertSha256(sourceVaultIdHash, 'Quell-Tresor-ID-Hash');
  const normalizedItems = items.slice().sort((a, b) => a.ref.localeCompare(b.ref));
  const seen = new Set<string>();
  for (const item of normalizedItems) {
    if (!item.ref.trim() || !item.entityType.trim()) throw new Error('Wahlaktenmanifest enthält einen unvollständigen Eintrag.');
    assertSha256(item.sha256, 'Manifest-Prüfsumme');
    if (seen.has(item.ref)) throw new Error('Wahlaktenmanifest enthält doppelte Referenzen.');
    seen.add(item.ref);
  }
  return {
    packageId: `election_${randomUUID()}`,
    createdAt,
    formatVersion: ELECTION_TRANSFER_VERSION,
    legalRuleVersion: ELECTION_LEGAL_RULE_VERSION,
    electionId,
    sourceVaultIdHash,
    items: normalizedItems,
  };
}

export function electionManifestHash(manifest: ElectionTransferManifest): string {
  return sha256Canonical(manifest);
}
