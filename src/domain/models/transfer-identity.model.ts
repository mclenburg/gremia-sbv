export interface TransferRecipientIdentity {
  instanceId: string;
  keyFingerprint: string;
  publicKeyPem: string;
  recipientToken: string;
}

export interface TransferInstanceIdentity extends TransferRecipientIdentity {
  createdAt: string;
}
