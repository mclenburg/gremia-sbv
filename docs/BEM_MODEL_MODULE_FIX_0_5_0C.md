# Gremia.SBV 0.5.0c – BEM Model Module Fix

## Problem

`src/app/core/models/bem.model.ts` wurde in der Patch-Kette als leere oder unvollständige Datei angewendet. TypeScript meldete deshalb:

```text
File 'src/app/core/models/bem.model.ts' is not a module.
```

## Änderung

Die vollständige BEM-Modell-Datei wird als Overlay erneut ausgeliefert:

- `BemStatus`
- `BemResponse`
- `BemLegacyPhase`
- `BemTriggerType`
- `BemStepDefinition`
- `BemProcessRecord`
- `CreateBemProcessInput`
- `UpdateBemProcessInput`
- `BemDashboardSummary`
- `BemWarning`

`currentPhase` bleibt als deprecated Legacy-Alias enthalten.
