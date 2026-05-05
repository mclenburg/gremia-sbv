# Patch 0.8.8 – Build-Readiness und native Electron-Abhängigkeiten

## Ziel

Dieser Patch stabilisiert den Weg zum ersten Release Candidate, indem der Build-Prozess vor dem eigentlichen TypeScript-/Vite-/Electron-Build zusätzliche, dependency-freie Plausibilitätsprüfungen ausführt.

## Native Abhängigkeiten

`package.json` enthält jetzt ausdrücklich und dauerhaft:

```json
"postinstall": "electron-builder install-app-deps"
```

Zusätzlich gibt es einen wiederverwendbaren Alias:

```json
"native:install-app-deps": "electron-builder install-app-deps"
```

Damit werden native Abhängigkeiten nach der Installation passend zur verwendeten Electron-Version neu eingerichtet. Das ist insbesondere für `better-sqlite3-multiple-ciphers` wichtig.

## Build-Readiness-Guard

Neu:

```text
scripts/check-build-readiness.cjs
```

Der Guard läuft ohne zusätzliche npm-Abhängigkeiten und prüft vor dem Build:

- `postinstall` enthält `electron-builder install-app-deps`,
- der Alias `native:install-app-deps` ist vorhanden,
- generated App-Versionen passen zu `package.json`,
- `APP_SCHEMA_VERSION` passt zur höchsten Migration,
- Source-Cleanup-Skripte und Cleanup-Manifeste sind plausibel,
- optional mit `--strict`: zentrale Build-Dateien sind vorhanden.

## Build-Integration

`prebuild` läuft jetzt in dieser Reihenfolge:

```bash
npm run version:generate && npm run source:cleanup && npm run build:readiness
```

Damit gilt der Guard automatisch auch für:

```bash
npm run build:linux
```

weil der Linux-AppImage-Build intern `npm run build` aufruft.

## Source-Cleanup

Neu:

```text
maintenance/source-cleanup/obsolete-files-0.8.8.json
```

Dieses Manifest enthält bewusst keine Löschkandidaten. Es dokumentiert nur den Patchstand und hält die Cleanup-Struktur konsistent.

## Tests

Neu:

```bash
npm run test:build-readiness-088
```

## Version

Die App-Version wurde auf `0.8.8` angehoben. Die Schema-Version bleibt `0023`.
