# Report PDF Print Options Fix

Version: 0.3.35

## Problem

Der Linux-/Windows-Build brach bei `electron/ipc/reportIpc.ts` ab, weil die lokal installierte Electron-Typdefinition für `webContents.printToPDF()` weder `marginsType` noch `margin` akzeptiert.

## Änderung

Die PDF-Erzeugung nutzt jetzt die von der installierten Electron-Version erwartete Option:

```ts
margins: { marginType: 'none' }
```

Damit bleiben die Industrial-PDFs randlos gesteuert über CSS/HTML und der TypeScript-Build läuft mit den vorhandenen Electron-Typen durch.
