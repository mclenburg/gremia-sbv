# Gremia.SBV 0.4.33 – Build-Fix Präventions-Deep-Link

## Problem
`PreventionView` erhielt `onOpenCaseNode={openCaseNode}`, aber `openCaseNode` war nicht im Scope der `App`-Komponente deklariert.

## Änderung
- `caseNodeTarget`-State in `App` abgesichert
- `openCaseNode(target)` im `App`-Scope ergänzt
- Regressionstest ergänzt

## Nicht geändert
Die Präventionsübersicht und die Fallakten-Workbench bleiben unverändert.
