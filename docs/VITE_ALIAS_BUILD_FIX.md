# Vite Alias Build Fix

Version: 0.4.3

## Problem

Der TypeScript-Compiler konnte Alias-Imports wie `@services/...` über `tsconfig.json` auflösen. Der Production-Build mit Vite/Rollup kannte diese Alias-Pfade aber nicht und brach deshalb mit folgender Meldung ab:

```text
Rollup failed to resolve import "@services/textCommandPolicy" from "src/app/App.tsx"
```

## Lösung

Die Alias-Konfiguration wurde zusätzlich in `vite.config.ts` hinterlegt:

```ts
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    '@services': fileURLToPath(new URL('./services', import.meta.url)),
    '@database': fileURLToPath(new URL('./database', import.meta.url))
  }
}
```

Damit sind TypeScript- und Vite-Auflösung wieder synchron.

## Test

Nach Anwendung des Patches:

```bash
npm run test
npm run build:linux
```
