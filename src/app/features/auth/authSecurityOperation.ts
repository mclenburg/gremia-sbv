import { recordRendererDiagnostic, waitForBridge } from "../../core/bridge/waitForBridge";

export async function runAuthSecurityOperation(
  setError: (message: string) => void,
  diagnosticMessage: string,
  operation: (security: Window["gremiaSbv"]["security"]) => Promise<void>,
): Promise<void> {
  try {
    const bridge = await waitForBridge();
    if (!bridge?.security) {
      setError("Die interne Sicherheitsbrücke ist nicht geladen. Bitte Anwendung neu starten.");
      return;
    }
    await operation(bridge.security);
  } catch (error) {
    recordRendererDiagnostic("error", diagnosticMessage, error);
    setError("Der Sicherheitsdienst konnte die Anfrage nicht verarbeiten. Bitte Anwendung neu starten.");
  }
}
