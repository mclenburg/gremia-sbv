# Entwicklung

## Installation

```bash
npm install
```

Der `postinstall`-Hook führt `electron-builder install-app-deps` aus, damit native Abhängigkeiten zur Electron-Version passen.

## Start

```bash
npm run dev
```

## Tests

```bash
npm run test
```

Vor Tests laufen Versionsgenerierung und Source-Cleanup.

Gezielte Prüfungen:

```bash
npm run test:privacy
npm run test:migrations
npm run test:backup
npm run test:documentation-088d
```

## Build

```bash
npm run build
npm run build:linux
```

Vor dem Build laufen:

1. `npm run version:generate`
2. `npm run source:cleanup`
3. `npm run build:readiness`

## Source-Cleanup

Obsolete Dateien stehen explizit in `maintenance/source-cleanup/*.json`.

```bash
npm run source:cleanup:dry-run
npm run source:cleanup
```

Die Manifeste dürfen nur konkrete relative Pfade enthalten. Wildcards, absolute Pfade und Parent-Traversal sind verboten.

## Dokumentationsregel

Dauerhafte Dokumentation gehört in `docs/`. Historische Patchnotizen werden nicht mehr einzeln gepflegt, sondern im `CHANGELOG.md` zusammengefasst.
