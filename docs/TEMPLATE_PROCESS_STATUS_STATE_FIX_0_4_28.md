# Gremia.SBV 0.4.28 – Vorlagenstatus-State Build-Fix

## Problem
In `TemplatesView` wurde `newTemplateProcessStatus` verwendet, aber nicht in derselben Komponente deklariert.

## Änderung
- State `newTemplateProcessStatus` direkt in `TemplatesView` ergänzt
- Setter `setNewTemplateProcessStatus` steht dadurch für Speichern und Formularbindung zur Verfügung
- Render-Cast aus 0.4.27 bleibt erhalten

## Patchumfang
Dieses ZIP enthält nur geänderte bzw. ergänzte Dateien, nicht die vollständige App.
