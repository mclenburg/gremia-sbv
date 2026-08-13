import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface EncryptedReportEnvelope {
  version: 1;
  type: 'gremia-sbv-encrypted-report-pdf';
  algorithm: 'aes-256-gcm';
  originalFileName: string;
  createdAt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function destroyBuffer(buffer?: Buffer): void {
  try { buffer?.fill(0); } catch { /* Best-Effort-Speicherhygiene. */ }
}

function deriveReportArchiveKey(databaseKey: Buffer): Buffer {
  return createHash('sha256')
    .update('gremia-sbv-report-archive-v1')
    .update(databaseKey)
    .digest();
}

function decodeFixedHex(value: unknown, bytes: number, label: string): Buffer {
  if (typeof value !== 'string' || value.length !== bytes * 2 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error(`Ungültige ${label}-Metadaten im verschlüsselten Bericht.`);
  }
  return Buffer.from(value, 'hex');
}

function parseEnvelope(serialized: string): EncryptedReportEnvelope {
  const envelope = JSON.parse(serialized) as Partial<EncryptedReportEnvelope>;
  if (
    envelope.version !== 1 ||
    envelope.type !== 'gremia-sbv-encrypted-report-pdf' ||
    envelope.algorithm !== 'aes-256-gcm' ||
    typeof envelope.originalFileName !== 'string' ||
    !envelope.originalFileName.trim() ||
    typeof envelope.ciphertext !== 'string' ||
    !envelope.ciphertext
  ) {
    throw new Error('Der Berichtsexport hat kein unterstütztes verschlüsseltes Gremia.SBV-Format.');
  }
  return envelope as EncryptedReportEnvelope;
}

export function encryptReportArchive(
  pdf: Buffer,
  originalFileName: string,
  databaseKey: Buffer,
): EncryptedReportEnvelope {
  if (!originalFileName.trim()) throw new Error('Der Berichtsdateiname fehlt.');
  const key = deriveReportArchiveKey(databaseKey);
  const iv = randomBytes(12);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(originalFileName, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(pdf), cipher.final()]);
    try {
      return {
        version: 1,
        type: 'gremia-sbv-encrypted-report-pdf',
        algorithm: 'aes-256-gcm',
        originalFileName,
        createdAt: new Date().toISOString(),
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex'),
        ciphertext: ciphertext.toString('base64'),
      };
    } finally {
      destroyBuffer(ciphertext);
    }
  } finally {
    destroyBuffer(key);
    destroyBuffer(iv);
  }
}

export function decryptReportArchive(
  serialized: string,
  databaseKey: Buffer,
): { pdf: Buffer; originalFileName: string } {
  const envelope = parseEnvelope(serialized);
  const key = deriveReportArchiveKey(databaseKey);
  const iv = decodeFixedHex(envelope.iv, 12, 'IV');
  const tag = decodeFixedHex(envelope.tag, 16, 'Authentifizierungs');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(envelope.originalFileName, 'utf8'));
    decipher.setAuthTag(tag);
    return {
      pdf: Buffer.concat([decipher.update(ciphertext), decipher.final()]),
      originalFileName: envelope.originalFileName,
    };
  } finally {
    destroyBuffer(key);
    destroyBuffer(iv);
    destroyBuffer(tag);
    destroyBuffer(ciphertext);
  }
}
