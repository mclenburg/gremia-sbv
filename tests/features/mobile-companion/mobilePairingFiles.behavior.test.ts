import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTransferKeyFingerprint, formatTransferRecipientToken } from '../../../services/transferInstanceIdentityPolicy';
import { createMobileCompanionPairingRequest, createMobileCompanionPairingResponse } from '../../../services/mobileCompanionPairingPolicy';
import { readMobilePairingResponse, saveMobilePairingRequest } from '../../../services/mobilePairingFileService';

function identity(instanceId: string) {
  const keys = generateKeyPairSync('x25519', { publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const value = { instanceId, publicKeyPem: keys.publicKey, keyFingerprint: createTransferKeyFingerprint(keys.publicKey) };
  return { ...value, recipientToken: formatTransferRecipientToken(value), createdAt: new Date().toISOString(), privateKeyPem: keys.privateKey };
}

describe('öffentlicher Kopplungsdateiaustausch', () => {
  it('überträgt Anfrage und Antwort verlustfrei ohne private Schlüssel', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'gremia-pairing-test-'));
    try {
      const desktop = identity('ABCDE');
      const mobile = identity('FGHJK');
      const file = path.join(directory, 'pairing.gsbvpair');
      const request = createMobileCompanionPairingRequest(desktop);
      await saveMobilePairingRequest(file, request.pairingRequest);
      const saved = await readFile(file, 'utf8');
      const response = createMobileCompanionPairingResponse(saved, mobile.recipientToken);
      await writeFile(file, response.pairingResponse);
      expect(await readMobilePairingResponse(file)).toBe(response.pairingResponse);
      const decoded = Buffer.from(response.pairingResponse.split('.')[1], 'base64url').toString();
      expect(decoded).not.toContain(desktop.privateKeyPem);
      expect(decoded).not.toContain(mobile.privateKeyPem);
      await writeFile(file, 'x'.repeat(16_385));
      await expect(readMobilePairingResponse(file)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
      await writeFile(file, request.pairingRequest);
      await expect(readMobilePairingResponse(file)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
