export type DataProtectionState =
  | 'not_initialized'
  | 'locked'
  | 'unlocked'
  | 'recovery_required'
  | 'sealed_without_recovery';

export interface SecurityStatus {
  initialized: boolean;
  unlocked: boolean;
  setupRequired?: boolean;
  recoveryRequired?: boolean;
  destructiveResetAvailable?: boolean;
  dataProtectionState?: DataProtectionState;
  error?: string;
  databaseProtected?: boolean;
  unlockDelaySeconds?: number;
  unlockAvailableAt?: string;
}

export interface SecurityResult {
  ok: boolean;
  unlocked?: boolean;
  initialized?: boolean;
  recoveryKey?: string;
  error?: string;
  databaseProtected?: boolean;
  unlockDelaySeconds?: number;
  unlockAvailableAt?: string;
}
