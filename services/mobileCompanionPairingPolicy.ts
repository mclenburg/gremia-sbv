import { createHash, randomUUID } from 'node:crypto';
import type { TransferInstanceIdentity } from '../src/domain/models/transfer-identity.model.js';
import { parseTransferRecipientToken } from './transferInstanceIdentityPolicy.js';

export const MOBILE_COMPANION_PAIRING_PREFIX = 'GSBVMOBILEPAIR1';
export const MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION = '1.0';

export interface MobileCompanionPairingRequest {
  protocolVersion: '1.0';
  role: 'desktop_pairing_request';
  sessionId: string;
  createdAt: string;
  desktopRecipientToken: string;
}

export interface MobileCompanionPairingResponse {
  protocolVersion: '1.0';
  role: 'mobile_pairing_response';
  request: MobileCompanionPairingRequest;
  mobileRecipientToken: string;
}

export interface MobileCompanionPairingRequestResult {
  sessionId: string;
  createdAt: string;
  pairingRequest: string;
  desktopInstanceId: string;
  desktopKeyFingerprint: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function encodePairingPayload(payload: MobileCompanionPairingRequest | MobileCompanionPairingResponse): string {
  return `${MOBILE_COMPANION_PAIRING_PREFIX}.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

function decodePairingPayload(value: string): unknown {
  const parts = value.trim().split('.');
  if (parts.length !== 2 || parts[0] !== MOBILE_COMPANION_PAIRING_PREFIX) throw new Error('Pairingkennung ist ungültig.');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new Error('Pairingkennung konnte nicht gelesen werden.');
  }
}

function assertStringField(record: Record<string, unknown>, key: string, label: string, maxLength = 5000): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error(`${label} fehlt im Pairingvertrag.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} fehlt im Pairingvertrag.`);
  if (trimmed.length > maxLength) throw new Error(`${label} ist im Pairingvertrag zu lang.`);
  return trimmed;
}

function assertPairingRequestPayload(value: unknown): MobileCompanionPairingRequest {
  if (!value || typeof value !== 'object') throw new Error('Pairinganfrage ist ungültig.');
  const record = value as Record<string, unknown>;
  if (record.protocolVersion !== MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION || record.role !== 'desktop_pairing_request') {
    throw new Error('Pairinganfrage nutzt kein unterstütztes Format.');
  }
  const request = {
    protocolVersion: MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION,
    role: 'desktop_pairing_request',
    sessionId: assertStringField(record, 'sessionId', 'Pairing-Session', 120),
    createdAt: assertStringField(record, 'createdAt', 'Pairing-Zeitpunkt', 80),
    desktopRecipientToken: assertStringField(record, 'desktopRecipientToken', 'Desktop-Empfängerkennung'),
  } satisfies MobileCompanionPairingRequest;
  parseTransferRecipientToken(request.desktopRecipientToken);
  return request;
}

export function parseMobileCompanionPairingRequest(value: string): MobileCompanionPairingRequest {
  return assertPairingRequestPayload(decodePairingPayload(value));
}

export function parseMobileCompanionPairingResponse(value: string): MobileCompanionPairingResponse {
  const decoded = decodePairingPayload(value);
  if (!decoded || typeof decoded !== 'object') throw new Error('Pairingantwort ist ungültig.');
  const record = decoded as Record<string, unknown>;
  if (record.protocolVersion !== MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION || record.role !== 'mobile_pairing_response') {
    throw new Error('Pairingantwort nutzt kein unterstütztes Format.');
  }
  const request = assertPairingRequestPayload(record.request);
  const mobileRecipientToken = assertStringField(record, 'mobileRecipientToken', 'Mobile-Empfängerkennung');
  parseTransferRecipientToken(mobileRecipientToken);
  return {
    protocolVersion: MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION,
    role: 'mobile_pairing_response',
    request,
    mobileRecipientToken,
  };
}

export function createMobileCompanionPairingRequest(identity: TransferInstanceIdentity): MobileCompanionPairingRequestResult {
  const request = {
    protocolVersion: MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION,
    role: 'desktop_pairing_request',
    sessionId: randomUUID(),
    createdAt: nowIso(),
    desktopRecipientToken: identity.recipientToken,
  } satisfies MobileCompanionPairingRequest;
  return {
    sessionId: request.sessionId,
    createdAt: request.createdAt,
    pairingRequest: encodePairingPayload(request),
    desktopInstanceId: identity.instanceId,
    desktopKeyFingerprint: identity.keyFingerprint,
  };
}

export function createMobileCompanionPairingResponse(
  pairingRequest: string,
  mobileRecipientToken: string,
): { pairingResponse: string; securityCode: string } {
  const request = parseMobileCompanionPairingRequest(pairingRequest);
  const response = {
    protocolVersion: MOBILE_COMPANION_PAIRING_PROTOCOL_VERSION,
    role: 'mobile_pairing_response',
    request,
    mobileRecipientToken: parseTransferRecipientToken(mobileRecipientToken).recipientToken,
  } satisfies MobileCompanionPairingResponse;
  return {
    pairingResponse: encodePairingPayload(response),
    securityCode: formatMobileCompanionPairingSecurityCode(response),
  };
}

export function formatMobileCompanionPairingSecurityCode(response: MobileCompanionPairingResponse): string {
  const desktop = parseTransferRecipientToken(response.request.desktopRecipientToken);
  const mobile = parseTransferRecipientToken(response.mobileRecipientToken);
  const digest = createHash('sha256')
    .update([
      'gremia-sbv-mobile-pairing-v1',
      response.request.sessionId,
      desktop.instanceId,
      desktop.keyFingerprint,
      mobile.instanceId,
      mobile.keyFingerprint,
    ].join('|'), 'utf8')
    .digest();
  return base32Code(digest, 12).replace(/(.{4})/g, '$1-').replace(/-$/u, '');
}

function base32Code(bytes: Buffer, length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && output.length < length) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (output.length >= length) break;
  }
  return output;
}
