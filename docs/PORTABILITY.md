# Portabilitätskonzept

Gremia.SBV soll als Offline-Werkzeug portabel nutzbar sein. Die App und alle produktiven Daten können perspektivisch auf einem verschlüsselten USB-Stick liegen.

## Grundsätze

- Keine Cloud-Abhängigkeit.
- Keine Telemetrie.
- Keine automatischen Netzwerkaufrufe.
- Keine erzwungenen absoluten Pfade.
- Datenbank, Dokumente und Backups bleiben unterhalb des App-Datenverzeichnisses.
- Backups werden verschlüsselt exportiert.

## Empfohlene Verzeichnisstruktur im portablen Betrieb

```text
Gremia.SBV/
├── app/
├── data/
│   ├── gremia-sbv.db
│   └── documents/
├── backups/
└── logs/
```

## Offene technische Entscheidungen

- Packaging: Electron Builder portable target für Windows prüfen.
- Datenbankpfad: Standardmäßig relativ zum App-Verzeichnis, optional explizit auswählbar.
- Backup: Export in eine einzelne verschlüsselte Datei `.gsbv-backup`.
- Sperre: Bei Laufwerkstrennung sofort sperren, sobald Zugriff fehlschlägt.
