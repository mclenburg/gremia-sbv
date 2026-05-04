# Gremia.SBV 0.6.1c – Gleichstellung-Vorlagenstatus Fix

## Problem

Das Prozessvorlagenmodal ging noch davon aus, dass jeder Prozess ein Feld `status` besitzt. Gleichstellungsprozesse verwenden aber `applicationStatus`.

Zusätzlich akzeptierte die bisherige Überschriftenlogik nur `prevention | bem`.

## Änderung

- `ProcessTemplateDocumentsModal` verwendet helper:
  - `processTemplateProcessLabel`
  - `processTemplateStatusLabel`
  - `processTemplateStatusTag`
- Für Gleichstellung wird `applicationStatus` verwendet.
- `workflowViews.tsx` filtert Vorlagen mit einem abgeleiteten Status.
- ExportGuard nutzt ebenfalls den abgeleiteten Status.
