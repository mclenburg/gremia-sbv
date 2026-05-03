# Gremia.SBV 0.4.46 – Fallakten-Schnitt stabilisieren und Helfer auslagern

## Build-Fixes

0.4.45 hatte zwei TypeScript-Fehler:

- `CaseTreePanel` bekam `document.sizeBytes`, das optional sein kann.
- `CaseDetailPanel` erwartete ein zu allgemeines Formular-Event für `onSearchSubmit`.

Beides ist korrigiert.

## Refaktorierungsschnitt

Erste Fallakten-Helfer wurden aus `workflowViews.tsx` herausgezogen:

- `toDateTimeLocalValue`
- `fromDateTimeLocalValue`
- `formatCaseLabel`
- `defaultDeadlineTitleForCase`
- `formatNoteDate`
- `formatBytes`
- `processTypeLabel`
- `formatProcessNodeSubtitle`

Neuer Ort:

```text
src/app/features/cases/caseWorkbenchFormat.ts
```

## Warum dieser kleine Schnitt?

Die Fallakte hängt noch stark an lokalem UI-State. Deshalb wird sie nicht in einem großen riskanten Schritt zerlegt, sondern zuerst entlang stabiler, zustandsfreier Helfer geschnitten.

## Nächster sinnvoller Schritt

0.4.47 sollte `useCaseWorkbenchData` vorbereiten:

- ausgewählten Fall laden
- Notizen/Dokumente/Rechtsbezüge/Maßnahmen laden
- Deep-Link-Ziel verarbeiten
- Reload-Funktion bereitstellen
