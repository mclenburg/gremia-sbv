import { describe, expect, it } from 'vitest';
import {
  CURRENT_TRANSFER_SCRYPT_PARAMS,
  assertCaseHandoverEnvelope,
  decryptCaseHandoverEnvelope,
  encryptCaseHandoverPayloadV2,
} from '../services/caseHandoverCrypto';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION } from '../services/caseHandoverPolicy';

function payloadText(packageId: string, createdAt: string): string {
  return JSON.stringify({
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_VERSION,
    packageId,
    createdAt,
    purpose: 'SBV-Vertretung',
    cases: [{ ref: 'case_1', data: { id: 'case-1', case_number: 'SBV-1', display_name: 'Testakte' } }],
    protectedPersons: [],
    notes: [],
    measures: [],
    measureNotes: [],
    deadlines: [],
    documents: [],
  });
}

describe('case handover crypto 0.9.2', () => {
  it('schreibt neue Falluebergaben als v2-Envelope mit starken KDF-Parametern', () => {
    const createdAt = '2026-06-01T10:00:00.000Z';
    const envelope = encryptCaseHandoverPayloadV2({
      payloadText: payloadText('handover_test_crypto', createdAt),
      passphrase: 'sehr lange Transport-Passphrase',
      packageId: 'handover_test_crypto',
      createdAt,
    });

    expect(envelope.version).toBe(CASE_HANDOVER_VERSION);
    expect(envelope.crypto.algorithm).toBe('aes-256-gcm');
    expect(envelope.crypto.kdf).toBe('scrypt');
    expect(envelope.crypto.kdfParams).toEqual(CURRENT_TRANSFER_SCRYPT_PARAMS);
    expect(envelope.integrity.aadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.integrity.ciphertextSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('bestaetigt unveraenderte Pakete und lehnt falsche Passphrase oder Manipulation ab', () => {
    const createdAt = '2026-06-01T10:00:00.000Z';
    const passphrase = 'sehr lange Transport-Passphrase';
    const envelope = encryptCaseHandoverPayloadV2({
      payloadText: payloadText('handover_test_verify', createdAt),
      passphrase,
      packageId: 'handover_test_verify',
      createdAt,
      expiresAt: '2026-07-01T23:59:59.000Z',
    });

    const parsedEnvelope = assertCaseHandoverEnvelope(envelope);
    expect(decryptCaseHandoverEnvelope(parsedEnvelope, passphrase).payloadText).toContain('handover_test_verify');

    expect(() => decryptCaseHandoverEnvelope(parsedEnvelope, 'falsche Passphrase')).toThrow();
    expect(() => decryptCaseHandoverEnvelope({ ...envelope, payload: `${envelope.payload.slice(0, -2)}AA` }, passphrase)).toThrow();
    expect(() => decryptCaseHandoverEnvelope({ ...envelope, expiresAt: '2026-08-01T23:59:59.000Z' }, passphrase)).toThrow();
    expect(() => decryptCaseHandoverEnvelope({ ...envelope, crypto: { ...envelope.crypto, tag: `${envelope.crypto.tag.slice(0, -2)}AA` } }, passphrase)).toThrow();
  });
});
