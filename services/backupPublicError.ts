/** Messages returned to the renderer must not contain paths or file names from
 * the local vault or from an untrusted backup manifest. */
export function safePublicBackupError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Backup-Passphrase muss mindestens')) {
    return 'Die Backup-Passphrase muss mindestens 12 Zeichen lang sein.';
  }
  if (message.includes('BACKUP WIEDERHERSTELLEN')) {
    return 'Bitte exakt „BACKUP WIEDERHERSTELLEN“ eingeben.';
  }
  if (message.includes('gültiges JSON')) {
    return 'Die Backup-Datei enthält kein gültiges JSON.';
  }
  if (message.includes('KDF-Parameter')) {
    return 'Das Backup enthält unzulässige KDF-Parameter.';
  }
  if (message.includes('zulässige Größe') || message.includes('zulässige Gesamtgröße')) {
    return 'Das Backup überschreitet die zulässige Größe.';
  }
  if (message.includes('Prüfsumme')) {
    return 'Die Prüfsumme einer Datei im Backup ist ungültig.';
  }
  if (message.includes('kein unterstütztes Gremia.SBV-Backup')) {
    return 'Die Datei ist kein unterstütztes Gremia.SBV-Backup.';
  }
  return 'Der Backup-Vorgang ist fehlgeschlagen. Bitte Speicherort, Berechtigungen und freien Speicherplatz prüfen; die vorhandene Sicherung aufbewahren.';
}
