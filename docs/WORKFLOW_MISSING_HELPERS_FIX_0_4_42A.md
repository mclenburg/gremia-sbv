# Gremia.SBV 0.4.42a – Fix fehlender Workflow-Helfer

## Problem
Nach der Extraktion in 0.4.42 fehlten in `workflowViews.tsx` zwei lokale Helfer:

- `getBridge()`
- `replaceRange(...)`

Dadurch schlug der TypeScript-Build fehl.

## Änderung
- `getBridge()` wieder lokal vor `waitForBridge()` ergänzt.
- `replaceRange(...)` wieder lokal ergänzt.
- Regressionstest `workflowMissingHelpers0442a.test.ts` ergänzt.
