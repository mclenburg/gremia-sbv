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

### Windows-Build ohne Symlink-Privileg

Der RC-Build erzeugt Windows-Artefakte bewusst ohne `rcedit`-/Code-Sign-Resource-Editing. Deshalb ist in der Electron-Builder-Konfiguration gesetzt:

```json
"signAndEditExecutable": false
```

Hintergrund: `electron-builder` lädt für das Windows-Resource-Editing das Paket `winCodeSign`. Dieses Archiv enthält macOS-Symlinks. Auf Windows-Systemen ohne Entwickler-Modus oder Administratorrecht kann das Entpacken mit `Cannot create symbolic link` scheitern. Für den unsignierten RC-Build hat reproduzierbare Buildbarkeit Vorrang vor EXE-Metadaten-/Icon-Resource-Editing.

Wichtig: Das ändert nichts am nativen Dependency-Rebuild. `postinstall` bleibt weiterhin exakt:

```json
"postinstall": "electron-builder install-app-deps"
```

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
