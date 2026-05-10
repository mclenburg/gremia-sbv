# Build und Release

Stand: **0.9.1**

## Zielplattformen

Gremia.SBV wird als lokale Electron-App gebaut.

| Plattform | Artefakt | Hinweis |
| --- | --- | --- |
| Linux | `.AppImage` | primäres Linux-Release-Artefakt |
| Windows | portable `.exe` | direkt startbare EXE, kein verpflichtender Installer |
| macOS | `.dmg` | macOS-Artefakt ist im RC-Stand unsigniert und nicht notarisiert |

Der GitHub-Release-Workflow liegt unter `.github/workflows/build-release.yml`. Für Releases sollen nur diese Build-Artefakte hochgeladen werden:

```text
release/*.AppImage
release/*.exe
release/*.dmg
```

Nicht hochgeladen werden sollen `.blockmap`, `latest*.yml`, zusätzliche ZIPs, DEB/TAR.GZ oder interne Build-Dateien. Die von GitHub automatisch angezeigten Source-Code-Archive sind keine vom Workflow hochgeladenen Build-Artefakte.

## Standardbefehle

```bash
npm install
npm run test
npm run test:e2e
npm run rc:check
npm run build:linux
npm run build:win
npm run build:mac
```

`npm run build` führt vor dem Build `version:generate`, `source:cleanup` und `build:readiness` aus.

## Native Abhängigkeiten

Nach `npm install` wird ausgeführt:

```bash
electron-builder install-app-deps
```

Damit werden native Abhängigkeiten wie `better-sqlite3-multiple-ciphers` passend zur Electron-Version vorbereitet.

## Release-Gates

`npm run rc:check` prüft Versionsmetadaten, Source-Cleanup, Build-Readiness und Release-Candidate-Readiness. `npm run test:coverage` nutzt Vitest mit `provider: 'v8'` und einem 70-Prozent-Gate für Branches, Functions, Lines und Statements. Das Gate misst ab 0.9.0-rc.1-p bewusst die RC-kritischen Service-Verträge und gut unit-testbaren Policy-Services.

## 0.9.1-spezifische Build-Grenzen

- Personenverzeichnis und Import dürfen keine optionalen nativen Abhängigkeiten außerhalb des bestehenden Electron-/Node-Stacks erzwingen.
- iCal-Export ist lokaler Dateiexport, keine Kalender-Synchronisation.
- CSV-/XLSX-Import verarbeitet Dateien lokal und speichert keine Rohdatei dauerhaft.
- Tests müssen plattformunabhängig laufen; Pfade und Zeilenenden sind zu normalisieren.

## macOS

macOS-Builds bleiben im RC-Stand unsigniert. Notarisierung, Developer-ID-Signatur und Gatekeeper-optimierte Distribution sind nicht Teil von 0.9.1.
