# Gremia.SBV 0.4.42 – Fachmodule, Hooks und Services

## Ziel
Der nächste Refaktorierungsschnitt löst weitere Fachbereiche aus `workflowViews.tsx` und bereitet die Struktur für BEM- und Kündigungsmodule vor.

## Änderungen
- Kontakte als eigenes Feature-Modul extrahiert.
- Kontaktanzeige und Kontaktsuche in `contactDisplay.ts` gekapselt.
- Berichte als eigenes Feature-Modul extrahiert.
- Berichtslogik in `useReports()` und `reportService.ts` getrennt.
- `App.tsx` importiert Kontakte und Berichte direkt aus den Feature-Modulen.

## Architekturregel
Views rendern. Hooks halten UI-State und Ablaufsteuerung. Services kapseln Bridge-/Datenzugriffe.
