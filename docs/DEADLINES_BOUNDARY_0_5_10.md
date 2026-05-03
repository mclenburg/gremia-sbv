# Gremia.SBV 0.5.10 – Deadlines Boundary

## Ziel

Der nächste risikoarme Schnitt aus `workflowViews.tsx`.

## Änderung

Ausgelagert nach:

```text
src/app/features/deadlines/DeadlinesView.tsx
```

Enthalten:

- `DeadlinesView`
- `DeadlineEditor`

`workflowViews.tsx` enthält diese beiden Exporte nicht mehr. `App.tsx` importiert sie direkt aus dem Deadlines-Feature.

## Build-Hygiene

`postinstall` bleibt gesetzt:

```json
"postinstall": "electron-builder install-app-deps"
```

## Nächster sinnvoller Schnitt

Danach bietet sich `SettingsView` an, weil dort bereits klar abgrenzbare Unterpanels liegen: Theme, Template-Defaults, Passwort, Backup/Restore und Retention.
