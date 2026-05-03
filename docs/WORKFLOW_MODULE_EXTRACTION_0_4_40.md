# Gremia.SBV 0.4.40 – Workflow-Module extrahiert

## Ziel
Die 0.4.39-Refaktorierung hatte `App.tsx` entlastet, aber die Komplexität weitgehend in `workflowViews.tsx` verschoben. 0.4.40 beginnt den tatsächlichen Modulschnitt.

## Änderungen
- `KnowledgeView` nach `src/app/features/knowledge/KnowledgeView.tsx` verschoben.
- Ratgeberdaten und Volltextsuche der Wissen-Seite liegen im Knowledge-Feature.
- `PreventionView` nach `src/app/features/prevention/PreventionView.tsx` verschoben.
- Wiederverwendbare Präventionsstatus-Labels und Reihenfolgen liegen in `preventionShared.ts`.
- `App.tsx` importiert die extrahierten Features direkt.
- `workflowViews.tsx` ist kleiner und bleibt vorerst Übergangsmodul für die noch nicht extrahierten Views.

## Nächste Schritte
- `TemplatesView` extrahieren.
- `CasesView` in Workbench, Baum, Detailbereich, Modals und Inline-Commands zerlegen.
- Alt-Dokumentation nach 1.0 bereinigen.
