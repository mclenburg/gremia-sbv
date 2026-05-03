# Gremia.SBV 0.4.57b – Testregressionen nach Refaktorierung bereinigt

## Ziel

Dieser Patch ändert keine Fachlogik. Er richtet veraltete Strukturtests auf die aktuelle Modulstruktur aus.

## Schwerpunkte

- Tests lesen ausgelagerte Feature-Dateien statt weiterhin `App.tsx` oder `workflowViews.tsx`, wenn die Verantwortung dorthin verschoben wurde.
- Datenbanktests verwenden den tatsächlichen Pfad `database/migrations`.
- Versions-Test akzeptiert die aktuell verwendeten Hotfix-Suffixe wie `0.4.57b`.
- Der Knowledge-Test trimmt die normalisierte Paragraphensuche.

## Hintergrund

Das Testprotokoll zeigte 30 fehlgeschlagene Testdateien und 45 fehlgeschlagene Einzeltests. Viele Fehler waren stale source-contract assertions nach der Clean-Code-Extraktion.
