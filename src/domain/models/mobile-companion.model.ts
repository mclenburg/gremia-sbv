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
  pairingResponse: string;
  securityCode: string;
}

export interface MobileCompanionPairingRequestResult {
  sessionId: string;
  createdAt: string;
  pairingRequest: string;
  desktopInstanceId: string;
  desktopKeyFingerprint: string;
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
  returnTarget: {
    instanceId: string;
    keyFingerprint: string;
    publicKeyPem: string;
  };
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

export type MobileCompanionReturnChangeType =
  | 'create_note'
  | 'create_inbox'
  | 'create_deadline'
  | 'complete_deadline';

export interface MobileCompanionReturnCreateNoteChange {
  type: 'create_note';
  mobileId: string;
  caseId: string;
  changedAt: string;
  title: string;
  content: string;
  noteType?: 'gespraech' | 'protokoll' | 'telefonat' | 'videocall' | 'email' | 'bem' | 'anhoerung' | 'interne_notiz' | 'sonstiges';
  participants?: string;
  nextSteps?: string;
  containsHealthData?: boolean;
}

export interface MobileCompanionReturnCreateInboxChange {
  type: 'create_inbox';
  mobileId: string;
  changedAt: string;
  title: string;
  content: string;
  nextSteps?: string;
  containsHealthData?: boolean;
}

export interface MobileCompanionReturnCreateDeadlineChange {
  type: 'create_deadline';
  mobileId: string;
  caseId: string;
  changedAt: string;
  title: string;
  dueAt: string;
  reminderAt?: string;
  description?: string;
  severity?: 'normal' | 'important' | 'critical' | 'fatal';
}

export interface MobileCompanionReturnCompleteDeadlineChange {
  type: 'complete_deadline';
  mobileId: string;
  deadlineId: string;
  changedAt: string;
  baseUpdatedAt: string;
  completedNote?: string;
}

export type MobileCompanionReturnChange =
  | MobileCompanionReturnCreateNoteChange
  | MobileCompanionReturnCreateInboxChange
  | MobileCompanionReturnCreateDeadlineChange
  | MobileCompanionReturnCompleteDeadlineChange;

export interface MobileCompanionReturnPayload {
  protocolVersion: '1.0';
  schemaVersion: 1;
  packageId: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  sourceSnapshotPackageId?: string;
  createdAt: string;
  changes: MobileCompanionReturnChange[];
}

export type MobileCompanionReturnPlanDisposition =
  | 'apply'
  | 'already_done'
  | 'conflict'
  | 'rejected'
  | 'skipped';

export type MobileCompanionReturnConflictDecision = 'apply_mobile' | 'keep_desktop';

export interface MobileCompanionReturnConflictResolution {
  mobileId: string;
  decision: MobileCompanionReturnConflictDecision;
}

export interface MobileCompanionReturnImportInput {
  filePath: string;
  resolutions: MobileCompanionReturnConflictResolution[];
}

export interface MobileCompanionReturnPlanItem {
  mobileId: string;
  type: MobileCompanionReturnChangeType;
  disposition: MobileCompanionReturnPlanDisposition;
  summary: string;
  caseId?: string;
  deadlineId?: string;
  reason?: string;
  desktopState?: string;
  mobileChange?: string;
}

export interface MobileCompanionReturnInspectResult {
  packageId: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  sourceDeviceLabel?: string;
  createdAt: string;
  noteCount: number;
  inboxCount: number;
  deadlineCount: number;
  completedDeadlineCount: number;
  applyCount: number;
  conflictCount: number;
  rejectedCount: number;
  alreadyDoneCount: number;
  blockingErrorCount: number;
  canImport: boolean;
  plan: MobileCompanionReturnPlanItem[];
}

export interface MobileCompanionReturnImportResult {
  imported: boolean;
  packageId: string;
  createdNoteCount: number;
  createdInboxCount: number;
  createdDeadlineCount: number;
  completedDeadlineCount: number;
  updatedCaseIds: string[];
  privacyReviewCaseIds: string[];
  skippedConflictCount: number;
}
