# Patch 0.8.8-h.4 – Windows-robuster Source-Cleanup

## Problem

Unter Windows kann das Entfernen alter Dateien im `prebuild` scheitern, wenn Dateien oder Verzeichnisse kurzfristig durch Editor, Virenscanner, Indexdienst oder npm gesperrt sind. Für obsolete Dateien darf das nicht den gesamten Build verhindern.

## Änderung

`scripts/cleanup-obsolete-files.cjs` unterscheidet jetzt deutlicher zwischen:

- **Sicherheitsfehlern**: unsichere Pfade, absolute Pfade, `..`, geschützte Bereiche. Diese brechen weiterhin hart ab.
- **Löschfehlern**: z. B. `EPERM`, gesperrte Dateien oder nicht löschbare Verzeichnisse. Diese werden als Warnung ausgegeben, der Build läuft weiter.

Optional kann mit `--strict-delete` wieder hartes Verhalten für Löschfehler erzwungen werden.

## Wichtig

Der Cleanup bleibt konservativ:

- kein Löschen außerhalb des Projekt-Roots,
- kein Löschen von `node_modules`, `dist`, `release`, `.git`,
- keine Wildcards,
- nur explizite Manifest-Einträge.

## Nutzen

Der Windows-Build wird robuster, ohne die Sicherheitsgrenzen des Cleanup-Mechanismus aufzuweichen.
