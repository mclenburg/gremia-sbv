# Backup und Wiederherstellung

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


## Abgrenzung zur Fallübergabe

Backup und Fallübergabe haben unterschiedliche Zwecke.

Ein Backup dient dazu, den eigenen vollständigen Vault nach Datenverlust wiederherzustellen. Es enthält den Gesamtbestand und ist nicht für die Weitergabe an eine Vertretung gedacht.

Die Fallübergabe dient dazu, einzelne ausgewählte Vorgänge zeitlich begrenzt und verschlüsselt an eine berechtigte Vertretung oder Nachfolge zu übergeben. Sie erzeugt kein gemeinsames System und keine Synchronisation zwischen Instanzen.

Für SBV-Praxis gilt: Für Wiederherstellung Backup nutzen; für Vertretung nur die selektive Fallübergabe.

## Release-Prozessprüfung

Vor öffentlicher Freigabe wird Backup/Restore nicht nur als Service-Verhalten getestet, sondern zusätzlich als lokaler Release-Prozess geprüft:

```bash
npm run release:check:backup-restore
```

Der Check legt einen synthetischen Vault mit Pflichtdateien und verschlüsseltem Dokumentcontainer an, erzeugt ein verschlüsseltes Backup, inspiziert das Manifest und stellt den Vault nach absichtlicher Beschädigung wieder her. Geprüft wird insbesondere:

- Pflichtdateien `gremia-sbv.vault.sqlite`, `security.json` und `vault-manifest.json` sind enthalten,
- Dokumentcontainer unter `documents/` werden bitgleich wiederhergestellt,
- `tmp/` und verschachtelte `backups/` werden nicht in das Backup aufgenommen,
- Restore legt Arbeitsordner wieder an und verlangt die exakte Wiederherstellungsbestätigung.

Dieser Check ersetzt keine organisatorische Backup-Rotation, verhindert aber, dass ein Release ohne technisch geprüften Wiederherstellungspfad entsteht.
