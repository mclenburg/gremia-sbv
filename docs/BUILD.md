# Build und Release

Stand: **0.9.1**

## Zielplattformen

Gremia.SBV wird als lokale Electron-App gebaut.

| Plattform | Artefakt | Hinweis |
| --- | --- | --- |
| Linux | `.AppImage` | primäres Linux-Release-Artefakt |
| Windows | portable `.exe` | portable Direktstart-EXE für Windows 10+; kein verpflichtender Installer |
| macOS | `.dmg` | macOS-Artefakt ist im RC-Stand unsigniert und nicht notarisiert |

Der GitHub-Release-Workflow liegt unter `.github/workflows/build-release.yml`. Für Releases sollen ausschließlich die drei Endanwender-Artefakte AppImage, EXE und DMG hochgeladen werden. Für Releases sollen nur diese Build-Artefakte hochgeladen werden:

```text
release/*.AppImage
release/*.exe
release/*.dmg
```

Nicht hochgeladen werden sollen `.blockmap`, `latest*.yml`, zusätzliche ZIPs, DEB/TAR.GZ oder interne Build-Dateien. Die von GitHub automatisch angezeigten Source code-Archive sind keine vom Workflow hochgeladenen Build-Artefakte; sie werden von GitHub erzeugt und nicht durch den Release-Workflow hochgeladen.

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

Build-Baseline ist Node.js 20.19.0. Die `.nvmrc` und `.node-version` müssen synchron auf 20.19.0 zeigen.

## Native Abhängigkeiten

Nach `npm install` wird ausgeführt:

```bash
electron-builder install-app-deps
```

Damit werden Runtime-Dependencies wie `better-sqlite3-multiple-ciphers` passend zur Electron-Version vorbereitet. `electron-builder` kann beim Packaging trotzdem den generischen Hinweis ausgeben, native Abhängigkeiten per `electron-builder install-app-deps` zu installieren; maßgeblich bleibt der explizite `postinstall`-Schritt ohne `npx`.

## Release-Gates

`npm run rc:check` prüft Versionsmetadaten, Source-Cleanup, Build-Readiness und Release-Candidate-Readiness. `npm run test:coverage` nutzt Vitest mit `provider: 'v8'` und einem 70-Prozent-Gate für Branches, Functions, Lines und Statements. Das Gate misst ab 0.9.1 bewusst die RC-kritischen Service-Verträge und gut unit-testbaren Policy-Services. Stringtests sollen dabei nur stabile Release-Verträge absichern; fachliche Logik wird bevorzugt über Behavior-Tests geprüft.

## 0.9.1-spezifische Build-Grenzen

- Personenverzeichnis und Import dürfen keine optionalen nativen Abhängigkeiten außerhalb des bestehenden Electron-/Node-Stacks erzwingen.
- iCal-Export ist lokaler Dateiexport, keine Kalender-Synchronisation.
- CSV-/XLSX-Import verarbeitet Dateien lokal und speichert keine Rohdatei dauerhaft.
- Tests müssen plattformunabhängig laufen; Pfade und Zeilenenden sind zu normalisieren.

## macOS

macOS-Builds bleiben im RC-Stand unsigniert. Notarisierung, Developer-ID-Signatur und Gatekeeper-optimierte Distribution sind nicht Teil von 0.9.1.

## Windows-Hinweise

Der Windows-RC bleibt portabel und unsigniert. `signAndEditExecutable` ist deaktiviert, damit der Build nicht an Windows-Ressourcenbearbeitung oder winCodeSign scheitert. Falls `electron-builder` in isolierten Umgebungen mit `Cannot create symbolic link` warnt, darf daraus kein neuer `postinstall`-Workaround entstehen; native Rebuilds bleiben an `postinstall` gekoppelt.


## Test- und Doku-Synchronisierung 0.9.1

Step G hält README, Roadmap, Build-Dokumentation und Release-Tests synchron. Vorveröffentlichte Release-Notes, Change-Logs und Patchnotizen werden nicht im aktiven Dokumentationsbestand gepflegt; aktuelle Tests sollen plattformunabhängig arbeiten und keine rohen Pfad-, Laufwerks- oder Zeilenendannahmen enthalten.


### Windows-Artefaktvertrag 0.9.1

Der Windows-Build erzeugt ausschließlich eine portable Direktstart-EXE. Ein Installer wird bewusst nicht gebaut und darf in der RC-Freigabe nicht als Artefakt erscheinen.
