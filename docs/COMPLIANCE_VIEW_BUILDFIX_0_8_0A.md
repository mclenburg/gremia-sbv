# Gremia.SBV 0.8.0a – ComplianceView Build-Fix

## Problem

`ComplianceView` übergab `icon={ShieldCheck}` an `ModuleFrame`. In der aktuellen Projektstruktur akzeptiert `ModuleFrameProps` aber keine `icon`-Property.

## Änderung

- `icon={ShieldCheck}` entfernt.
- ungenutzten `ShieldCheck`-Import entfernt.
- Regressionstest ergänzt.
- `postinstall` bleibt gesetzt.
