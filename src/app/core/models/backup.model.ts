export interface BackupCreateInput {
  passphrase: string;
}

export interface BackupRestoreInput {
  filePath?: string;
  passphrase: string;
  confirmation: string;
}

export interface BackupVerifyInput {
  filePath?: string;
  passphrase: string;
}

export interface BackupFileSummary {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupOperationResult {
  ok: boolean;
  filePath?: string;
  fileName?: string;
  createdAt?: string;
  restoredAt?: string;
  verifiedAt?: string;
  fileCount?: number;
  totalBytes?: number;
  warnings?: string[];
  restartRequired?: boolean;
  error?: string;
}

export interface BackupInspectionResult extends BackupOperationResult {
  format?: string;
  backupVersion?: number;
  appVersion?: string;
  schemaVersion?: string;
  files?: BackupFileSummary[];
}
