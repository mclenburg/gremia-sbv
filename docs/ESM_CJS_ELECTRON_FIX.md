# Electron CommonJS/ESM-Fix

## Problem

Electron lädt Main- und Preload-Skripte in dieser Projektkonfiguration aus `dist-electron` als CommonJS.
Das Paket `electron-is-dev` ist jedoch ESM-only. Ein statischer Import wurde beim TypeScript-Build zu `require("electron-is-dev")` und führte dadurch zu:

```text
Error [ERR_REQUIRE_ESM]: require() of ES Module electron-is-dev/index.js not supported
```

## Lösung

`electron-is-dev` wurde entfernt. Der Entwicklungsmodus wird nun über Electron selbst erkannt:

```ts
if (!app.isPackaged) {
  await win.loadURL('http://127.0.0.1:5173');
} else {
  await win.loadFile(...);
}
```

Damit bleibt der Electron-Build CommonJS-kompatibel und benötigt kein ESM-only-Paket im Main-Prozess.
