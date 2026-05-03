# Gremia.SBV 0.4.34 – Scope-Fix für openCaseNode

## Problem
Der vorherige Patch prüfte nur, ob `openCaseNode` irgendwo in `App.tsx` vorkommt. Entscheidend ist aber, dass die Funktion im Scope der `App`-Komponente vor dem JSX-Return deklariert ist.

## Änderung
- `caseNodeTarget`-State im `App`-Scope abgesichert
- `openCaseNode(target)` garantiert vor dem `return` der `App`-Komponente eingefügt
- Regressionstest prüft den tatsächlichen Scope
