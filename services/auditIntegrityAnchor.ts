import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { atomicWriteFileSync } from './secureFileOperations.js';
import { PERSONAL_DATA_AUDIT_GENESIS_HASH } from './auditHashChain.js';

export interface AuditIntegrityAnchor {
  vaultId: string;
  sequence: number;
  entryHash: string;
  legacyMaxSequence: number;
}

const AAD = Buffer.from('gremia-sbv-audit-integrity-anchor-v1');

function anchorKey(databaseKey: Buffer): Buffer {
  if (databaseKey.length !== 32) throw new Error('Ungültiger Tresorschlüssel für den Audit-Anker.');
  return Buffer.from(hkdfSync('sha256', databaseKey, Buffer.alloc(0), AAD, 32));
}

function validAnchor(value: unknown): value is AuditIntegrityAnchor {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.vaultId === 'string' && /^[a-f0-9]{32}$/.test(item.vaultId)
    && Number.isSafeInteger(item.sequence) && Number(item.sequence) >= 0
    && typeof item.entryHash === 'string' && /^[a-f0-9]{64}$/.test(item.entryHash)
    && (Number(item.sequence) > 0 || item.entryHash === PERSONAL_DATA_AUDIT_GENESIS_HASH)
    && Number.isSafeInteger(item.legacyMaxSequence) && Number(item.legacyMaxSequence) >= 0
    && Number(item.legacyMaxSequence) <= Number(item.sequence);
}

export function writeAuditIntegrityAnchor(filePath: string, databaseKey: Buffer, value: AuditIntegrityAnchor): void {
  if (!validAnchor(value)) throw new Error('Ungültiger Audit-Anker.');
  const key = anchorKey(databaseKey);
  try {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    atomicWriteFileSync(filePath, `${JSON.stringify({
      version: 1,
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    })}\n`);
  } finally {
    key.fill(0);
  }
}

export function readAuditIntegrityAnchor(filePath: string, databaseKey: Buffer, vaultId: string): AuditIntegrityAnchor {
  const key = anchorKey(databaseKey);
  try {
    const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    if (envelope.version !== 1 || typeof envelope.nonce !== 'string'
      || typeof envelope.ciphertext !== 'string' || typeof envelope.tag !== 'string') {
      throw new Error('Ungültiges Audit-Ankerformat.');
    }
    const nonce = Buffer.from(envelope.nonce, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    if (nonce.length !== 12 || tag.length !== 16) throw new Error('Ungültiges Audit-Ankerformat.');
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final()
    ]).toString('utf8');
    const value = JSON.parse(plaintext) as unknown;
    if (!validAnchor(value) || value.vaultId !== vaultId) throw new Error('Audit-Anker gehört nicht zu diesem Tresor.');
    return value;
  } finally {
    key.fill(0);
  }
}
