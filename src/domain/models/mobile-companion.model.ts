export type MobileCompanionDeviceStatus = 'active' | 'disabled';
export type MobileCompanionThemeMode = 'dark' | 'light';

export interface MobileCompanionDevice {
  id: string;
  label: string;
  instanceId: string;
  keyFingerprint: string;
  recipientToken: string;
  status: MobileCompanionDeviceStatus;
  createdAt: string;
  updatedAt: string;
  lastSnapshotAt?: string;
}

export interface SaveMobileCompanionDeviceInput {
  label: string;
  recipientToken: string;
}

export interface MobileCompanionSnapshotInput {
  deviceId: string;
  caseIds: string[];
  uiThemeMode?: MobileCompanionThemeMode;
}

export interface MobileCompanionCaseProjection {
  id: string;
  caseNumber: string;
  displayName: string;
  category: string;
  status: string;
  priority: string;
  openedAt?: string;
  updatedAt: string;
}

export interface MobileCompanionDeadlineProjection {
  id: string;
  caseId: string;
  type: string;
  title: string;
  confidentialTitle?: string;
  dueAt: string;
  reminderAt?: string;
  legalBasis?: string;
  severity: string;
  status: string;
  isLegalDeadline: boolean;
  updatedAt: string;
}

export interface MobileCompanionSnapshotPayload {
  protocolVersion: '1.0';
  schemaVersion: 1;
  packageId: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  createdAt: string;
  baseAuditSequence: number;
  uiPreferences: {
    themeMode: MobileCompanionThemeMode;
  };
  cases: MobileCompanionCaseProjection[];
  deadlines: MobileCompanionDeadlineProjection[];
}

export interface MobileCompanionQrFrame {
  protocolVersion: '1.0';
  transferSessionId: string;
  encryptionMode: 'recipient_key_only';
  packageId: string;
  frameIndex: number;
  frameCount: number;
  payloadLength: number;
  chunkChecksum: string;
  packageSha256: string;
  payload: string;
}

export interface MobileCompanionSnapshotResult {
  packageId: string;
  targetInstanceId: string;
  caseCount: number;
  deadlineCount: number;
  serializedEnvelope: string;
  qrFrames: string[];
  createdAt: string;
}
