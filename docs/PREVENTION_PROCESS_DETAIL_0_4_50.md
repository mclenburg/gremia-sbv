# Gremia.SBV 0.4.50 – PreventionProcessDetail extrahieren

## Ziel

Das Präventionsdetailformular wird aus `workflowViews.tsx` herausgelöst. Die Fallakte soll nur noch auswählen und orchestrieren; die fachliche Detailbearbeitung liegt im Präventionsmodul.

## Neu

```text
src/app/features/prevention/PreventionProcessDetail.tsx
```

## Ausgelagert

- Status-Badges der Maßnahme
- Dokumentenlink für statusgebundene Vorlagen
- Abschnitt 1: Prüfung und Ausgangslage
- Abschnitt 2: Anforderung an den Arbeitgeber
- Abschnitt 3: Reaktion des Arbeitgebers
- Abschnitt 4: Maßnahmenklärung und Umsetzung
- Abschnitt 5: Ergebnis / Abschluss
- Statuslogik zur Sichtbarkeit der Abschnitte
- Auswahlwerte für Schwierigkeit und Risiko

## In der Fallakte verbleibt

- Auswahl des passenden Prozesses aus der Fallakte
- `updateCasePreventionProcess`
- `openProcessTemplateModal`
- allgemeines Routing im Fallbaum

## Nächster Schritt

Als nächstes sollte `CaseNoteModal` beziehungsweise `NoteEditorForm` aus der Fallakte herausgelöst werden.
