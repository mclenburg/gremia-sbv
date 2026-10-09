import { gunzipSync } from 'node:zlib';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

export const MAX_BACKUP_PAYLOAD_BYTES = 512 * 1024 * 1024;
export const MAX_BACKUP_ENVELOPE_BYTES = Math.ceil(MAX_BACKUP_PAYLOAD_BYTES * 4 / 3) + 2 * 1024 * 1024;

export function readBoundedBackupEnvelope(filePath: string): string {
  const fd = openSync(filePath, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size > MAX_BACKUP_ENVELOPE_BYTES) {
      throw new Error('Die Backup-Datei überschreitet die zulässige Größe.');
    }
    const buffer = Buffer.allocUnsafe(size);
    let read = 0;
    while (read < size) {
      const count = readSync(fd, buffer, read, size - read, null);
      if (count === 0) break;
      read += count;
    }
    return buffer.subarray(0, read).toString('utf8');
  } finally {
    closeSync(fd);
  }
}

export function gunzipBackupPayload(compressed: Buffer, maxOutputBytes = MAX_BACKUP_PAYLOAD_BYTES): Buffer {
  try {
    return gunzipSync(compressed, { maxOutputLength: maxOutputBytes });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
      throw new Error('Das Backup überschreitet die zulässige Größe des entschlüsselten Manifests.');
    }
    throw error;
  }
}
