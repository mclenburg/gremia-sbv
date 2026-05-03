# Gremia.SBV 0.4.49b – CaseProcessDraftModal aus Inline-Overlays entfernt

## Problem
Beim Herauslösen der Inline-Overlays war versehentlich auch `CaseProcessDraftModal` in `InlineCommandOverlays.tsx` gelandet. Das Modal gehört nicht zu den Inline-Befehlen und nutzt State, der weiterhin in `CasesView` liegt.

## Änderung
- `CaseProcessDraftModal` aus `src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx` entfernt.
- `CaseProcessDraftModal` wieder in `workflowViews.tsx` vor `<InlineCommandOverlays />` gerendert.
- Regressionstest ergänzt.
