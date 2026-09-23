import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authenticateMobileTransfer, verifyMobileTransferOrigin } from '../../../services/mobileTransferOriginProof';
import { encryptTargetBoundTransferPayload } from '../../../services/targetBoundTransferCrypto';
import { createTransferKeyFingerprint, formatTransferRecipientToken } from '../../../services/transferInstanceIdentityPolicy';

function identity(instanceId: string) {
  const keys = generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const publicIdentity = { instanceId, publicKeyPem: keys.publicKey, keyFingerprint: createTransferKeyFingerprint(keys.publicKey) };
  return { ...publicIdentity, version: 1 as const, privateKeyPem: keys.privateKey,
    createdAt: new Date().toISOString(), recipientToken: formatTransferRecipientToken(publicIdentity) };
}

function fixture() {
  const mobile = identity('ABCDE');
  const desktop = identity('FGHJK');
  const envelope = encryptTargetBoundTransferPayload({
    format: 'gremia-sbv-mobile-return', version: 1, packageId: 'return-proof-test',
    createdAt: mobile.createdAt, payloadText: 'synthetic return', passphrase: '',
    recipient: desktop, protectionMode: 'recipient_key_only',
  });
  return { mobile, desktop, envelope };
}

describe('Mobile transfer sender authentication', () => {
  it('verifies the paired sender and binds proof to direction, recipient and ciphertext', () => {
    const { mobile, desktop, envelope } = fixture();
    const authenticated = authenticateMobileTransfer(envelope, mobile, desktop.publicKeyPem, 'return');
    expect(() => verifyMobileTransferOrigin(authenticated, desktop, mobile, 'return')).not.toThrow();
    expect(() => verifyMobileTransferOrigin(authenticated, desktop, mobile, 'snapshot')).toThrow(/Herkunftsnachweis/);
    expect(() => verifyMobileTransferOrigin(authenticated, identity(desktop.instanceId), mobile, 'return')).toThrow(/Herkunftsnachweis/);
    const substituted = { ...authenticated, integrity: { ...authenticated.integrity, ciphertextSha256: '0'.repeat(64) } };
    expect(() => verifyMobileTransferOrigin(substituted, desktop, mobile, 'return')).toThrow(/Herkunftsnachweis/);
    expect(() => verifyMobileTransferOrigin({ ...authenticated, packageId: 'another-package' }, desktop, mobile, 'return')).toThrow(/Herkunftsnachweis/);
  });

  it('rejects a sender who knows the paired public identity but not its private key', () => {
    const { mobile, desktop, envelope } = fixture();
    const imposter = { ...mobile, privateKeyPem: identity(mobile.instanceId).privateKeyPem };
    const forged = authenticateMobileTransfer(envelope, imposter, desktop.publicKeyPem, 'return');
    expect(() => verifyMobileTransferOrigin(forged, desktop, mobile, 'return')).toThrow(/Herkunftsnachweis/);
  });

  it.each([undefined, null, [], {}, { scheme: 'none' },
    { scheme: 'x25519-hkdf-hmac-sha256-v1', keyFingerprint: '0'.repeat(64), mac: 'invalid' },
  ])('rejects absent or malformed proof %#', (senderProof) => {
    const { mobile, desktop, envelope } = fixture();
    expect(() => verifyMobileTransferOrigin({ ...envelope, senderProof }, desktop, mobile, 'return')).toThrow(/Herkunftsnachweis/);
  });
});
