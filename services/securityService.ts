import { SecuritySessionService } from './security/securitySessionService.js';
export type { SecurityFileOperations } from './security/securitySupport.js';

/** Stable public facade for vault security and session lifecycle. */
export class SecurityService extends SecuritySessionService {
  /** Internal source identity for authenticated local-vault transfers. Never expose the raw value to the renderer. */
  getVaultTransferSourceId(): string {
    return this.readManifest().vaultId;
  }
  override async unlock(password: string) {
    return super.unlock(password);
  }

  override async changePassword(currentPassword: string, newPassword: string) {
    return super.changePassword(currentPassword, newPassword);
  }

  override async resetPasswordWithRecoveryKey(recoveryKey: string, newPassword: string) {
    return super.resetPasswordWithRecoveryKey(recoveryKey, newPassword);
  }
}
