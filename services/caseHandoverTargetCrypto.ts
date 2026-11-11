import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
import type { TransferProtectionMode } from '../src/domain/models/case-handover.model.js';
import { CASE_HANDOVER_FORMAT, CASE_HANDOVER_VERSION } from './caseHandoverPolicy.js';
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
  formatVersion?: 2 | 4;
}): CaseHandoverEnvelopeV2 {
  return encryptTargetBoundTransferPayload({
    format: CASE_HANDOVER_FORMAT,
    version: args.formatVersion ?? CASE_HANDOVER_VERSION,
    packageId: args.packageId,
    createdAt: args.createdAt,
    expiresAt: args.expiresAt,
    payloadText: args.payloadText,
    passphrase: args.passphrase,
    recipient: args.recipient,
    protectionMode: args.protectionMode,
  });
}
