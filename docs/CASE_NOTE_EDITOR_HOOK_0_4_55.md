# Gremia.SBV 0.4.55 – useCaseNoteEditor

## Ziel

Die Notiz-/Protokoll-Editorlogik wird aus `workflowViews.tsx` herausgezogen. `CasesView` hält nicht mehr selbst den Notizformular-State und den Speichervorgang.

## Neu

```text
src/app/features/cases/useCaseNoteEditor.ts
```

## Ausgelagert

- Öffnen und Schließen des Notizmodals
- aktueller Bearbeitungsdatensatz
- Titel, Datum, Typ, Beteiligte
- Inhalt und nächste Schritte
- Vertraulichkeit und Gesundheitsdatenkennzeichen
- Mehrfach-Fallbezüge
- Reset des Formulars
- Laden einer bestehenden Notiz
- Speichern einer neuen oder bestehenden Notiz
- Wiederladen der Fallakten-Kinddaten nach dem Speichern

## Zusammenspiel mit Inline-Befehlen

`useCaseNoteEditor` kann über `bindClearInlineDrafts` an `useInlineCommands` gekoppelt werden. Damit bleiben Notiz-Reset und Inline-Overlay-Reset verbunden, ohne dass beide Hooks direkt voneinander importieren müssen.

## Nächster Schritt

Nach diesem Schnitt sollte die Testseite folgen:

- Verhaltenstests für `//`, `@@`, `##`, `§§`, `!!`, `>>`, `^^`, `~~`
- oder Start der BEM-Grundstruktur.
