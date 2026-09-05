import type { TransferRecipientIdentity } from '../src/domain/models/transfer-identity.model.js';
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
}): CaseHandoverEnvelopeV2 {
  return encryptTargetBoundTransferPayload({
    format: CASE_HANDOVER_FORMAT,
    version: CASE_HANDOVER_VERSION,
    packageId: args.packageId,
    createdAt: args.createdAt,
    expiresAt: args.expiresAt,
    payloadText: args.payloadText,
    passphrase: args.passphrase,
    recipient: args.recipient,
  });
}
