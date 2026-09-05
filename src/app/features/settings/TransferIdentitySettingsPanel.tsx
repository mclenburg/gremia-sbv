import { useEffect, useState } from "react";
import { Copy, Fingerprint } from "lucide-react";
import type { TransferInstanceIdentity } from "../../../domain/models/transfer-identity.model";
import { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { IndustrialButton } from "../../shared/components/IndustrialButton";
import { TextareaInput, TextInput } from "../../shared/components/IndustrialForm";

export function TransferIdentitySettingsPanel() {
  const announce = useAnnouncer();
  const [identity, setIdentity] = useState<TransferInstanceIdentity | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadIdentity() {
      try {
        const nextIdentity = await window.gremiaSbv.transferIdentity.get();
        if (active) setIdentity(nextIdentity);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Transfer-Identität konnte nicht geladen werden.");
      }
    }
    void loadIdentity();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (message) announce(message, "polite");
  }, [announce, message]);

  useEffect(() => {
    if (error) announce(error, "assertive");
  }, [announce, error]);

  async function copyRecipientToken() {
    if (!identity) return;
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(identity.recipientToken);
      setMessage("Empfängerkennung wurde in die Zwischenablage kopiert.");
    } catch {
      setError("Empfängerkennung konnte nicht in die Zwischenablage kopiert werden. Bitte manuell markieren und kopieren.");
    }
  }

  return (
    <section className="industrial-settings-form xl:col-span-2" aria-labelledby="transfer-identity-settings-title">
      <div>
        <h3 id="transfer-identity-settings-title">Lokale Transfer-Identität</h3>
        <p className="industrial-settings-note">
          Diese Kennung macht Übergaben zielgebunden: Exportierende Instanzen verschlüsseln Fall- und Wahlübergaben für genau diese lokale Gremia.SBV-Installation.
        </p>
      </div>
      <div className="industrial-form-grid industrial-form-grid-2">
        <TextInput label="Instanz-ID" value={identity?.instanceId ?? "wird geladen"} readOnly onValueChange={() => undefined} />
        <TextInput label="Schlüssel-Fingerprint" value={identity?.keyFingerprint.slice(0, 16) ?? "—"} readOnly onValueChange={() => undefined} />
      </div>
      <TextareaInput
        label="Empfängerkennung für Übergaben"
        value={identity?.recipientToken ?? ""}
        readOnly
        wide
        rows={4}
        onValueChange={() => undefined}
      />
      {message ? <div className="industrial-message industrial-message-ok" role="status">{message}</div> : null}
      {error ? <div className="industrial-message industrial-message-warning" role="alert">{error}</div> : null}
      <IndustrialButton variant="secondary" disabled={!identity} onClick={() => void copyRecipientToken()}>
        <Copy className="h-4 w-4" /> Empfängerkennung kopieren
      </IndustrialButton>
      <p className="industrial-settings-note">
        <Fingerprint className="inline-icon" aria-hidden="true" /> Die ID ist bewusst kurz und gut diktierbar. Die eigentliche technische Bindung erfolgt über den öffentlichen Schlüssel in der Empfängerkennung.
      </p>
    </section>
  );
}
