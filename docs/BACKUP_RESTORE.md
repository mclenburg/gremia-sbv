# Backup & Wiederherstellung

Gremia.SBV erzeugt vollständige Backups als verschlüsselte `.gsbvbackup`-Datei.

## Enthaltene Daten

Das Backup enthält den vollständigen produktiven Datenbestand aus dem aktuellen Datenverzeichnis:

- `gremia-sbv.vault.sqlite`
- `security.json`
- `vault-manifest.json`
- `documents/`
- `exports/`
- weitere produktive Metadaten

Nicht gesichert werden temporäre Arbeitskopien unter `tmp/` und vorhandene Backups unter `backups/`.

## Verschlüsselung

Das Backup wird zusätzlich zur SQLCipher-Datenbankverschlüsselung mit AES-256-GCM verschlüsselt. Der Schlüssel wird aus der Backup-Passphrase per `scrypt` abgeleitet.

Wichtig: Die Backup-Passphrase ist nicht automatisch identisch mit dem App-Passwort. Sie muss sicher aufbewahrt werden.

## Wiederherstellung

Die Wiederherstellung ersetzt den aktuellen Datenbestand. Vor dem Überschreiben verschiebt die App den bestehenden Datenordner in einen Sicherheitsordner:

```text
data.before-restore.<Zeitstempel>
```

Nach erfolgreicher Wiederherstellung muss Gremia.SBV vollständig neu gestartet werden.

## Integritätsprüfung

Vor einer Wiederherstellung wird das Backup entschlüsselt, dekomprimiert und jede enthaltene Datei anhand ihrer SHA-256-Prüfsumme geprüft. Fehlen Pflichtdateien oder stimmen Prüfsummen nicht, wird die Wiederherstellung verweigert.
