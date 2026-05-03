# Gremia.SBV 0.4.41 – Build-Fix Präventionsfeature

## Problem
Nach dem Herauslösen der Präventionsansicht wurde `HelpCircle` in `PreventionView.tsx` verwendet, aber nicht aus `lucide-react` importiert.

## Änderung
- Import `HelpCircle` in `src/app/features/prevention/PreventionView.tsx` ergänzt.
- Regressionstest ergänzt.
