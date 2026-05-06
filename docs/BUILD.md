# Build von Gremia.SBV

Stand: 0.8.13-a

## Unterstützte RC-Plattformen

Offiziell für den RC geprüft werden:

- Linux AppImage
- Windows 10+ als NSIS-/Portable-Build

macOS ist technisch vorbereitet, aber bis zu einem echten macOS-Runner mit Signierung und Notarisierung nur experimentell dokumentiert.

## Native Electron-Abhängigkeiten

Native Abhängigkeiten müssen zur Electron-Version passen. Der verbindliche npm-Vertrag lautet:

```json
"postinstall": "electron-builder install-app-deps"
```

Dieser Eintrag darf nicht entfernt, durch `npx` ersetzt oder indirekt versteckt werden. `npm install` muss native Dependencies automatisch passend zur Electron-Version vorbereiten.

## Standardmatrix

```bash
npm run rc:check
npm run test
npm run build
npm run build:linux
npm run build:win
npm run build:mac # experimentell, nur auf macOS-Host sinnvoll
npm run build:readiness:strict
```

## Windows-Build

Der Windows-RC-Build ist unsigniert und setzt `signAndEditExecutable: false`, damit normale Windows-Entwicklungsumgebungen ohne Symlink-Privilegien nicht an `winCodeSign` scheitern. Der typische Fehler lautet `Cannot create symbolic link`, wenn das Electron-Builder-Hilfspaket `winCodeSign` Symlinks entpacken will. Ein späterer signierter Release benötigt eine dafür vorbereitete Windows-Buildumgebung.

## Build-Regeln

- Keine produktiven Datenbanken im Build.
- Keine `node_modules` oder `release`-Artefakte in Patch-ZIPs.
- Tests sind Teil des normalen Build-Laufs.
- `prebuild` bleibt der Build-Readiness-Vertrag: Version generieren, Source-Cleanup, Build-Readiness.
