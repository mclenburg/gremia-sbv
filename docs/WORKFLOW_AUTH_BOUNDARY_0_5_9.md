# Gremia.SBV 0.5.9 – Workflow/Auth-Boundary und Native Dependencies

## Native Dependencies

`package.json` enthält wieder:

```json
"postinstall": "electron-builder install-app-deps"
```

Damit werden native Abhängigkeiten nach `npm install` auf die Electron-Version abgestimmt.

## Modulschnitt

`LoginGate` wurde aus `workflowViews.tsx` ausgelagert nach:

```text
src/app/features/auth/LoginGate.tsx
```

Der Typ `AuthMode` liegt jetzt in:

```text
src/app/core/auth/authTypes.ts
```

Damit verliert `workflowViews.tsx` den Sicherheits-/Loginblock einschließlich Recovery-Key-UI und Recovery-Gate. Das ist der nächste kleine, risikoarme Schnitt, bevor später `DeadlinesView`, `SettingsView` und `DashboardOverview` folgen.

## Nächster Schnitt

Empfohlen für 0.5.10:

- `DeadlinesView` und `DeadlineEditor` nach `src/app/features/deadlines`
- danach `SettingsView` nach `src/app/features/settings`
