import { describe, expect, it } from 'vitest';
import { ElectionTransferCryptoAdapter } from '../../../services/electionTransferCryptoAdapter';
import { createCompleteElectionTransferPayload } from '../../helpers/electionTransferFixture';

function payload() {
  return createCompleteElectionTransferPayload();
}

describe('ElectionTransferCryptoAdapter', () => {
  it('roundtrips a protected election package using the shared authenticated transfer primitive', () => {
    const adapter = new ElectionTransferCryptoAdapter();
    const source = payload();
    const envelope = adapter.encrypt(source, 'eine ausreichend lange Wahlakten-Passphrase');
    expect(adapter.decrypt(envelope, 'eine ausreichend lange Wahlakten-Passphrase')).toEqual(source);
  });

  it('rejects a wrong passphrase and authenticated-envelope manipulation', () => {
    const adapter = new ElectionTransferCryptoAdapter();
    const envelope = adapter.encrypt(payload(), 'eine ausreichend lange Wahlakten-Passphrase');
    expect(() => adapter.decrypt(envelope, 'falsche ausreichend lange Passphrase')).toThrow();
    expect(() => adapter.decrypt({ ...envelope, packageId: 'election_manipulated' }, 'eine ausreichend lange Wahlakten-Passphrase')).toThrow();
  });

  it('rejects unsupported format versions and weakened KDF parameters before decryption', () => {
    const adapter = new ElectionTransferCryptoAdapter();
    const passphrase = 'eine ausreichend lange Wahlakten-Passphrase';
    const envelope = adapter.encrypt(payload(), passphrase);

    expect(() => adapter.decrypt({ ...envelope, version: envelope.version + 1 }, passphrase)).toThrow();
    expect(() => adapter.decrypt({
      ...envelope,
      crypto: { ...envelope.crypto, kdfParams: { ...envelope.crypto.kdfParams, N: 1_024 } },
    }, passphrase)).toThrow();
  });

  it('rejects a payload whose manifest no longer authenticates every transferred entity', () => {
    const adapter = new ElectionTransferCryptoAdapter();
    const source = payload();
    source.data.sbv_elections = [{ id: 'election-1', status: 'voting' }];

    expect(() => adapter.encrypt(source, 'eine ausreichend lange Wahlakten-Passphrase')).toThrow();
  });
});
