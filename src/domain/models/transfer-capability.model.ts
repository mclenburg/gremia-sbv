export interface TransferCapabilities {
  protocolVersion: 1;
  readFormats: number[];
  writeFormats: number[];
  features: string[];
  buildVersion: string;
  revision: number;
  issuedAt: string;
}

export interface TransferCapabilityDocument {
  kind: 'gremia-sbv-capability';
  version: 1;
  origin: { instanceId: string; keyFingerprint: string };
  target: { instanceId: string; keyFingerprint: string };
  capabilities: TransferCapabilities;
  proof: { scheme: 'x25519-hkdf-hmac-sha256-v1'; mac: string };
}
