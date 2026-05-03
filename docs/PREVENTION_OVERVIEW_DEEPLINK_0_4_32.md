# Gremia.SBV 0.4.32 – Präventionsübersicht mit Deep-Link

## Ziel
Die Seite „Prävention“ ist nur noch eine Übersicht. Die Bearbeitung erfolgt in der Fallakte.

## Änderungen
- Präventionsverfahren werden nach Status gruppiert.
- Erledigte Verfahren (`abgeschlossen`) stehen am Ende und sind standardmäßig zugeklappt.
- Kleine Kennzahlen zeigen offene, überfällige, hohe Risiken und erledigte Verfahren.
- Klick auf ein Verfahren öffnet die Fallakte und markiert die konkrete Präventionsmaßnahme.
- Wiederverwendbare Komponenten für spätere Maßnahmenseiten:
  - `ProcessOverviewPage`
  - `ProcessOverviewGroup`
  - `ProcessOverviewCard`
  - `groupProcessOverviewRecords`

## Architekturregel
Maßnahmen-Seiten sind Übersichten. Fallakte bleibt Arbeitsoberfläche.
