# Gremia.SBV 0.4.51 – CaseNoteModal extrahieren

## Ziel

Das Notiz-/Protokoll-Modal wird aus `workflowViews.tsx` herausgelöst. `CasesView` hält vorerst noch State und Handler, rendert aber nicht mehr das vollständige Formular.

## Neu

```text
src/app/features/cases/CaseNoteModal.tsx
```

## Ausgelagert

- Modal-Rahmen für Notizen und Protokolle
- Formularfelder:
  - Titel
  - Datum
  - Typ
  - Beteiligte
  - Inhalt
  - nächste Schritte
  - Fallbezüge
  - Vertraulichkeit
  - Gesundheits-/Behinderungsbezug
- Fehler- und Erfolgsmeldungen im Formular
- Abbrechen-/Speichern-Leiste

## In CasesView verbleibt bewusst

- Notiz-State
- `saveNote`
- `handleProtocolTextChange`
- Inline-Befehle und deren Handler
- Mehrfach-Fallbezüge als State

## Nächster sinnvoller Schritt

0.4.52 sollte den Notiz-State und die Handler in `useCaseNoteEditor` beziehungsweise `useInlineCommands` weiter konsolidieren.
