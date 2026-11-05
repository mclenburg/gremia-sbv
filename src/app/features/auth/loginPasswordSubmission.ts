import { runAuthSecurityOperation } from "./authSecurityOperation";
import { validateAppPassword } from "../../../domain/security/passwordPolicy";

interface LoginPasswordSubmission {
  password: string;
  passwordRepeat: string;
  isSetup: boolean;
  setError: (message: string) => void;
  setPending: (pending: boolean) => void;
  setPendingRecoveryKey: (key: string) => void;
  onUnlock: (warning?: string) => void;
}

export async function submitLoginPassword({
  password, passwordRepeat, isSetup, setError, setPending, setPendingRecoveryKey, onUnlock,
}: LoginPasswordSubmission) {
  setError("");

  const validationError = validateAppPassword(password);
  if (validationError) {
    setError(validationError);
    return;
  }

  if (isSetup && password !== passwordRepeat) {
    setError("Die Passwörter stimmen nicht überein.");
    return;
  }

  setPending(true);
  try {
    await runAuthSecurityOperation(setError, "Sicherheitsoperation konnte nicht verarbeitet werden.", async (security) => {
      if (isSetup) {
        const result = await security.setupInitialPassword(password);
        if (!result.ok) {
          setError(result.error ?? "Das Initialpasswort konnte nicht gespeichert werden.");
          return;
        }
        if (result.recoveryKey) {
          setPendingRecoveryKey(result.recoveryKey);
          return;
        }
        onUnlock();
        return;
      }

      const result = await security.unlock(password);
      if (!result.ok || !result.unlocked) {
        setError(result.error ?? "Entsperren fehlgeschlagen.");
        return;
      }
      onUnlock(result.warning);
    });
  } finally {
    setPending(false);
  }
}
