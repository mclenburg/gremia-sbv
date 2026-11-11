import type { TransferCapabilities } from './transfer-capability.model.js';

export interface TransferRecipientProfile {
  id: string;
  label: string;
  instanceId: string;
  keyFingerprint: string;
  recipientToken: string;
  active: boolean;
  capabilities: TransferCapabilities | null;
  capabilityStatus: 'unknown' | 'verified';
  capabilityConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveTransferRecipientProfileInput {
  label: string;
  recipientToken: string;
}
