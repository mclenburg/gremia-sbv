# First Start / Electron Main Path Fix

Dieses Patch-Paket korrigiert den Electron-Einstiegspunkt.

Da `tsconfig.electron.json` mit `rootDir: "."` kompiliert, landet `electron/main.ts` nach dem Build unter:

```text
dist-electron/electron/main.js
```

Die `package.json` muss daher genau diesen Pfad als `main` verwenden.

## Start

```bash
rm -rf dist dist-electron
npm run dev
```

## Prüfen

```bash
npm run dev:electron:build
ls -l dist-electron/electron/main.js
```
