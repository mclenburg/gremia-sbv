# Gremia.SBV 0.4.23 – ModuleFrame compact Build-Fix

## Problem
`App.tsx` nutzt den neuen `compact`-Prop für den kompakten Fallseitenkopf. Der ausgelieferte `ModuleFrameProps`-Typ enthielt diesen Prop aber nicht zuverlässig.

## Änderung
- `ModuleFrameProps.compact?: boolean` ergänzt
- `ModuleFrame` rendert `industrial-hero-compact`
- Fallakten-/Toast-/Workbench-CSS aus 0.4.18–0.4.22 bleibt erhalten
- Regressionstest ergänzt
