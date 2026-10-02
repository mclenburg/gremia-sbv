import { deflateSync, inflateSync } from 'node:zlib';
import type { MobileCompanionSnapshotPayload } from '../src/domain/models/mobile-companion.model.js';

export const MOBILE_COMPANION_SNAPSHOT_FORMAT = 'gremia-sbv-mobile-snapshot';
export const MOBILE_COMPANION_SNAPSHOT_VERSION = 1;
export const MOBILE_COMPANION_PROTOCOL_VERSION = '1.0' as const;

const MAX_MOBILE_SNAPSHOT_BYTES = 1_000_000;

export function encodeMobileCompanionSnapshotPayload(payload: MobileCompanionSnapshotPayload): string {
  const serializedPayload = JSON.stringify(payload);
  if (Buffer.byteLength(serializedPayload, 'utf8') > MAX_MOBILE_SNAPSHOT_BYTES) {
    throw new Error('Mobile-Snapshot ist zu groß. Bitte weniger Fälle auswählen.');
  }
  return JSON.stringify({
    protocolVersion: MOBILE_COMPANION_PROTOCOL_VERSION,
    schemaVersion: MOBILE_COMPANION_SNAPSHOT_VERSION,
    payloadCompression: 'deflate',
    payloadBase64: deflateSync(serializedPayload).toString('base64'),
  });
}

export function decodeMobileCompanionSnapshotPayload(encoded: string): MobileCompanionSnapshotPayload {
  const wrapper = JSON.parse(encoded) as Record<string, unknown>;
  if (wrapper.protocolVersion !== MOBILE_COMPANION_PROTOCOL_VERSION
    || wrapper.schemaVersion !== MOBILE_COMPANION_SNAPSHOT_VERSION
    || wrapper.payloadCompression !== 'deflate'
    || typeof wrapper.payloadBase64 !== 'string') {
    throw new Error('Mobile-Snapshot nutzt kein unterstütztes Format.');
  }
  const compressed = Buffer.from(wrapper.payloadBase64, 'base64');
  if (compressed.byteLength > MAX_MOBILE_SNAPSHOT_BYTES) throw new Error('Mobile-Snapshot ist zu groß.');
  let inflated: Buffer;
  try {
    inflated = inflateSync(compressed, { maxOutputLength: MAX_MOBILE_SNAPSHOT_BYTES });
  } catch (error) {
    if (error instanceof RangeError || (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE')) {
      throw new Error('Mobile-Snapshot ist zu groß.');
    }
    throw error;
  } finally {
    compressed.fill(0);
  }
  try {
    return JSON.parse(inflated.toString('utf8')) as MobileCompanionSnapshotPayload;
  } finally {
    inflated.fill(0);
  }
}
