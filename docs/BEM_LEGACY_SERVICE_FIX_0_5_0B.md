# Gremia.SBV 0.5.0b – BEM Legacy-Service-Fix

## Problem

`tests/processServices.test.ts` erwartet weiterhin:

```ts
process.currentPhase === 'pruefung'
```

Das neue BEM-Modul nutzt fachlich das neue Feld `status`, nicht mehr `currentPhase`.

## Änderung

- `BemLegacyPhase` ergänzt.
- `BemProcessRecord.currentPhase?: BemLegacyPhase` als deprecated Kompatibilitätsfeld ergänzt.
- `BemService` mapped neue BEM-Statuswerte auf alte Phasen:
  - `zu_pruefen` → `pruefung`
  - `angebot_*` → `angebot`
  - `reaktion_abwarten`, `angenommen`, `abgelehnt` → `reaktion`
  - `gespraech_geplant` → `gespraech`
  - `massnahmen_*`, `wirksamkeit_pruefen` → `massnahmen`
  - Abschlussstatus → `abschluss`

Fachlich bleibt `status` das maßgebliche Feld.
