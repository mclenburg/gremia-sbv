# Gremia.SBV 0.5.9a – Auth-Boundary Syntax-Fix

## Problem

Der 0.5.9-Patch beschädigte `workflowViews.tsx` beim Entfernen des Auth-Blocks. Der Anfang von `DashboardOverview` wurde angeschnitten, sodass JSX auf Top-Level landete.

Buildfehler:

```text
TS1003: Identifier expected
TS1002: Unterminated string literal
```

## Änderung

`workflowViews.tsx` wurde aus der letzten intakten 0.5.8a-Basis neu erzeugt:

- `LoginGate`, `RecoveryGate`, `RecoveryKeyPanel`, `SecurityUnavailable` sind sauber nach `features/auth/LoginGate.tsx` ausgelagert.
- `DashboardOverview` bleibt vollständig und syntaktisch intakt.
- `AuthMode` liegt in `core/auth/authTypes.ts`.
- `postinstall` bleibt in `package.json` gesetzt.
