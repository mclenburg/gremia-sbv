import type { BackupOperationResult } from '../../../domain/models/backup.model';

export function BackupOperationFeedback({ error, result }: {
  error: string;
  result: BackupOperationResult | null;
}) {
  return (
    <>
      {error && (
        <div className="industrial-message industrial-message-warning" role="alert">
          {error}
        </div>
      )}
      {result?.ok && (
        <div className="industrial-message industrial-message-ok" role="status">
          <strong>
            {result.restartRequired
              ? "Wiederherstellung vorbereitet."
              : "verifiedAt" in result
                ? "Backup erfolgreich geprüft."
                : "Backup-Vorgang abgeschlossen."}
          </strong>
          <p>{result.fileName}</p>
          <p>
            {result.fileCount ?? 0} Dateien · {result.totalBytes ?? 0} Bytes
          </p>
          {result.restartRequired && (
            <p>Bitte Gremia.SBV jetzt vollständig schließen und neu starten.</p>
          )}
          {result.warnings?.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </>
  );
}
