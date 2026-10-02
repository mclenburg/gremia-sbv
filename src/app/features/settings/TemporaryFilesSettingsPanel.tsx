import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function TemporaryFilesSettingsPanel() {
  const [status, setStatus] = useState<{
    root: string;
    remaining: number;
    bytesRemaining: number;
    oldestRemainingAt?: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const nextStatus =
        await window.gremiaSbv?.security?.temporaryFileStatus?.();
      if (nextStatus) setStatus(nextStatus);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Status der temporären Arbeitskopien konnte nicht geladen werden.",
      );
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function cleanup() {
    setMessage("");
    setError("");
    try {
      const result =
        await window.gremiaSbv?.security?.cleanupTemporaryFiles?.();
      setMessage(
        `Temporäre Arbeitskopien bereinigt: ${result?.deleted ?? 0} gelöscht, ${result?.remaining ?? 0} verbleibend.`,
      );
      await loadStatus();
    } catch (cleanupError) {
      setError(
        cleanupError instanceof Error
          ? cleanupError.message
          : "Temporäre Arbeitskopien konnten nicht bereinigt werden.",
      );
    }
  }

  return (
    <section className="industrial-settings-form">
      <div>
        <h3>Temporäre Arbeitskopien</h3>
        <p className="industrial-settings-note">
          Vorschauen und geöffnete PDF-Reports werden nur als kurzlebige lokale
          Arbeitskopien erzeugt. Beim Sperren werden diese Dateien automatisch
          bereinigt.
        </p>
      </div>
      <div className="industrial-list">
        <div>
          <strong>Dateien:</strong> {status?.remaining ?? "—"}
        </div>
        <div>
          <strong>Größe:</strong>{" "}
          {status ? `${Math.round(status.bytesRemaining / 1024)} KB` : "—"}
        </div>
        <div>
          <strong>Ordner:</strong> <code>{status?.root ?? "—"}</code>
        </div>
        <div>
          <strong>Älteste Datei:</strong>{" "}
          {status?.oldestRemainingAt
            ? new Date(status.oldestRemainingAt).toLocaleString("de-DE")
            : "—"}
        </div>
      </div>
      {error && (
        <div className="industrial-message industrial-message-warning" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="industrial-message industrial-message-ok" role="status">
          {message}
        </div>
      )}
      <button
        type="button"
        className="industrial-secondary-button"
        onClick={() => void cleanup()}
      >
        <ShieldCheck className="industrial-icon" /> Temporäre Dateien jetzt löschen
      </button>
    </section>
  );
}
