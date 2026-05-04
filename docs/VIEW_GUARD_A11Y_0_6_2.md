# Gremia.SBV 0.6.2 – View-Guard und A11y-Fix

## PlaceholderView-Guard

Die bisherige Bedingung für `PlaceholderView` war eine lange Negationskette:

```text
currentView !== 'dashboard' && currentView !== 'cases' && ...
```

Das war fragil. Beim neuen Gleichstellung-/GdB-Modul wurde `equalization` nicht ausgeschlossen. Dadurch wurden echte View und Placeholder gleichzeitig gerendert.

## Änderung

`App.tsx` nutzt jetzt:

```ts
const IMPLEMENTED_VIEW_IDS = new Set<ViewId>([...]);
function isImplementedView(viewId: ViewId): boolean
```

`PlaceholderView` wird nur noch gerendert, wenn die View nicht implementiert ist.

## PreventionView

`PreventionView` nutzt jetzt wie BEM und Gleichstellung `useAnnouncer`:

- Fehler werden `assertive` angekündigt.
- erfolgreiche Ladevorgänge werden `polite` angekündigt.
- Ladezustand ist sichtbar und screenreaderfähig.

## Datenschutz-Schuldposten

Für `equalization_processes.notes` wurde ein 1.0-Schuldposten dokumentiert. Das Feld kann Gesundheitsdaten enthalten und sollte vor 1.0 denselben Schutzstandard wie Fallnotizen erhalten.
