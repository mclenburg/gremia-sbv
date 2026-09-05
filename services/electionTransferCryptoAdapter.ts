import {
  decryptAuthenticatedTransferPayload,
  encryptAuthenticatedTransferPayload,
  type AuthenticatedTransferEnvelopeV2,
} from './caseHandoverCrypto.js';
import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import {
  ELECTION_TRANSFER_DATA_REFS,
  ELECTION_TRANSFER_FORMAT,
  ELECTION_TRANSFER_VERSION,
  electionManifestHash,
  sha256Canonical,
  type ElectionTransferPayload,
} from './electionTransferPolicy.js';

export type ElectionTransferEnvelope = AuthenticatedTransferEnvelopeV2;

export class ElectionTransferCryptoAdapter {
  encrypt(payload: ElectionTransferPayload, passphrase: string, recipient?: TransferRecipientIdentity): ElectionTransferEnvelope {
    this.assertPassphrase(passphrase);
    this.assertPayload(payload);
    return encryptAuthenticatedTransferPayload({
      format: ELECTION_TRANSFER_FORMAT,
      version: ELECTION_TRANSFER_VERSION,
      packageId: payload.manifest.packageId,
      createdAt: payload.manifest.createdAt,
      payloadText: JSON.stringify(payload),
      passphrase,
      recipient,
    });
  }

  decrypt(envelope: ElectionTransferEnvelope, passphrase: string, localIdentity?: TransferInstancePrivateIdentity): ElectionTransferPayload {
    this.assertPassphrase(passphrase);
    const text = decryptAuthenticatedTransferPayload(envelope, passphrase, {
      format: ELECTION_TRANSFER_FORMAT,
      version: ELECTION_TRANSFER_VERSION,
    }, localIdentity);
    const parsed = JSON.parse(text) as ElectionTransferPayload;
    this.assertPayload(parsed);
    if (parsed.manifest.packageId !== envelope.packageId || parsed.manifest.createdAt !== envelope.createdAt) {
      throw new Error('Wahlaktenmanifest stimmt nicht mit dem geschützten Envelope überein.');
    }
    return parsed;
  }

  manifestHash(payload: ElectionTransferPayload): string {
    this.assertPayload(payload);
    return electionManifestHash(payload.manifest);
  }

  private assertPayload(payload: ElectionTransferPayload): void {
    if (!payload || typeof payload !== 'object' || !payload.manifest || !payload.data) throw new Error('Wahlaktenübergabe enthält keine gültigen Nutzdaten.');
    if (payload.manifest.formatVersion !== ELECTION_TRANSFER_VERSION) throw new Error('Nicht unterstützte Wahlaktenversion.');
    if (!payload.manifest.packageId.startsWith('election_') || !payload.manifest.electionId || !/^[a-f0-9]{64}$/i.test(payload.manifest.sourceVaultIdHash) || !payload.manifest.items.length) throw new Error('Wahlaktenmanifest ist unvollständig.');
    const seen = new Set<string>();
    const allowedRefs = new Set<string>(ELECTION_TRANSFER_DATA_REFS);
    let electionItemFound = false;
    for (const item of payload.manifest.items) {
      if (!item.ref || !item.entityType || !/^[a-f0-9]{64}$/i.test(item.sha256) || seen.has(item.ref)) throw new Error('Wahlaktenmanifest enthält einen ungültigen Eintrag.');
      if (!allowedRefs.has(item.ref)) throw new Error('Wahlaktenmanifest enthält einen unbekannten Datenbereich.');
      seen.add(item.ref);
      electionItemFound ||= item.entityType === 'election' && item.ref === 'sbv_elections';
      if (!(item.ref in payload.data) || sha256Canonical(payload.data[item.ref]) !== item.sha256) throw new Error('Wahlaktenmanifest stimmt nicht mit den Nutzdaten überein.');
    }
    if (!electionItemFound || Object.keys(payload.data).length !== ELECTION_TRANSFER_DATA_REFS.length || seen.size !== ELECTION_TRANSFER_DATA_REFS.length || ELECTION_TRANSFER_DATA_REFS.some((ref) => !seen.has(ref))) {
      throw new Error('Wahlaktenmanifest ist unvollständig.');
    }
  }

  private assertPassphrase(passphrase: string): void {
    if (passphrase.length < 10) throw new Error('Die Wahlakten-Passphrase muss mindestens 10 Zeichen lang sein.');
  }
}
