# Backup und Wiederherstellung

Stand: **0.9.1**

## Grundsatz

Backups enthalten besonders sensible SBV-Daten einschließlich Personenverzeichnis, Fallakten, Dokumenten, Fristen und Audit-Metadaten. Sie sind genauso zu schützen wie die aktive Datenbank.

## Anforderungen

- verschlüsselte Backups,
- Integritätsprüfung,
- klarer Speicherort,
- keine Cloud-Synchronisation als Standard,
- Backup-Rotation,
- Wiederherstellungstest vor produktiver Nutzung.

## Personenverzeichnis

Backups können Schutzstatus und Beschäftigungsstatus enthalten. Wenn Daten in der aktiven Datenbank gelöscht oder anonymisiert wurden, können alte Backups diese Daten noch bis zum Ablauf der Backup-Rotation enthalten. Das ist organisatorisch zu dokumentieren.
