# Electron CommonJS Dependencies

Der Electron-Main-Prozess wird aktuell als CommonJS gebaut, damit Preload und native Node-/SQLite-Abhängigkeiten stabil geladen werden.

Daraus folgt: Services, die im Electron-Main-Prozess laufen, dürfen keine ESM-only-Pakete per statischem Import verwenden, weil TypeScript diese Imports im CommonJS-Build in `require(...)` umwandelt.

## Aktuelle Korrektur

`nanoid` wurde aus `services/caseService.ts` entfernt und durch `node:crypto.randomUUID()` ersetzt. Damit entsteht keine ESM-only-Abhängigkeit mehr im Main-Prozess.

## Regel

Für Main-/Service-Code bevorzugen:

- `node:crypto.randomUUID()` statt `nanoid`
- Node-Builtins statt kleiner ESM-only-Hilfspakete
- dynamische Imports nur dort, wo das Zielmodul bewusst so geladen werden muss

Renderer-Code darf weiterhin normale moderne ESM-Imports nutzen, weil Vite diesen Bereich bündelt.
