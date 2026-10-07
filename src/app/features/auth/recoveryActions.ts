import { validateAppPassword } from "../../../domain/security/passwordPolicy";
import { runAuthSecurityOperation } from "./authSecurityOperation";

interface RecoveryActionCallbacks {
  setError: (message: string) => void;
  setMessage: (message: string) => void;
  onUnlock: (warning?: string) => void;
  onResetToSetup: () => void;
}

export function createRecoveryActions({ setError, setMessage, onUnlock, onResetToSetup }: RecoveryActionCallbacks) {
  function clearFeedback() {
    setError("");
    setMessage("");
  }

  return {
    async resetPassword(recoveryKey: string, newPassword: string, repeatPassword: string) {
      clearFeedback();
      const validationError = validateAppPassword(newPassword);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (newPassword !== repeatPassword) {
        setError("Die neuen Passwörter stimmen nicht überein.");
        return;
      }
      await runAuthSecurityOperation(setError, "Wiederherstellungsoperation konnte nicht verarbeitet werden.", async (security) => {
        const result = await security.resetPasswordWithRecoveryKey(recoveryKey, newPassword);
        if (!result.ok || !result.unlocked) {
          setError(result.error ?? "Das Passwort konnte nicht zurückgesetzt werden.");
          return;
        }
        onUnlock(result.warning);
      });
    },

    async destroyVault(confirmation: string) {
      clearFeedback();
      await runAuthSecurityOperation(setError, "Lokaler Datenbestand konnte nicht verworfen werden.", async (security) => {
        const result = await security.destroyLocalVault(confirmation);
        if (!result.ok) {
          setError(result.error ?? "Der lokale Datenbestand konnte nicht verworfen werden.");
          return;
        }
        setMessage("Der lokale Datenbestand wurde verworfen. Es kann ein neuer leerer Datenbestand eingerichtet werden.");
        onResetToSetup();
      });
    },
  };
}
