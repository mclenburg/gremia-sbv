import { createHmac, createPrivateKey, createPublicKey, diffieHellman, hkdfSync } from 'node:crypto';
import type { TransferInstancePrivateIdentity } from './transferInstanceIdentityService.js';
import type { TargetBoundTransferEnvelope } from './targetBoundTransferCrypto.js';

/** Authenticates the ciphertext with the two explicitly paired static identities. */
export function authenticateMobileSnapshot(envelope: TargetBoundTransferEnvelope, sender: TransferInstancePrivateIdentity, recipientPublicKeyPem: string) {
  const secret = diffieHellman({ privateKey: createPrivateKey(sender.privateKeyPem), publicKey: createPublicKey(recipientPublicKeyPem) });
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0),
    `gremia-sbv-mobile-snapshot-origin-v1:${envelope.packageId}:${envelope.recipientBinding.targetInstanceId}`, 32));
  try {
    const mac = createHmac('sha256', key).update([
      envelope.integrity.aadSha256, envelope.integrity.ciphertextSha256, envelope.crypto.tag,
    ].join('|'), 'utf8').digest('base64');
    return { ...envelope, senderProof: { scheme: 'x25519-hkdf-hmac-sha256-v1', keyFingerprint: sender.keyFingerprint, mac } };
  } finally { secret.fill(0); key.fill(0); }
}
