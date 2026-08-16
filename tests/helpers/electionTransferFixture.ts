import {
  createElectionTransferManifest,
  ELECTION_TRANSFER_DATA_REFS,
  sha256Canonical,
  type ElectionTransferPayload,
} from '../../services/electionTransferPolicy';

export function createCompleteElectionTransferPayload(
  electionId = 'election-1',
  createdAt = '2026-08-16T06:00:00.000Z',
): ElectionTransferPayload {
  const data: Record<string, unknown> = {};
  for (const ref of ELECTION_TRANSFER_DATA_REFS) {
    data[ref] = ref === 'sbv_elections' ? [{ id: electionId, status: 'draft' }] : [];
  }

  const items = ELECTION_TRANSFER_DATA_REFS.map((ref) => ({
    ref,
    entityType: ref === 'sbv_elections' ? 'election' : ref,
    sha256: sha256Canonical(data[ref]),
  }));

  return {
    manifest: createElectionTransferManifest(electionId, 'b'.repeat(64), items, createdAt),
    data,
  };
}
