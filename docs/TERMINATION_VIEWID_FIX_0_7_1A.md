# Gremia.SBV 0.7.1a – Kündigungsanhörung ViewId-Fix

## Problem

`App.tsx` rendert die Kündigungsanhörung mit:

```tsx
currentView === 'termination_hearing'
```

`ViewId` enthielt aber noch `termination`. Dadurch meldete TypeScript:

```text
This comparison appears to be unintentional because the types 'ViewId' and '"termination_hearing"' have no overlap.
```

## Änderung

Die Modulnavigation verwendet jetzt konsistent:

```text
termination_hearing
```

Betroffen:

- `ViewId`
- `modules[].id`

`postinstall` bleibt gesetzt:

```json
"postinstall": "electron-builder install-app-deps"
```
