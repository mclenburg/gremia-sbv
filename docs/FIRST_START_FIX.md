# Gremia.SBV 0.3.1 – First-Start-Fix

Dieses Paket behebt die beim ersten `npm run dev` sichtbaren TypeScript-Fehler im Electron-Build:

- fehlende Auflösung von Type-only-Imports zu Model-Dateien im `NodeNext`-Modus
- fehlende `.js`-Endungen bei relativen Node/Electron-Imports
- Typkonflikt zwischen Electron- und Node-Prozesstypen
- implizite `any`-Parameter in der Deadline-Service-Filterlogik

## Anwendung

Das ZIP über die bestehende Projektstruktur entpacken und vorhandene Dateien ersetzen.

Danach erneut starten:

```bash
npm run dev
```

Falls die Datenbank für Entwicklung neu aufgebaut werden soll:

```bash
rm -f data/gremia-sbv.dev.sqlite
sqlite3 data/gremia-sbv.dev.sqlite < database/schema.sql
sqlite3 data/gremia-sbv.dev.sqlite < database/migrations/0002_process_modules.sql
sqlite3 data/gremia-sbv.dev.sqlite < database/migrations/0003_deadline_center.sql
```
