# Gremia.SBV 0.4.52 – CaseOverviewDetail extrahieren

## Ziel

Die Fallaktenübersicht wird aus `workflowViews.tsx` herausgezogen. `CasesView` soll weiter zur Orchestrierung werden: Auswahl treffen, Daten übergeben, Detailkomponenten rendern.

## Neu

```text
src/app/features/cases/CaseOverviewDetail.tsx
```

## Ausgelagert

- Fallüberschrift
- Kurzbeschreibung
- Kennzahlen:
  - Notizen
  - Dokumente
  - Rechtsbezüge
  - Maßnahmen
  - Kategorie
- lokale Übersicht-Metrik-Komponente

## In CasesView verbleibt

Die kontextuelle Vorlagenlogik bleibt vorerst in `CasesView`, weil `ContextualTemplateButton` und die Vorlagenwerte noch an die bestehende Vorlageninfrastruktur gekoppelt sind. Sie wird als `contextualTemplateActions` an die Übersicht übergeben.

## Nächster Schritt

Als nächstes sollte entweder `CaseNoteDetail` extrahiert oder die Inline-Command-Handler in `useInlineCommands` konsolidiert werden.
