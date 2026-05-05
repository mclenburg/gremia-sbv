# Patch 0.8.7-b – Build-Cleanup für obsolete Source-Dateien

## Ziel

Dieser Patch ergänzt einen sicheren, wiederverwendbaren Mechanismus, mit dem alte und nicht mehr benötigte Source-Dateien vor einem Build entfernt werden können. Die Entfernung erfolgt nicht über freie Globs, sondern ausschließlich über explizite patchbezogene Dateilisten.

## Neue Dateien

- `scripts/cleanup-obsolete-files.cjs`
- `maintenance/source-cleanup/obsolete-files-0.8.7-b.json`
- `tests/sourceCleanup087b.test.ts`

## Build-Integration

`package.json` enthält jetzt:

```json
"source:cleanup": "node scripts/cleanup-obsolete-files.cjs",
"source:cleanup:dry-run": "node scripts/cleanup-obsolete-files.cjs --dry-run",
"prebuild": "npm run version:generate && npm run source:cleanup"
```

Damit läuft der Cleanup automatisch vor `npm run build` und damit auch vor `npm run build:linux`.

## Manifest-Format

Patchbezogene Cleanup-Listen liegen unter:

```text
maintenance/source-cleanup/*.json
```

Beispiel:

```json
{
  "version": "0.8.7-b",
  "description": "Obsolete Dateien dieses Patches.",
  "files": [
    "src/app/alteDatei.tsx"
  ],
  "directories": [
    "src/app/alterOrdner"
  ]
}
```

## Sicherheitsregeln

Der Cleanup ist bewusst konservativ:

- keine absoluten Pfade,
- kein `..` außerhalb des Projekt-Roots,
- keine Wildcards,
- keine Löschung geschützter Bereiche wie `node_modules`, `dist`, `release`, `.git`,
- nur bekannte Source-/Projektbereiche sind zulässig.

## Trockenlauf

Vor einem echten Cleanup kann geprüft werden:

```bash
npm run source:cleanup:dry-run
```

## Aktueller Patch

Dieser Patch führt den Mechanismus ein. Die Manifest-Datei `obsolete-files-0.8.7-b.json` enthält bewusst noch keine konkreten Löschkandidaten, damit keine fachlich relevanten Dateien ohne gesonderte Prüfung entfernt werden.
