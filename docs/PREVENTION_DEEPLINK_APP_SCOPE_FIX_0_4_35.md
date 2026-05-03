# Gremia.SBV 0.4.35 – App-Scope-Fix für openCaseNode

## Problem
`openCaseNode` wurde innerhalb eines `useEffect` eingefügt. Dadurch war die Funktion für den JSX-Return der App nicht sichtbar.

## Änderung
- falsch platzierte Funktion aus dem `useEffect` entfernt
- `openCaseNode` direkt nach `currentModule` im äußeren App-Scope eingefügt
- Regressionstest prüft die Position vor `useModalKeyboardShortcuts`
