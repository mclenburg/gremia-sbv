import { open, writeFile } from 'node:fs/promises';
import { ApplicationError } from '../src/domain/models/application-error.model.js';
import { parseMobileCompanionPairingRequest, parseMobileCompanionPairingResponse } from './mobileCompanionPairingPolicy.js';

const MAX_PAIRING_BYTES = 16_384;

export async function saveMobilePairingRequest(filePath: string, request: string): Promise<void> {
  if (Buffer.byteLength(request, 'utf8') > MAX_PAIRING_BYTES) throw invalidPairingFile();
  parseMobileCompanionPairingRequest(request);
  await writeFile(filePath, request, { encoding: 'utf8', mode: 0o600 });
}

export async function readMobilePairingResponse(filePath: string): Promise<string> {
  const file = await open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_PAIRING_BYTES) throw invalidPairingFile();
    const bytes = Buffer.alloc(MAX_PAIRING_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = await file.read(bytes, size, bytes.length - size, size);
      if (read.bytesRead === 0) break;
      size += read.bytesRead;
    }
    if (size > MAX_PAIRING_BYTES) throw invalidPairingFile();
    const value = bytes.subarray(0, size).toString('utf8').trim();
    try { parseMobileCompanionPairingResponse(value); } catch { throw invalidPairingFile(); }
    return value;
  } finally {
    await file.close();
  }
}

function invalidPairingFile(): ApplicationError {
  return new ApplicationError('VALIDATION_FAILED', 'Bitte eine gültige Gremia.SBV-Kopplungsdatei bis 16 KiB auswählen.');
}
