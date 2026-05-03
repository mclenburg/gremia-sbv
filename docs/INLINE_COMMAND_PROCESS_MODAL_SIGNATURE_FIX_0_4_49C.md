# Gremia.SBV 0.4.49c – Signatur-Fix für CaseProcessDraftModal

## Problem
0.4.49b setzte `CaseProcessDraftModal` wieder in `workflowViews.tsx` ein, nutzte dabei aber eine neuere/abweichende Prop-Signatur:

- `selectedCase`
- `onSubmit`

Die vorhandene Komponente erwartet jedoch:

- `draft`
- `onChange`
- `onCancel`
- `onCreate`

## Änderung
- `selectedCase` aus dem Aufruf entfernt.
- `onSubmit` durch `onCreate` ersetzt.
- `onChange` als explizite Adapterfunktion gesetzt.
- Regressionstest ergänzt.
