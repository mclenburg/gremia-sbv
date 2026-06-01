import { describe, expect, it } from 'vitest';
import {
  assertCaseHandoverEnvelope,
  decryptCaseHandoverEnvelope,
  encryptCaseHandoverPayloadV2,
  type CaseHandoverEnvelopeV2,
} from '../services/caseHandoverCrypto';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_LEGACY_VERSION, CASE_HANDOVER_VERSION } from '../services/caseHandoverPolicy';

const createdAt = '2026-06-01T10:00:00.000Z';
const passphrase = 'Transport-Passphrase mit ausreichender Laenge';

function payloadText(packageId: string): string {
  return JSON.stringify({
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_VERSION,
    packageId,
    createdAt,
    purpose: 'SBV-Vertretung',
    cases: [{ ref: 'case_1', data: { case_number: 'SBV-1', display_name: 'Testakte' } }],
    protectedPersons: [],
    notes: [],
    measures: [],
    measureNotes: [],
    deadlines: [],
    documents: [],
  });
}

function envelope(): CaseHandoverEnvelopeV2 {
  return encryptCaseHandoverPayloadV2({
    payloadText: payloadText('handover_branch_crypto'),
    passphrase,
    packageId: 'handover_branch_crypto',
    createdAt,
    expiresAt: '2026-07-01T00:00:00.000Z',
  });
}

describe('case handover crypto branch coverage 0.9.2', () => {
  it('validiert v2-Envelope strikt vor der Entschluesselung', () => {
    const valid = envelope();
    expect(assertCaseHandoverEnvelope(valid)).toMatchObject({ version: CASE_HANDOVER_VERSION, packageId: 'handover_branch_crypto' });

    expect(() => assertCaseHandoverEnvelope(null)).toThrow('kein gültiger Übergabe-Envelope');
    expect(() => assertCaseHandoverEnvelope({ ...valid, format: 'anderes-format' })).toThrow('Nicht unterstütztes Fallübergabeformat');
    expect(() => assertCaseHandoverEnvelope({ ...valid, packageId: 'ungueltig' })).toThrow('Paketkennung');
    expect(() => assertCaseHandoverEnvelope({ ...valid, createdAt: '' })).toThrow('Erstellungsdatum');
    expect(() => assertCaseHandoverEnvelope({ ...valid, expiresAt: 123 })).toThrow('Ablaufdatum');
    expect(() => assertCaseHandoverEnvelope({ ...valid, payload: '' })).toThrow('Nutzdaten');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: undefined })).toThrow('Kryptografie-Header');
    expect(() => assertCaseHandoverEnvelope({ ...valid, integrity: undefined })).toThrow('Kryptografie-Header');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, algorithm: 'aes-128-gcm' } })).toThrow('Nicht unterstütztes Fallübergabeformat');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, kdfParams: { ...valid.crypto.kdfParams, N: 32768 } } })).toThrow('KDF-Parameter');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, kdfParams: { ...valid.crypto.kdfParams, r: 0 } } })).toThrow('KDF-Parameter');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, kdfParams: { ...valid.crypto.kdfParams, maxmem: 1024 } } })).toThrow('KDF-Parameter');
    expect(() => assertCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, salt: '' } })).toThrow('salt');
    expect(() => assertCaseHandoverEnvelope({ ...valid, integrity: { ...valid.integrity, ciphertextSha256: '' } })).toThrow('ciphertextSha256');
  });

  it('bindet kryptografische Headerdaten, Integritaetswerte und Payload an die Passphrase', () => {
    const valid = envelope();
    const parsed = assertCaseHandoverEnvelope(valid);

    expect(decryptCaseHandoverEnvelope(parsed, passphrase)).toMatchObject({ formatVersion: CASE_HANDOVER_VERSION, legacyFormat: false, algorithm: 'aes-256-gcm' });
    expect(() => decryptCaseHandoverEnvelope(parsed, 'falsche Passphrase')).toThrow();
    expect(() => decryptCaseHandoverEnvelope({ ...valid, integrity: { ...valid.integrity, aadSha256: '0'.repeat(64) } }, passphrase)).toThrow('manipuliert');
    expect(() => decryptCaseHandoverEnvelope({ ...valid, integrity: { ...valid.integrity, ciphertextSha256: '0'.repeat(64) } }, passphrase)).toThrow('manipuliert');
    expect(() => decryptCaseHandoverEnvelope({ ...valid, crypto: { ...valid.crypto, iv: Buffer.alloc(12).toString('base64') } }, passphrase)).toThrow();
  });

  it('akzeptiert Legacy-v1-Envelope formal, lehnt aber unvollstaendige Legacy-Header ab', () => {
    const valid = envelope();
    const legacy = {
      format: CASE_HANDOVER_FORMAT,
      version: CASE_HANDOVER_LEGACY_VERSION,
      packageId: 'handover_legacy_branch',
      createdAt,
      kdf: 'scrypt',
      algorithm: 'aes-256-gcm',
      salt: valid.crypto.salt,
      iv: valid.crypto.iv,
      tag: valid.crypto.tag,
      aadHash: valid.integrity.aadSha256,
      payload: valid.payload,
    };

    expect(assertCaseHandoverEnvelope(legacy)).toMatchObject({ version: CASE_HANDOVER_LEGACY_VERSION, kdf: 'scrypt' });
    expect(() => assertCaseHandoverEnvelope({ ...legacy, kdf: 'pbkdf2' })).toThrow('Nicht unterstütztes Fallübergabeformat');
    expect(() => assertCaseHandoverEnvelope({ ...legacy, aadHash: '' })).toThrow('aadHash');
    expect(() => assertCaseHandoverEnvelope({ ...legacy, version: 99 })).toThrow('Nicht unterstütztes Fallübergabeformat');
  });
});
