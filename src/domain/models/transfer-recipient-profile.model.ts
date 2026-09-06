export interface TransferRecipientProfile {
  id: string;
  label: string;
  instanceId: string;
  keyFingerprint: string;
  recipientToken: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveTransferRecipientProfileInput {
  label: string;
  recipientToken: string;
}
