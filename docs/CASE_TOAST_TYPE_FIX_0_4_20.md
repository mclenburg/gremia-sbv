# Gremia.SBV 0.4.20 – CaseToast Build-Fix

## Problem
Der Patch 0.4.19 nutzte `useState<CaseToast | null>`, ohne den lokalen Typ `CaseToast` zu deklarieren.

## Änderung
- `CaseToast` in `src/app/App.tsx` ergänzt
- Callback-Parameter im Toast-Cleanup explizit typisiert
- Regressionstest ergänzt

## Zweck
Der Build bricht nicht mehr bei der Fallakten-Toast-Logik ab.
