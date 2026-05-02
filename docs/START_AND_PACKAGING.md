# Start, Beenden und produktive Nutzung

## Entwicklungsmodus

Der Entwicklungsmodus ist nur für die Arbeit am Code gedacht:

```bash
npm run dev
```

Dabei laufen zwei Prozesse parallel:

- Vite für die React-Oberfläche
- Electron für das Desktop-Fenster

Ab Version 0.3.22 beendet `npm run dev` auch den Vite-Prozess, sobald das Electron-Fenster geschlossen wird. Ein zusätzliches `Ctrl+C` sollte im Normalfall nicht mehr nötig sein.

## Produktiver lokaler Start ohne Paket

Für einen Start näher am Produktivbetrieb:

```bash
npm run start:prod
```

Das baut die Anwendung und startet sie anschließend direkt mit Electron.

## Linux-AppImage bauen

Für die normale Nutzung ohne `npm run`:

```bash
npm run build:linux
```

Das erzeugt eine AppImage-Datei unter:

```text
release/
```

Die Datei kann ausführbar gemacht und direkt gestartet werden:

```bash
chmod +x release/*.AppImage
./release/*.AppImage
```

## Windows-Version bauen

Für Windows gibt es ab Version 0.3.23:

```bash
npm run build:win
```

Das erzeugt unter `release/`:

- einen NSIS-Installer
- eine portable Windows-EXE

Der zuverlässigste Weg ist der Build direkt auf Windows, weil native Module wie `better-sqlite3-multiple-ciphers` für die Electron-/Windows-ABI gebaut werden müssen. Details stehen in:

```text
docs/WINDOWS_BUILD.md
```

## Anwendungsstarter unter Linux anlegen

Nach dem AppImage-Build:

```bash
npm run launcher:linux
```

Dadurch wird ein Starter unter `~/.local/share/applications/gremia-sbv.desktop` angelegt.

## Beenden

Gremia.SBV läuft nicht bewusst im Hintergrund. Wenn das letzte Fenster geschlossen wird, beendet Electron den Prozess und sperrt die Datenbank.

Beim Beenden wird der Sicherheitsdienst gesperrt. Dadurch wird der aktive Datenbankschlüssel aus dem laufenden Prozess entfernt und die SQLCipher-Datenbank geschlossen.

## Datenablage

Standardmäßig nutzt Gremia.SBV im Entwicklungsmodus den Ordner:

```text
data/
```

Für portable Setups kann später ein Startparameter oder eine Umgebungsvariable genutzt werden:

```bash
GREMIA_SBV_DATA_DIR=/pfad/zum/usb-stick/data ./Gremia.SBV.AppImage
```

Unter Windows entsprechend perspektivisch:

```powershell
$env:GREMIA_SBV_DATA_DIR="E:\GremiaSBV\data"
.\Gremia.SBV.exe
```

Diese Portabilitätslogik wird im nächsten Schritt sauber in die App-Oberfläche integriert.
