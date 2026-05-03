# Gremia.SBV 0.4.27 – Build-Fix für statusgebundene Prozessvorlagen

## Problem
Beim Polishing-Patch 0.4.26 gingen zwei vorherige TypeScript-Fixes verloren:

- `newTemplateProcessStatus` wurde in der Vorlagenmaske verwendet, war aber nicht deklariert.
- Der Cast für `bridge.templates.render` war für TypeScript zu eng.

## Änderung
- State `newTemplateProcessStatus` ergänzt
- Setter `setNewTemplateProcessStatus` ergänzt
- Render-Cast über `unknown` stabilisiert
- Overlay-Polish aus 0.4.26 bleibt erhalten

## Test
`tests/processTemplateBuildRegression.test.ts`
