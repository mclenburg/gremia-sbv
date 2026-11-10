import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import type { TransferProtectionMode } from '../src/domain/models/case-handover.model.js';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION, CASE_HANDOVER_VERSION } from './caseHandoverPolicy.js';
import type { CaseHandoverEnvelopeV2 } from './caseHandoverCrypto.js';
import { encryptTargetBoundTransferPayload } from './targetBoundTransferCrypto.js';

export function encryptCaseHandoverPayloadForRecipient(args: {
  payloadText: string;
  passphrase: string;
  packageId: string;
  createdAt: string;
  expiresAt?: string;
  recipient: TransferRecipientIdentity;
  protectionMode?: TransferProtectionMode;
  formatVersion?: number;
}): CaseHandoverEnvelopeV2 {
  const formatVersion = args.formatVersion ?? CASE_HANDOVER_VERSION;
  if (formatVersion !== CASE_HANDOVER_VERSION && formatVersion !== CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION) {
    throw new Error('Nicht unterstützte Version des Fallübergabepakets.');
  }
  if (formatVersion === CASE_HANDOVER_TARGET_BOUND_LEGACY_VERSION && args.protectionMode === 'recipient_key_only') {
    throw new Error('Ältere Zielversionen benötigen Empfängerschlüssel und Transport-Passphrase.');
  }
  return encryptTargetBoundTransferPayload({
    format: CASE_HANDOVER_FORMAT,
    version: formatVersion,
    packageId: args.packageId,
    createdAt: args.createdAt,
    expiresAt: args.expiresAt,
    payloadText: args.payloadText,
    passphrase: args.passphrase,
    recipient: args.recipient,
    protectionMode: args.protectionMode,
  });
}
