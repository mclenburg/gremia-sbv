# Build von Gremia.SBV

Stand: 0.9.1

## Unterstützte RC-Plattformen

Für den Release Candidate werden Artefakte für drei Plattformen gebaut:

- Linux AppImage
- Windows 10+ als portable Direktstart-EXE
- macOS als unsigniertes, nicht notarisiertes Evaluationsartefakt (macOS-Artefakt)

Linux und Windows sind die primären RC-Plattformen. macOS wird im GitHub-Release-Build mitgebaut, bleibt aber bis zu Signierung und Notarisierung ausdrücklich unsigniert und nicht als produktiv freigegebene macOS-Endanwenderdistribution zu verstehen.

## Native Electron-Abhängigkeiten

Native Abhängigkeiten müssen zur Electron-Version passen. Der verbindliche npm-Vertrag lautet:

```json
"postinstall": "electron-builder install-app-deps"
```

Dieser Eintrag darf nicht entfernt, durch `npx` ersetzt oder indirekt versteckt werden. `npm install` und `npm ci` müssen native Dependencies automatisch passend zur Electron-Version vorbereiten.

`electron-builder` kann beim Packaging trotzdem den generischen Hinweis ausgeben, diesen `postinstall`-Eintrag zu ergänzen. Das ist für Gremia.SBV erst dann ein Fehler, wenn `package.json` den Eintrag nicht enthält oder `@electron/rebuild`/`install-app-deps` nicht ausgeführt wird.

## Lokale Standardmatrix

```bash
npm ci
npm run rc:check
npm run test
npm run test:coverage
npm run build
npm run build:linux
npm run build:win
npm run build:readiness:strict
npm run release:check
```

Optional, wenn eingerichtet:

```bash
npm run test:e2e
npm run build:mac
```

## Release-Check

`npm run release:check` ist der verbindliche lokale RC-Gate-Befehl. Er führt aus:

```bash
npm run rc:check && npm run test:coverage && npm run build
```

Damit sind RC-Readiness, Service-Coverage mit V8-Provider und der normale Build in einem prüfbaren Befehl gebündelt.

## GitHub Release Build

Das Repository enthält den Workflow:

```text
.github/workflows/build-release.yml
```

Ein Tag im Format `v<package.json version>`, für diesen RC also `v0.9.1`, löst einen Draft-Release-Build aus. Der Workflow:

- verwendet `npm ci`,
- vergleicht Tag und `package.json.version`,
- führt `npm run rc:check` und `npm run test:coverage` aus,
- baut Linux, Windows und macOS,
- setzt für den unsignierten macOS-Build `CSC_IDENTITY_AUTO_DISCOVERY=false`,
- lädt ausschließlich die drei Endanwender-Artefakte als Workflow-Artefakte hoch: AppImage, EXE und DMG,
- hängt ausschließlich diese drei Endanwender-Artefakte an ein GitHub Draft Release.

Nicht hochgeladen werden Update-Metadaten (`latest*.yml`), Blockmaps, DEB/TAR.GZ, macOS-ZIP oder zusätzliche portable ZIP-Dateien. Die von GitHub automatisch angezeigten „Source code“-Archive sind keine vom Workflow hochgeladenen Build-Artefakte.

## Windows-Build

Der Windows-RC-Build ist unsigniert und setzt `signAndEditExecutable: false`, damit normale Windows-Entwicklungsumgebungen ohne Symlink-Privilegien nicht an `winCodeSign` scheitern. Der typische Fehler lautet `Cannot create symbolic link`, wenn das Electron-Builder-Hilfspaket `winCodeSign` Symlinks entpacken will. Ein späterer signierter Release benötigt eine dafür vorbereitete Windows-Buildumgebung.

## macOS-Build

Der macOS-RC-Build ist unsigniert und nicht notarisiert. macOS Gatekeeper kann beim ersten Start Warnungen anzeigen oder den Start blockieren. Das Artefakt dient der technischen Evaluation und muss vor produktiver Endanwenderverteilung signiert und notarisiert werden.

## npm-Warnungen

`npm ci` kann transitive Warnungen aus der Electron-/Native-Build-Toolchain ausgeben, etwa zu veralteten Paketen oder Git-Dependencies in Buildwerkzeugen. Für den RC sind blockierend:

- High/Critical-Befunde in Runtime-Dependencies,
- direkte Projektabhängigkeiten auf deprecated Pakete ohne Begründung,
- fehlender `postinstall`-Vertrag,
- Git-Dependencies in direkten Runtime-Dependencies.

Nicht automatisch blockierend sind transitive Buildzeit-Warnungen, wenn sie über `npm audit --omit=dev`, `npm explain` und die Builddokumentation bewertet sind.

## Patch-ZIP-Regeln

- Keine produktiven Datenbanken im Build.
- Keine `node_modules` oder `release`-Artefakte in Patch-ZIPs.
- Tests sind Teil des normalen Build-Laufs.
- `prebuild` bleibt der Build-Readiness-Vertrag: Version generieren, Source-Cleanup, Build-Readiness.


## Node.js- und npm-Version

Für reproduzierbare RC-Builds ist Node.js 20.19.0 oder neuer innerhalb der 20.x-LTS-Linie erforderlich. Einige Build- und Native-Dependencies verlangen Node 20+; Node 18 wird nicht mehr als Build-Umgebung unterstützt.

Empfohlen:

```bash
nvm install 20.19.0
nvm use 20.19.0
npm ci
```

Das Repository enthält `.nvmrc` und `.node-version` mit `20.19.0`. Die Projekt-`.npmrc` erzwingt die öffentliche npm Registry, damit keine lokalen oder internen Registry-URLs aus Entwicklungsumgebungen in den Installationspfad geraten.

## Service-Coverage-Gate im RC

`npm run test:coverage` nutzt Vitest mit `provider: 'v8'` und einem 70-Prozent-Gate für Branches, Functions, Lines und Statements. Das Gate misst ab 0.9.0-rc.1-p bewusst die RC-kritischen Service-Verträge und gut unit-testbaren Policy-Services.

Nicht im Unit-Coverage-Gate gemessen werden breite datenbankgebundene Adapter- und Orchestrierungsservices wie `caseService.ts`, `reportService.ts`, `templateService.ts`, `participationService.ts` oder `workplaceAccommodationService.ts`. Diese Dateien sind für isolierte Unit-Coverage nicht sinnvoll geeignet und werden über Integration-/E2E-/Smoke-Tests sowie über spätere modulare Refactorings abgesichert.

RC-blockierend bleiben echte Datenschutz-, Security-, Backup-, Fristen- und Policy-Fehler. Das Coverage-Gate ist kein Ersatz für fachliche Verhaltensprüfungen; die Tests müssen definierte Eingaben, erwartete Ergebnisse und Negativfälle prüfen.


## Windows-Artefakt

Der Windows-Build erzeugt eine portable Direktstart-EXE. Es wird kein NSIS-Installer als RC-Endanwenderartefakt gebaut. Für GitHub-Releases wird weiterhin nur `release/*.exe` hochgeladen; Blockmaps, `latest*.yml` und zusätzliche Archivformate bleiben ausgeschlossen.
