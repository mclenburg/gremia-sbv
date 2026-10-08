import type { BackupFileSummary } from '../src/domain/models/backup.model.js';

export function buildBackupPrivacyWarnings(files: BackupFileSummary[]): string[] {
  const warnings = [
    'Backup enthält den verschlüsselten Gremia.SBV-Tresor einschließlich SBV-, BEM- und Gesundheitsdaten.',
    'Backup-Passphrase getrennt vom Backup aufbewahren; ohne Passphrase ist keine Wiederherstellung möglich.',
  ];
  if (files.some((file) => file.relativePath.includes('exports/'))) {
    warnings.push('Backup enthält verschlüsselte Berichtsexporte. Weitergabe nur an berechtigte Personen.');
  }
  if (files.some((file) => file.relativePath.includes('documents/'))) {
    warnings.push('Backup enthält Fall- und Dokumentenablagen. Lösch- und Aufbewahrungsfristen beachten.');
  }
  return warnings;
}

export const LEGACY_BACKUP_KDF_WARNING =
  'Dieses Backup wurde mit älterer Schlüsselableitung geschützt. Nach dem Import bitte ein neues Backup mit aktuellen Schutzparametern erstellen und alte Kopien nach den Aufbewahrungsregeln entfernen.';
