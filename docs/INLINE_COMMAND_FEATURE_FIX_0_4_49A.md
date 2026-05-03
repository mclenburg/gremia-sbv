# Gremia.SBV 0.4.49a – Inline-Command-Extraktion stabilisiert

## Problem
0.4.49 schnitt den alten Inline-Overlay-Block in `workflowViews.tsx` zu weit heraus. Dadurch fehlte der schließende Fragment-/Return-Block von `CasesView`; der Parser interpretierte die folgende `DeadlinesView` als JSX.

## Änderung
- Inline-Overlay-Block sauber nur bis vor den schließenden `</>`-Block der `CasesView` ersetzt.
- `CasesView` endet wieder korrekt vor `DeadlinesView`.
- Regressionstest ergänzt.
