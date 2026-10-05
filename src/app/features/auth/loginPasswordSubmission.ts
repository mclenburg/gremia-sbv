import { recordRendererDiagnostic, waitForBridge } from "../../core/bridge/waitForBridge";
import { validateAppPassword } from "../../../domain/security/passwordPolicy";

interface LoginPasswordSubmission {
  password: string;
  passwordRepeat: string;
  isSetup: boolean;
  setError: (message: string) => void;
  setPendingRecoveryKey: (key: string) => void;
  onUnlock: (warning?: string) => void;
}

export async function submitLoginPassword({
  password, passwordRepeat, isSetup, setError, setPendingRecoveryKey, onUnlock,
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

  try {
    const bridge = await waitForBridge();
    if (!bridge?.security) {
      setError(
        "Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.",
      );
      return;
    }

    if (isSetup) {
      const result = await bridge.security.setupInitialPassword(password);
      if (!result.ok) {
        setError(
          result.error ??
            "Das Initialpasswort konnte nicht gespeichert werden.",
        );
        return;
      }
      if (result.recoveryKey) {
        setPendingRecoveryKey(result.recoveryKey);
        return;
      }
      onUnlock();
      return;
    }

    const result = await bridge.security.unlock(password);
    if (!result.ok || !result.unlocked) {
      setError(result.error ?? "Entsperren fehlgeschlagen.");
      return;
    }
    onUnlock(result.warning);
  } catch (error) {
    recordRendererDiagnostic("error", "Sicherheitsoperation konnte nicht verarbeitet werden.", error);
    setError(
      "Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.",
    );
  }
}
