# Gremia.SBV 0.4.39 – Provider-Wrapping Build-Fix

## Problem
Beim Patch 0.4.38 wurde der schließende Provider-Block an einer falschen früheren Return-Stelle eingefügt. Dadurch entstanden JSX-Fehler.

## Änderung
- Falsch platzierte Provider-Schließung vor `App` entfernt.
- `LiveRegionProvider` und `ConfirmDialogProvider` umschließen nur den entsperrten App-Shell-Return.
- Regressionstest ergänzt.
