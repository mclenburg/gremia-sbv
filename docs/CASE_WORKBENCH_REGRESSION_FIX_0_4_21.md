# Gremia.SBV 0.4.21 – Regression-Fix Fallakte / SQLCipher-Native-Deps

## Problem
Der Patch 0.4.20 behob den Toast-Typ, enthielt aber nicht vollständig die CSS-Anpassungen aus 0.4.18. Dadurch wirkte insbesondere die Maske für das Präventionsverfahren wieder zu gedrängt.

Zusätzlich fehlte der übliche Electron-Hook, der native Dependencies an die verwendete Electron-Version anpasst.

## Änderungen
- CSS-Layout aus 0.4.18 wiederhergestellt
- kompakte Fallliste und Toast-Overlay aus 0.4.19 erhalten
- `CaseToast`-Build-Fix aus 0.4.20 erhalten
- `postinstall`: `electron-builder install-app-deps`
- Regressionstests ergänzt

## Wartbarkeitsregel
Dieser Patch ändert keine neue Fachlogik. Er stabilisiert das bestehende Workbench-Layout und den Build-Prozess.
