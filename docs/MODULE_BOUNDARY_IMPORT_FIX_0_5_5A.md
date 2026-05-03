# Gremia.SBV 0.5.5a – Module-Boundary Import Fix

## Problem

0.5.5 hat `waitForBridge`, `formatDateShort` und `CaseNodeTarget` aus `workflowViews.tsx` ausgelagert. Einige Hooks und Services importierten diese Symbole aber weiterhin aus `workflowViews.tsx`.

Betroffen waren:

- `useInlineCommands.ts`
- `useCaseNoteEditor.ts`
- `useCaseWorkbenchData.ts`
- `useCaseWorkbenchSearch.ts`
- `reportService.ts`

## Änderung

Die betroffenen Dateien importieren jetzt direkt aus:

- `src/app/core/bridge/waitForBridge.ts`
- `src/app/core/navigation/caseNodeTarget.ts`

Der Boundary-Test scannt nun alle Dateien unter `src/app/features`, damit solche Restimporte künftig auffallen.
