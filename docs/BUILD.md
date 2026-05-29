# Build und Artefakte

## Zielplattformen

Gremia.SBV wird als lokale Electron-App gebaut.

| Plattform | Artefakt | Hinweis |
| --- | --- | --- |
| Linux | `.AppImage` | direkt startbares Linux-Artefakt |
| Windows | portable `.exe` | portable Direktstart-EXE; kein verpflichtender Installer |
| macOS | `.dmg` | macOS-Artefakt; Signatur und Notarisierung richten sich nach der Signaturstrategie |

Der GitHub-Workflow für bereitgestellte Artefakte liegt unter `.github/workflows/build-release.yml`. Hochgeladen werden sollen ausschließlich die Endanwender-Artefakte:

```text
release/*.AppImage
release/*.exe
release/*.dmg
```

Nicht hochgeladen werden sollen `.blockmap`, `latest*.yml`, zusätzliche ZIPs, DEB/TAR.GZ oder interne Build-Dateien. Die von GitHub automatisch angezeigten Source-code-Archive sind keine vom Workflow hochgeladenen Build-Artefakte.

## Standardbefehle

```bash
npm install
npm run test
npm run test:e2e
npm run release:check
npm run build:linux
npm run build:win
npm run build:mac
```

`npm run build` führt vor dem Build `version:generate`, `source:cleanup` und `build:readiness` aus.

Die Node-Baseline ist über `.nvmrc` und `.node-version` festgelegt. Beide Dateien müssen synchron bleiben.

## Native Abhängigkeiten

Nach `npm install` wird ein projektlokaler Bootstrap ausgeführt:

```bash
node scripts/install-electron-app-deps.cjs
```

Der Bootstrap startet die lokal installierte `electron-builder`-CLI direkt über Node und führt darüber `install-app-deps` aus. Dadurch werden Runtime-Dependencies wie `better-sqlite3-multiple-ciphers` passend zur Electron-Laufzeit vorbereitet, ohne `npx`/`npm exec` und ohne fremde Workspace-Flags in den Electron-Rebuild weiterzureichen.

## Qualitätsgates

Vor einer öffentlichen Bereitstellung müssen grün laufen:

```bash
npm run test
npm run test:e2e
npm run test:e2e:a11y
npm run test:e2e:visual
npm run security:audit
npm run licenses:check
npx tsc -p tsconfig.json --noEmit
```

`npm run test:coverage` nutzt Vitest mit `provider: 'v8'` und einem festen Coverage-Gate. Stringtests sollen nur stabile Architektur- und Bereitstellungsverträge absichern; fachliche Logik wird bevorzugt über Behavior-Tests, Service-Tests und E2E-Flows geprüft.

## Build-Grenzen

- Personenverzeichnis und Import dürfen keine optionalen nativen Abhängigkeiten außerhalb des bestehenden Electron-/Node-Stacks erzwingen.
- iCal-Export ist lokaler Dateiexport, keine Kalender-Synchronisation.
- CSV-/XLSX-Import verarbeitet Dateien lokal und speichert keine Rohdatei dauerhaft.
- Tests müssen plattformunabhängig laufen; Pfade und Zeilenenden sind zu normalisieren.
- Endanwender-Artefakte sind von internen Build-Dateien zu trennen.

## macOS

macOS-Artefakte richten sich nach der Signaturstrategie in `CODE_SIGNING.md`. Ohne Signatur beziehungsweise Notarisierung können Betriebssystemwarnungen auftreten.

## Windows

Der Windows-Build bleibt portabel. `signAndEditExecutable` ist deaktiviert, solange keine durchgängige Signaturkette eingerichtet ist. Falls `electron-builder` in isolierten Umgebungen mit `Cannot create symbolic link` warnt, darf daraus kein `npx`- oder `npm exec`-Workaround entstehen; native Rebuilds bleiben an den workspace-sicheren `postinstall`-Bootstrap gekoppelt.

## Testqualität

Mindestens ein wesentlicher Anteil der aktiven Tests muss Verhalten, Ergebnisse, Policies, Services, Migrationen, Exporte oder E2E-Flows prüfen. Source-Text-Stringtests sind nur als eng begrenzte Architektur-Guards zulässig.

## ModuleFeedback-Regel

Feature-Views mit `ModuleFrame` müssen Rückmeldungen über den gemeinsamen `ModuleFeedback`-Baustein ausgeben. Prozessübersichten verwenden dafür `ProcessOverviewPage` mit `feedbackItems`. Feature-spezifische Inline-Fehlerbereiche außerhalb von Modalen sind nicht zulässig; Modal-Fehler bleiben im jeweiligen Dialog.
