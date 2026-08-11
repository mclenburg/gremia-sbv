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
npm ci
npm run build:verify
npm run build:compile
npm run build:package:linux
npm run build:package:windows
npm run release:check
npm run build:github
```

Der Build ist in drei eindeutige Phasen getrennt:

1. `build:verify` führt Cleanup, Readiness, Qualitätsgates, Lint und Coverage genau einmal aus.
2. `build:compile` erzeugt Renderer- und Electron-Artefakte und schreibt anschließend ein SHA-256-Manifest unter `maintenance/build-state/compiled-artifacts.json`.
3. `build:package:*` prüft dieses Manifest und verweigert Packaging, wenn Quellen, Buildkonfiguration oder kompilierte Artefakte seit dem Compile verändert wurden.

Die Komfortbefehle `build:linux`, `build:windows` und `build:mac` führen diese drei Phasen vollständig in dieser Reihenfolge aus. CI-Jobs dürfen nach einem bereits erfolgreichen Verify-Schritt direkt `build:compile` und das passende `build:package:*` verwenden.

`npm run build:github` spiegelt auf dem aktuellen Betriebssystem die GitHub-Buildsequenz einschließlich der plattformspezifischen Release-Prüfung. Unter Linux endet die Sequenz mit `release:platform:linux`, unter Windows mit `release:platform:windows`. Dadurch sollen Artefakt-, Startup- und Backup/Restore-Fehler bereits lokal auf derselben Plattform reproduzierbar sein.

Vor Cleanup-Änderungen ist der Plan auszuführen:

```bash
npm run source:cleanup:plan
```

Der Cleanup löscht nur explizit im konsolidierten Manifest aufgeführte Ziele. Er bricht bei falschem Dateityp, Symlinks, optional abweichendem SHA-256 oder noch vorhandenen Referenzen in `package.json`, Skripten, Workflows und Tests ab.

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

## Cross-Platform-Abnahme

Die Workflow-Datei `.github/workflows/cross-platform-release-verification.yml` führt die vollständige
Abnahme nativ auf Ubuntu und Windows aus. Dazu gehören `npm ci`, der native SQLCipher-Diagnoselauf,
TypeScript, Vitest/Coverage, Lint, Qualitätsgates, Compile, Packaging, Artefaktprüfung, Start-Smoke-Test
sowie Backup/Restore mit Leerzeichen-, Umlaut- und Langpfaden.

Nach dem Packaging prüfen `release:artifacts:linux` und `release:artifacts:windows` Dateiname, Version,
Betriebssystem, Architektur, plausible Mindestgröße und Binärsignatur. Das Packaging schreibt nach erfolgreicher
Frischeprüfung einen Buildbeleg in das Releaseverzeichnis. Eine nachgelagerte Plattformprüfung ohne eigenen
`--since`-Zeitstempel akzeptiert ein Artefakt nur, wenn dieser Buildbeleg noch exakt zum unveränderten Artefakt
passt. Testdaten, temporäre Datenbanken, Logs, Source Maps und vergleichbare Debugartefakte im Releaseverzeichnis
führen zum Abbruch.

Der Linux-Desktopname ist ausdrücklich als `Gremia.SBV` konfiguriert; `linux.syncDesktopName` hält den
Namen der Desktopintegration mit dem Produktnamen synchron.

### Windows-Artefakt

Für Windows wird ausschließlich die portable x64-EXE erzeugt. Ein Installer- oder ZIP-Ziel ist nicht Bestandteil des Releasevertrags. Der portable Datenbestand liegt ohne ausdrückliche Überschreibung neben der gestarteten EXE unter `Gremia.SBV-Daten`.
