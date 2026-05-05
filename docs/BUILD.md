# Build-Prozess

Gremia.SBV wird für den RC auf echten Zielsystemen gebaut. Cross-Builds sind nicht die Abnahmegrundlage.

## Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer
- Netzwerkzugriff auf die konfigurierte npm-Registry
- Git-Arbeitsverzeichnis ohne alte `node_modules`-Sperren

Unter Windows sollten Terminal, Editor, Virenscanner und Explorer-Fenster, die in `node_modules` stehen, vor einem Neuinstall geschlossen werden. `EPERM`-Meldungen beim npm-Cleanup sind meist Dateisperren. Bei hartnäckigen Fällen:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

## Gemeinsame Prüfung

```bash
npm install
npm run rc:check
npm run test
npm run build
```

## Linux

Auf einem echten Linux-System:

```bash
npm run build:linux
```

Erzeugt ein AppImage unter `release/`.

## Windows 10 oder neuer

In PowerShell oder Windows Terminal:

```powershell
npm run build:win
```

Die Windows-Paketierung nutzt keine Bash-Skripte mehr. Erwartet werden NSIS-Installer und portable EXE unter `release/`.

## macOS

Auf einem echten Mac:

```bash
npm run build:mac
```

Erzeugt DMG/ZIP unter `release/`. Signierung und Notarisierung sind für den RC noch gesondert zu klären.

## Aktuelle Plattform bauen

```bash
npm run build:current
```

Dieser Befehl erkennt Linux, Windows oder macOS und startet den passenden Plattformbuild.

## E2E-Tests

Playwright ist optional und nicht Teil der normalen Installation. Für E2E-Tests:

```bash
npm run test:e2e:setup
npm run test:e2e
```

Die E2E-Tests verwenden ein eigenes temporäres Datenverzeichnis und dürfen niemals produktive SBV-Daten öffnen.
